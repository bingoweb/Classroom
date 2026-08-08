const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slide-settings-atomic-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger } = require('../backend/logger.js');

const GENERIC_ERROR = 'Slayt ayarları güncellenirken hata oluştu';
const UPSERT_SQL = 'INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)';

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => err ? reject(err) : resolve());
    });
}

function removeFileIfPresent(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function runDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function allDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function invokeHandler(handler, req, timeoutMs = 900) {
    return new Promise((resolve, reject) => {
        let responseCount = 0;
        let snapshot = null;
        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`Expected exactly one response, received ${responseCount}`));
            }
        }, timeoutMs);

        const finish = () => {
            setImmediate(() => {
                if (settled) return;
                if (responseCount !== 1 || !snapshot) {
                    settled = true;
                    clearTimeout(timer);
                    reject(new Error(`Expected exactly one response, received ${responseCount}`));
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve({ ...snapshot, responseCount });
            });
        };

        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                responseCount += 1;
                if (responseCount > 1) {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        reject(new Error('Multiple responses sent'));
                    }
                    return this;
                }
                snapshot = { statusCode: this.statusCode, body };
                finish();
                return this;
            }
        };

        try {
            handler(req, res, (err) => reject(err || new Error('Unexpected next()')));
        } catch (err) {
            reject(err);
        }
    });
}

function validBody(overrides = {}) {
    return {
        default_duration: 10000,
        default_transition_mode: 'auto',
        default_transition_duration: 1200,
        ...overrides
    };
}

function makeFakeDb({ failStage = null, failUpdateIndex = null, rollbackError = null } = {}) {
    const state = {
        sql: [],
        params: [],
        updateCount: 0,
        rollbackCount: 0,
        closeCount: 0
    };

    const stageError = failStage ? new Error(`SENSITIVE_${String(failStage).toUpperCase()}_P2_ATOMIC`) : null;

    const fakeDb = {
        run(sql, params, cb) {
            const actualParams = typeof params === 'function' ? [] : params;
            const actualCb = typeof params === 'function' ? params : cb;
            state.sql.push(sql);
            state.params.push(actualParams);

            if (sql === 'BEGIN IMMEDIATE' && failStage === 'begin') {
                return actualCb.call(this, stageError);
            }

            if (sql === UPSERT_SQL) {
                state.updateCount += 1;
                if (failStage === 'update' && state.updateCount === failUpdateIndex) {
                    return actualCb.call(this, stageError);
                }
                return actualCb.call({ changes: 1 }, null);
            }

            if (sql === 'COMMIT' && failStage === 'commit') {
                return actualCb.call(this, stageError);
            }

            if (sql === 'ROLLBACK') {
                state.rollbackCount += 1;
                return actualCb.call(this, rollbackError);
            }

            actualCb.call(this, null);
        },
        close(cb) {
            state.closeCount += 1;
            if (cb) cb();
        }
    };

    return { fakeDb, state, stageError };
}

test('Atomic slide settings update route', async (t) => {
    let putHandler;
    let originalCreateIsolatedConnection;
    let originalLoggerError;

    t.before(async () => {
        await db.scheduleMigrationPromise;
        const putRoutes = app._router.stack.filter(
            layer => layer.route && layer.route.path === '/api/slide-settings' && layer.route.methods.put
        );
        assert.equal(putRoutes.length, 1, 'Exactly one PUT /api/slide-settings route must exist');
        putHandler = putRoutes[0].route.stack[putRoutes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalCreateIsolatedConnection = db.createIsolatedConnection;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        db.createIsolatedConnection = originalCreateIsolatedConnection;
        Logger.prototype.error = originalLoggerError;
    });

    t.after(async () => {
        await closeDatabase(db);
        removeFileIfPresent(testDbPath);
        removeFileIfPresent(`${testDbPath}-journal`);
        removeFileIfPresent(`${testDbPath}-wal`);
        removeFileIfPresent(`${testDbPath}-shm`);
        try {
            fs.rmdirSync(tempDir);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
        else process.env.CLASSROOM_DB_PATH = originalDbPath;
    });

    await t.test('structural and field validation rejects invalid bodies before opening a transaction', async () => {
        const invalidCases = [
            { body: undefined, error: 'Geçersiz slayt ayarları' },
            { body: null, error: 'Geçersiz slayt ayarları' },
            { body: [], error: 'Geçersiz slayt ayarları' },
            { body: 'settings', error: 'Geçersiz slayt ayarları' },
            { body: {}, error: 'Tüm slayt ayarları gereklidir' },
            { body: { default_duration: 10000, default_transition_mode: 'auto' }, error: 'Tüm slayt ayarları gereklidir' },
            { body: { ...validBody(), extra: true }, error: 'Bilinmeyen slayt ayarı' },
            { body: validBody({ default_duration: 999 }), error: 'Varsayılan gösterim süresi geçersiz' },
            { body: validBody({ default_duration: 60001 }), error: 'Varsayılan gösterim süresi geçersiz' },
            { body: validBody({ default_duration: 1000.5 }), error: 'Varsayılan gösterim süresi geçersiz' },
            { body: validBody({ default_duration: '10000' }), error: 'Varsayılan gösterim süresi geçersiz' },
            { body: validBody({ default_transition_mode: 'smart' }), error: 'Geçiş modu geçersiz' },
            { body: validBody({ default_transition_mode: '' }), error: 'Geçiş modu geçersiz' },
            { body: validBody({ default_transition_duration: 499 }), error: 'Varsayılan geçiş süresi geçersiz' },
            { body: validBody({ default_transition_duration: 3001 }), error: 'Varsayılan geçiş süresi geçersiz' },
            { body: validBody({ default_transition_duration: 1250 }), error: 'Varsayılan geçiş süresi geçersiz' },
            { body: validBody({ default_transition_duration: '1200' }), error: 'Varsayılan geçiş süresi geçersiz' }
        ];

        let connectionCalls = 0;
        db.createIsolatedConnection = () => { connectionCalls += 1; };

        for (const tc of invalidCases) {
            const result = await invokeHandler(putHandler, { body: tc.body, requestId: 'validation-test' });
            assert.equal(result.statusCode, 400, JSON.stringify(tc.body));
            assert.deepEqual(result.body, { error: tc.error }, JSON.stringify(tc.body));
            assert.equal(result.responseCount, 1);
        }

        assert.equal(connectionCalls, 0, 'invalid payloads must not open a DB transaction');
    });

    await t.test('successful request performs BEGIN, exactly three ordered upserts, COMMIT, then closes once', async () => {
        const { fakeDb, state } = makeFakeDb();
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(putHandler, {
            body: validBody(),
            requestId: 'atomic-success'
        });

        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, { message: 'Slayt ayarları başarıyla güncellendi' });
        assert.equal(result.responseCount, 1);
        assert.deepEqual(state.sql, [
            'BEGIN IMMEDIATE',
            UPSERT_SQL,
            UPSERT_SQL,
            UPSERT_SQL,
            'COMMIT'
        ]);
        assert.deepEqual(state.params.slice(1, 4), [
            ['default_duration', '10000'],
            ['default_transition_mode', 'auto'],
            ['default_transition_duration', '1200']
        ]);
        assert.equal(state.rollbackCount, 0);
        assert.equal(state.closeCount, 1);
    });

    await t.test('request without requestId gets a UUID correlation id on connection failure', async () => {
        const injectedError = new Error('SENSITIVE_CONNECTION_P2_ATOMIC');
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(injectedError);

        const result = await invokeHandler(putHandler, { body: validBody() });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        const log = logs.find(args => args[2] === injectedError);
        assert.ok(log);
        assert.equal(log[3].stage, 'connection');
        assert.match(log[3].requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    await t.test('BEGIN failure returns generic 500, logs the original error, and closes without rollback', async () => {
        const { fakeDb, state, stageError } = makeFakeDb({ failStage: 'begin' });
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(putHandler, { body: validBody(), requestId: 'atomic-begin' });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        assert.equal(state.rollbackCount, 0);
        assert.equal(state.closeCount, 1);
        const log = logs.find(args => args[2] === stageError);
        assert.ok(log);
        assert.deepEqual(log[3], { requestId: 'atomic-begin', stage: 'begin' });
    });

    for (const failUpdateIndex of [1, 2, 3]) {
        await t.test(`upsert ${failUpdateIndex} failure rolls back, stops later writes, redacts client detail, and closes once`, async () => {
            const { fakeDb, state, stageError } = makeFakeDb({ failStage: 'update', failUpdateIndex });
            const logs = [];
            Logger.prototype.error = (...args) => logs.push(args);
            db.createIsolatedConnection = (cb) => cb(null, fakeDb);

            const result = await invokeHandler(putHandler, {
                body: validBody(),
                requestId: `atomic-update-${failUpdateIndex}`
            });

            assert.equal(result.statusCode, 500);
            assert.deepEqual(result.body, { error: GENERIC_ERROR });
            assert.ok(!JSON.stringify(result.body).includes(stageError.message));
            assert.equal(state.updateCount, failUpdateIndex, 'no later upsert should run after failure');
            assert.equal(state.rollbackCount, 1);
            assert.equal(state.closeCount, 1);

            const log = logs.find(args => args[2] === stageError);
            assert.ok(log);
            assert.equal(log[3].requestId, `atomic-update-${failUpdateIndex}`);
            assert.equal(log[3].stage, 'update');
            assert.equal(log[3].settingKey, [
                'default_duration',
                'default_transition_mode',
                'default_transition_duration'
            ][failUpdateIndex - 1]);
        });
    }

    await t.test('COMMIT failure attempts rollback, returns generic 500, and closes once', async () => {
        const { fakeDb, state, stageError } = makeFakeDb({ failStage: 'commit' });
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(putHandler, { body: validBody(), requestId: 'atomic-commit' });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        assert.equal(state.updateCount, 3);
        assert.equal(state.rollbackCount, 1);
        assert.equal(state.closeCount, 1);
        const log = logs.find(args => args[2] === stageError);
        assert.ok(log);
        assert.deepEqual(log[3], { requestId: 'atomic-commit', stage: 'commit' });
    });

    await t.test('rollback failure is separately logged without leaking either internal error', async () => {
        const rollbackError = new Error('SENSITIVE_ROLLBACK_P2_ATOMIC');
        const { fakeDb, state, stageError } = makeFakeDb({
            failStage: 'update',
            failUpdateIndex: 2,
            rollbackError
        });
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(putHandler, { body: validBody(), requestId: 'atomic-rollback' });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        assert.ok(!JSON.stringify(result.body).includes(stageError.message));
        assert.ok(!JSON.stringify(result.body).includes(rollbackError.message));
        assert.equal(state.rollbackCount, 1);
        assert.equal(state.closeCount, 1);
        assert.ok(logs.some(args => args[2] === stageError));
        const rollbackLog = logs.find(args => args[2] === rollbackError);
        assert.ok(rollbackLog);
        assert.deepEqual(rollbackLog[3], {
            requestId: 'atomic-rollback',
            stage: 'rollback',
            originalStage: 'update',
            originalError: stageError.message
        });
    });

    await t.test('real SQLite trigger failure rolls back all three settings; success then commits all three together', async () => {
        const originalRows = await allDb(
            "SELECT key, value FROM slide_settings WHERE key IN ('default_duration','default_transition_mode','default_transition_duration','default_announcement_duration') ORDER BY key"
        );

        await runDb("UPDATE slide_settings SET value = '10000' WHERE key = 'default_duration'");
        await runDb("UPDATE slide_settings SET value = 'auto' WHERE key = 'default_transition_mode'");
        await runDb("UPDATE slide_settings SET value = '1000' WHERE key = 'default_transition_duration'");
        await runDb("INSERT OR REPLACE INTO slide_settings (key, value) VALUES ('default_announcement_duration', '7')");
        await runDb(`
            CREATE TRIGGER p2_atomic_fail_transition_mode
            BEFORE INSERT ON slide_settings
            WHEN NEW.key = 'default_transition_mode'
            BEGIN
                SELECT RAISE(ABORT, 'SENSITIVE_REAL_SQLITE_ATOMIC_P2');
            END
        `);

        try {
            const failed = await invokeHandler(putHandler, {
                body: validBody({
                    default_duration: 15000,
                    default_transition_mode: 'random',
                    default_transition_duration: 1800
                }),
                requestId: 'atomic-real-failure'
            });

            assert.equal(failed.statusCode, 500);
            assert.deepEqual(failed.body, { error: GENERIC_ERROR });
            assert.ok(!JSON.stringify(failed.body).includes('SENSITIVE_REAL_SQLITE_ATOMIC_P2'));

            const afterFailure = await allDb(
                "SELECT key, value FROM slide_settings WHERE key IN ('default_duration','default_transition_mode','default_transition_duration','default_announcement_duration') ORDER BY key"
            );
            assert.deepEqual(afterFailure, [
                { key: 'default_announcement_duration', value: '7' },
                { key: 'default_duration', value: '10000' },
                { key: 'default_transition_duration', value: '1000' },
                { key: 'default_transition_mode', value: 'auto' }
            ]);

            await runDb('DROP TRIGGER p2_atomic_fail_transition_mode');

            const success = await invokeHandler(putHandler, {
                body: validBody({
                    default_duration: 15000,
                    default_transition_mode: 'random',
                    default_transition_duration: 1800
                }),
                requestId: 'atomic-real-success'
            });

            assert.equal(success.statusCode, 200);
            assert.deepEqual(success.body, { message: 'Slayt ayarları başarıyla güncellendi' });

            const afterSuccess = await allDb(
                "SELECT key, value FROM slide_settings WHERE key IN ('default_duration','default_transition_mode','default_transition_duration','default_announcement_duration') ORDER BY key"
            );
            assert.deepEqual(afterSuccess, [
                { key: 'default_announcement_duration', value: '7' },
                { key: 'default_duration', value: '15000' },
                { key: 'default_transition_duration', value: '1800' },
                { key: 'default_transition_mode', value: 'random' }
            ]);
        } finally {
            try {
                await runDb('DROP TRIGGER IF EXISTS p2_atomic_fail_transition_mode');
            } catch (_) {}

            await runDb("DELETE FROM slide_settings WHERE key IN ('default_duration','default_transition_mode','default_transition_duration','default_announcement_duration')");
            for (const row of originalRows) {
                await runDb(UPSERT_SQL, [row.key, row.value]);
            }
        }
    });
});
