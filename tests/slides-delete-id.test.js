const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-delete-id-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function removeFileIfPresent(fsApi, filePath) {
    try {
        fsApi.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function removeDirectoryIfPresent(fsApi, directoryPath) {
    try {
        fsApi.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

test('Slides Delete Route ID Validation and Atomic Flow', async (t) => {
    let deleteHandler;
    let originalDbGet, originalDbRun, originalFsExistsSync, originalFsUnlinkSync, originalLoggerError, originalLoggerWarn, originalCreateIsolatedConnection;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.delete && r.route.path === '/api/slides/:id');
        assert.strictEqual(routes.length, 1, 'Exactly one matching DELETE route must exist');
        deleteHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsExistsSync = fs.existsSync;
        originalFsUnlinkSync = fs.unlinkSync;
        originalLoggerError = Logger.prototype.error;
        originalLoggerWarn = Logger.prototype.warn;
        originalCreateIsolatedConnection = db.createIsolatedConnection;
        db.createIsolatedConnection = function(cb) {
            const fakeIsolatedDb = {
                run: (...args) => db.run(...args),
                get: (...args) => db.get(...args),
                all: (...args) => db.all(...args),
                close: (closeCb) => {
                    if (closeCb) closeCb();
                }
            };
            cb(null, fakeIsolatedDb);
        };
    });

    t.afterEach(() => {
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
        if (originalLoggerError) Logger.prototype.error = originalLoggerError;
        if (originalLoggerWarn) Logger.prototype.warn = originalLoggerWarn;
        if (originalCreateIsolatedConnection) db.createIsolatedConnection = originalCreateIsolatedConnection;
    });

    t.after(async () => {
        await closeDatabase(db);
        removeFileIfPresent(fs, testDbPath);
        removeFileIfPresent(fs, testDbPath + '-journal');
        removeFileIfPresent(fs, testDbPath + '-wal');
        removeFileIfPresent(fs, testDbPath + '-shm');
        removeDirectoryIfPresent(fs, tempDir);

        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    function invokeHandler(req, handlerToUse = deleteHandler, timeoutMs = 500) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            const fail = (err) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err);
            };

            timeoutId = setTimeout(() => {
                fail(new Error(`Expected exactly one response, received ${responseCount}`));
            }, timeoutMs);

            const scheduleCompletion = () => {
                if (completionScheduled) return;
                completionScheduled = true;
                setImmediate(() => {
                    if (settled) return;
                    if (responseCount !== 1 || !responseSnapshot) {
                        fail(new Error(`Expected exactly one response, received ${responseCount}`));
                        return;
                    }
                    settled = true;
                    cleanup();
                    resolve({
                        ...responseSnapshot,
                        count: responseCount
                    });
                });
            };

            const res = {
                statusCode: 200,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(data) {
                    responseCount++;
                    if (responseCount > 1) {
                        fail(new Error('Response sent more than once'));
                        return this;
                    }
                    responseSnapshot = {
                        statusCode: this.statusCode || 200,
                        body: data
                    };
                    scheduleCompletion();
                    return this;
                }
            };

            const next = (err) => {
                if (err) fail(err);
                else fail(new Error('next() called without error'));
            };

            try {
                handlerToUse(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('1. Mandatory invalid-type and malformed-string validation', async () => {
        const invalidStrings = [
            'abc', '47abc', 'abc47', '47.5', '47e2', '+47', '-47', '0', '00', '047',
            '47 ', ' 47', '', '   ', '9007199254740992', undefined, null, 1, 47, true, false, {}, [], new Number(47)
        ];

        for (const val of invalidStrings) {
            let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
            db.get = () => { getCalled++; };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: val } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('2. Missing slide triggers completed rollback and 404', async () => {
        let runCalls = [];
        let rollbackCompletedBeforeResponse = false;
        let getSql = null, getParams = null;

        db.get = (sql, params, cb) => {
            getSql = sql;
            getParams = params;
            cb(null, undefined); // row not found
        };

        db.run = (sql, params, cb) => {
            const actualCb = typeof params === 'function' ? params : cb;
            runCalls.push(sql);
            if (sql === 'ROLLBACK') rollbackCompletedBeforeResponse = true;
            actualCb(null);
        };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 404);
        assert.deepEqual(resObj.body, { error: 'Slayt bulunamadı' });
        assert.strictEqual(getSql, "SELECT media_path, display_order FROM slides WHERE id = ?");
        assert.deepEqual(getParams, [47]);
        assert.deepEqual(runCalls, ['BEGIN IMMEDIATE', 'ROLLBACK']);
        assert.ok(rollbackCompletedBeforeResponse);
    });

    await t.test('3. Successful execution follows transaction order and responds after COMMIT', async () => {
        let sqlLog = [];
        let commitCompleted = false;

        db.get = (sql, params, cb) => {
            sqlLog.push(sql);
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql.includes('DELETE')) {
                this.changes = 1;
            } else if (sql.includes('UPDATE')) {
                this.changes = 5;
            } else if (sql === 'COMMIT') {
                commitCompleted = true;
            }
            actualCb.call(this, null);
        };

        let existsCalled = 0, unlinkCalled = 0;
        let existsPath = null, unlinkPath = null;
        fs.existsSync = (p) => { existsCalled++; existsPath = p; return true; };
        fs.unlinkSync = (p) => { unlinkCalled++; unlinkPath = p; };

        const req = { params: { id: '47' }, requestId: 'req-1' };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'SELECT media_path, display_order FROM slides WHERE id = ?',
            'DELETE FROM slides WHERE id = ?',
            'UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?',
            'COMMIT'
        ]);
        assert.ok(commitCompleted);
        assert.strictEqual(existsCalled, 1);
        assert.strictEqual(unlinkCalled, 1);
        const expectedPath = path.join(path.dirname(require.resolve('../backend/server.js')), 'uploads/slides/test.jpg');
        assert.strictEqual(existsPath, expectedPath);
        assert.strictEqual(unlinkPath, expectedPath);
    });

    await t.test('4. Primary DELETE failure triggers rollback and 500 response', async () => {
        let sqlLog = [];
        let rollbackCompleted = false;
        let errorLogCount = 0;

        Logger.prototype.error = () => { errorLogCount++; };

        db.get = (sql, params, cb) => {
            sqlLog.push(sql);
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql.includes('DELETE')) {
                actualCb(new Error('delete constraint error'));
            } else {
                if (sql === 'ROLLBACK') rollbackCompleted = true;
                actualCb(null);
            }
        };

        let unlinkCalled = 0;
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'delete constraint error' });
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'SELECT media_path, display_order FROM slides WHERE id = ?',
            'DELETE FROM slides WHERE id = ?',
            'ROLLBACK'
        ]);
        assert.ok(rollbackCompleted);
        assert.strictEqual(unlinkCalled, 0, 'No media cleanup on failure');
        assert.strictEqual(errorLogCount, 0, 'No rollback error log since rollback succeeded');
    });

    await t.test('5. Compaction failure triggers rollback and 500 response', async () => {
        let sqlLog = [];
        let rollbackCompleted = false;

        db.get = (sql, params, cb) => {
            sqlLog.push(sql);
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql.includes('UPDATE')) {
                actualCb(new Error('compaction error'));
            } else {
                if (sql === 'ROLLBACK') rollbackCompleted = true;
                actualCb(null);
            }
        };

        let unlinkCalled = 0;
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'compaction error' });
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'SELECT media_path, display_order FROM slides WHERE id = ?',
            'DELETE FROM slides WHERE id = ?',
            'UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?',
            'ROLLBACK'
        ]);
        assert.ok(rollbackCompleted);
        assert.strictEqual(unlinkCalled, 0, 'No media cleanup on failure');
    });

    await t.test('6. Commit failure triggers rollback and 500 response', async () => {
        let sqlLog = [];
        let rollbackCompleted = false;

        db.get = (sql, params, cb) => {
            sqlLog.push(sql);
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql === 'COMMIT') {
                actualCb(new Error('commit error'));
            } else {
                if (sql === 'ROLLBACK') rollbackCompleted = true;
                actualCb(null);
            }
        };

        let unlinkCalled = 0;
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'commit error' });
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'SELECT media_path, display_order FROM slides WHERE id = ?',
            'DELETE FROM slides WHERE id = ?',
            'UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?',
            'COMMIT',
            'ROLLBACK'
        ]);
        assert.ok(rollbackCompleted);
        assert.strictEqual(unlinkCalled, 0, 'No media cleanup on failure');
    });

    await t.test('7. Rollback failure is logged and produces 500 response', async () => {
        let sqlLog = [];
        let errorLogArgs = null;

        Logger.prototype.error = (...args) => { errorLogArgs = args; };

        db.get = (sql, params, cb) => cb(null, { media_path: null, display_order: 2 });

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql.includes('DELETE')) {
                actualCb(new Error('primary error'));
            } else if (sql === 'ROLLBACK') {
                actualCb(new Error('rollback catastrophe'));
            } else {
                actualCb(null);
            }
        };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'primary error' });
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'DELETE FROM slides WHERE id = ?',
            'ROLLBACK'
        ]);
        assert.ok(errorLogArgs !== null);
        assert.strictEqual(errorLogArgs[0], COMPONENTS.DATABASE);
        assert.match(errorLogArgs[1], /Rollback failed/);
        assert.strictEqual(errorLogArgs[2].message, 'rollback catastrophe');
        assert.deepEqual(errorLogArgs[3], { originalError: 'primary error' });
    });

    await t.test('8. BEGIN IMMEDIATE failure', async () => {
        let getCalled = false;
        let sqlLog = [];
        let unlinkCalled = 0;
        let existsCalled = 0;

        db.get = (sql, params, cb) => {
            getCalled = true;
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql === 'BEGIN IMMEDIATE') {
                actualCb(new Error('begin transaction failed'));
            } else {
                actualCb(null);
            }
        };
        fs.unlinkSync = () => { unlinkCalled++; };
        fs.existsSync = () => { existsCalled++; return true; };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'begin transaction failed' });
        assert.strictEqual(resObj.count, 1, 'Exactly one response sent');
        assert.strictEqual(getCalled, false, 'db.get must not be called');
        assert.deepEqual(sqlLog, ['BEGIN IMMEDIATE']);
        assert.strictEqual(unlinkCalled, 0, 'No media cleanup occurs');
        assert.strictEqual(existsCalled, 0, 'No media check occurs');
    });

    await t.test('9. Slide lookup failure triggers rollback', async () => {
        let sqlLog = [];
        let rollbackCompletedBeforeResponse = false;
        let unlinkCalled = 0;
        let existsCalled = 0;

        db.get = (sql, params, cb) => {
            cb(new Error('select failed'));
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql === 'ROLLBACK') rollbackCompletedBeforeResponse = true;
            actualCb(null);
        };
        fs.unlinkSync = () => { unlinkCalled++; };
        fs.existsSync = () => { existsCalled++; return true; };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'select failed' });
        assert.strictEqual(resObj.count, 1, 'Exactly one response sent');
        assert.deepEqual(sqlLog, ['BEGIN IMMEDIATE', 'ROLLBACK']);
        assert.ok(rollbackCompletedBeforeResponse, 'Error response not sent before rollback completes');
        assert.strictEqual(unlinkCalled, 0, 'No media cleanup occurs');
        assert.strictEqual(existsCalled, 0, 'No media check occurs');
    });

    await t.test('10. Post-commit media cleanup failure logs warning and preserves success response', async () => {
        let sqlLog = [];
        let warnLogArgs = null;

        Logger.prototype.warn = (...args) => { warnLogArgs = args; };

        db.get = (sql, params, cb) => {
            sqlLog.push(sql);
            cb(null, { media_path: 'uploads/slides/test.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            sqlLog.push(sql);
            if (sql.includes('DELETE')) this.changes = 1;
            actualCb.call(this, null);
        };

        fs.existsSync = () => true;
        fs.unlinkSync = () => {
            throw new Error('filesystem error');
        };

        const req = { params: { id: '47' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.strictEqual(resObj.count, 1, 'Exactly one response sent');
        assert.deepEqual(sqlLog, [
            'BEGIN IMMEDIATE',
            'SELECT media_path, display_order FROM slides WHERE id = ?',
            'DELETE FROM slides WHERE id = ?',
            'UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?',
            'COMMIT'
        ]);

        assert.ok(warnLogArgs !== null, 'Filesystem error must be logged as warning');
        assert.strictEqual(warnLogArgs[0], COMPONENTS.API);
        assert.match(warnLogArgs[1], /Error deleting media file/);
        assert.strictEqual(warnLogArgs[2].message, 'filesystem error');
    });
});
