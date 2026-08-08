const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-delete-redaction-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger } = require('../backend/logger.js');

const GENERIC_ERROR = 'Slayt silinirken hata oluştu';

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

function invokeHandler(handler, req, timeoutMs = 750) {
    return new Promise((resolve, reject) => {
        let responseCount = 0;
        let settled = false;
        let snapshot = null;

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

function makeFakeDb(stage, injectedError, rollbackError = null) {
    const state = {
        closeCount: 0,
        rollbackCount: 0,
        sql: []
    };

    const fakeDb = {
        run(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            state.sql.push(sql);

            if (sql === 'BEGIN IMMEDIATE' && stage === 'begin') {
                return actualCb.call(this, injectedError);
            }
            if (sql.includes('DELETE FROM slides') && stage === 'delete') {
                return actualCb.call(this, injectedError);
            }
            if (sql.includes('UPDATE slides SET display_order') && stage === 'compaction') {
                return actualCb.call(this, injectedError);
            }
            if (sql === 'COMMIT' && stage === 'commit') {
                return actualCb.call(this, injectedError);
            }
            if (sql === 'ROLLBACK') {
                state.rollbackCount += 1;
                return actualCb.call(this, rollbackError);
            }

            if (sql.includes('DELETE FROM slides')) {
                return actualCb.call({ changes: 1 }, null);
            }
            return actualCb.call(this, null);
        },
        get(sql, params, cb) {
            state.sql.push(sql);
            if (stage === 'lookup') {
                return cb(injectedError);
            }
            cb(null, { media_path: '/uploads/slides/redaction-test.jpg', display_order: 2 });
        },
        close(cb) {
            state.closeCount += 1;
            if (cb) cb();
        }
    };

    return { fakeDb, state };
}

test('Slides delete error redaction', async (t) => {
    let deleteHandler;
    let originalCreateIsolatedConnection;
    let originalLoggerError;
    let originalExistsSync;
    let originalUnlinkSync;

    t.before(async () => {
        await db.scheduleMigrationPromise;
        const routes = app._router.stack.filter(
            layer => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.delete
        );
        assert.equal(routes.length, 1);
        deleteHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalCreateIsolatedConnection = db.createIsolatedConnection;
        originalLoggerError = Logger.prototype.error;
        originalExistsSync = fs.existsSync;
        originalUnlinkSync = fs.unlinkSync;
        fs.existsSync = () => {
            throw new Error('filesystem must not be consulted before commit');
        };
        fs.unlinkSync = () => {
            throw new Error('filesystem must not be mutated before commit');
        };
    });

    t.afterEach(() => {
        db.createIsolatedConnection = originalCreateIsolatedConnection;
        Logger.prototype.error = originalLoggerError;
        fs.existsSync = originalExistsSync;
        fs.unlinkSync = originalUnlinkSync;
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

    await t.test('real-style request without a requestId receives a generated correlation id in diagnostics', async () => {
        const injectedError = new Error('SENSITIVE_GENERATED_REQUEST_ID_p16');
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(injectedError);

        const result = await invokeHandler(deleteHandler, {
            params: { id: '47' }
        });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });

        const primaryLog = logs.find(args => args[2] === injectedError);
        assert.ok(primaryLog);
        assert.equal(primaryLog[3].slideId, 47);
        assert.equal(primaryLog[3].stage, 'connection');
        assert.match(
            primaryLog[3].requestId,
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    await t.test('isolated connection error is redacted and logged with request context', async () => {
        const secret = 'SENSITIVE_CONNECTION_DETAIL_p16';
        const injectedError = new Error(secret);
        const logs = [];
        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(injectedError);

        const result = await invokeHandler(deleteHandler, {
            params: { id: '47' },
            requestId: 'p16-connection'
        });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        assert.equal(result.responseCount, 1);
        assert.ok(!JSON.stringify(result.body).includes(secret));

        const primaryLog = logs.find(args => args[2] === injectedError);
        assert.ok(primaryLog, 'original connection error must remain in server diagnostics');
        assert.deepEqual(primaryLog[3], {
            slideId: 47,
            requestId: 'p16-connection',
            stage: 'connection'
        });
    });

    for (const stage of ['begin', 'lookup', 'delete', 'compaction', 'commit']) {
        await t.test(`${stage} failure is redacted, logged, rolled back when applicable, and closes the DB`, async () => {
            const secret = `SENSITIVE_${stage.toUpperCase()}_DETAIL_p16`;
            const injectedError = new Error(secret);
            const logs = [];
            const { fakeDb, state } = makeFakeDb(stage, injectedError);

            Logger.prototype.error = (...args) => logs.push(args);
            db.createIsolatedConnection = (cb) => cb(null, fakeDb);

            const result = await invokeHandler(deleteHandler, {
                params: { id: '47' },
                requestId: `p16-${stage}`
            });

            assert.equal(result.statusCode, 500);
            assert.deepEqual(result.body, { error: GENERIC_ERROR });
            assert.equal(result.responseCount, 1);
            assert.ok(!JSON.stringify(result.body).includes(secret));
            assert.equal(state.closeCount, 1, 'isolated DB must close exactly once');
            assert.equal(state.rollbackCount, stage === 'begin' ? 0 : 1);

            const primaryLog = logs.find(args => args[2] === injectedError);
            assert.ok(primaryLog, `original ${stage} error must remain in server diagnostics`);
            assert.deepEqual(primaryLog[3], {
                slideId: 47,
                requestId: `p16-${stage}`,
                stage
            });
        });
    }

    await t.test('rollback failure is also logged but neither internal error reaches the client', async () => {
        const primarySecret = 'SENSITIVE_DELETE_PRIMARY_p16';
        const rollbackSecret = 'SENSITIVE_ROLLBACK_SECONDARY_p16';
        const primaryError = new Error(primarySecret);
        const rollbackError = new Error(rollbackSecret);
        const logs = [];
        const { fakeDb, state } = makeFakeDb('delete', primaryError, rollbackError);

        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(deleteHandler, {
            params: { id: '47' },
            requestId: 'p16-rollback'
        });

        assert.equal(result.statusCode, 500);
        assert.deepEqual(result.body, { error: GENERIC_ERROR });
        assert.equal(result.responseCount, 1);
        assert.equal(state.rollbackCount, 1);
        assert.equal(state.closeCount, 1);
        assert.ok(!JSON.stringify(result.body).includes(primarySecret));
        assert.ok(!JSON.stringify(result.body).includes(rollbackSecret));
        assert.ok(logs.some(args => args[2] === primaryError));
        assert.ok(logs.some(args => args[2] === rollbackError));
    });

    await t.test('missing slide preserves the public 404 contract and still rolls back cleanly', async () => {
        const logs = [];
        const state = { rollbackCount: 0, closeCount: 0 };
        const fakeDb = {
            run(sql, params, cb) {
                const actualCb = typeof params === 'function' ? params : cb;
                if (sql === 'ROLLBACK') state.rollbackCount += 1;
                actualCb.call(this, null);
            },
            get(sql, params, cb) {
                cb(null, undefined);
            },
            close(cb) {
                state.closeCount += 1;
                if (cb) cb();
            }
        };

        Logger.prototype.error = (...args) => logs.push(args);
        db.createIsolatedConnection = (cb) => cb(null, fakeDb);

        const result = await invokeHandler(deleteHandler, {
            params: { id: '47' },
            requestId: 'p16-missing'
        });

        assert.equal(result.statusCode, 404);
        assert.deepEqual(result.body, { error: 'Slayt bulunamadı' });
        assert.equal(result.responseCount, 1);
        assert.equal(state.rollbackCount, 1);
        assert.equal(state.closeCount, 1);
        assert.equal(logs.length, 0, 'missing slide is a business-rule result, not an internal error');
    });
});
