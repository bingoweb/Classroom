const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-settings-update-test-'));
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
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function removeFileIfPresent(fsApi, filePath) {
    try {
        fsApi.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

function removeDirectoryIfPresent(fsApi, directoryPath) {
    try {
        fsApi.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

test('Settings Update Tests', async (t) => {
    t.after(async () => {
        try {
            await closeDatabase(db);
            const filesToRemove = [
                testDbPath,
                testDbPath + '-journal',
                testDbPath + '-wal',
                testDbPath + '-shm'
            ];
            for (const file of filesToRemove) {
                removeFileIfPresent(fs, file);
            }
            removeDirectoryIfPresent(fs, tempDir);
        } finally {
            global.setInterval = originalSetInterval;
            if (originalDbPath === undefined) {
                delete process.env.CLASSROOM_DB_PATH;
            } else {
                process.env.CLASSROOM_DB_PATH = originalDbPath;
            }
        }
    });

    await db.scheduleMigrationPromise;

    const matchingRoutes = app._router.stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/settings' &&
            layer.route.methods.post
    );

    assert.strictEqual(
        matchingRoutes.length,
        1,
        'Exactly one matching POST /api/settings route must exist'
    );

    const routeLayer = matchingRoutes[0];
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun, originalDbAll, originalDbGet, originalDbPrepare;

    t.beforeEach(() => {
        originalDbRun = db.run;
        originalDbAll = db.all;
        originalDbGet = db.get;
        originalDbPrepare = db.prepare;
    });

    t.afterEach(() => {
        db.run = originalDbRun;
        db.all = originalDbAll;
        db.get = originalDbGet;
        db.prepare = originalDbPrepare;
    });

    function createPromiseHelper(testHandler) {
        return function invokeTestHandler(req) {
            return new Promise((resolve, reject) => {
                let responded = false;
                let timeoutId;

                const res = {
                    statusCode: 200,
                    status: function(code) {
                        this.statusCode = code;
                        return this;
                    },
                    json: function(data) {
                        if (responded) {
                            clearTimeout(timeoutId);
                            throw new Error('Multiple responses detected');
                        }
                        responded = true;
                        clearTimeout(timeoutId);
                        this.body = data;
                        setImmediate(() => {
                            resolve({ statusCode: this.statusCode, body: this.body });
                        });
                        return this;
                    }
                };

                const next = (err) => {
                    if (responded) return;
                    responded = true;
                    clearTimeout(timeoutId);
                    setImmediate(() => {
                        reject(err || new Error('next() called without error'));
                    });
                };

                timeoutId = setTimeout(() => {
                    if (!responded) {
                        responded = true;
                        reject(new Error('Response timeout exceeded'));
                    }
                }, 100);

                try {
                    testHandler(req, res, next);
                } catch (err) {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
        };
    }

    const invokeHandler = createPromiseHelper(handler);

    await t.test('Helper: zero responses are detected', async () => {
        const invokeZero = createPromiseHelper(() => {});
        await assert.rejects(invokeZero({}), /Response timeout exceeded/);
    });

    await t.test('Helper: two synchronous responses are detected', async () => {
        const invokeDouble = createPromiseHelper((req, res) => {
            res.json({ first: true });
            res.json({ second: true });
        });
        await assert.rejects(invokeDouble({}), /Multiple responses detected/);
    });

    const runDb = (sql, params) => new Promise((resolve, reject) => {
        originalDbRun.call(db, sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    const getDb = (sql, params = []) => new Promise((resolve, reject) => {
        originalDbGet.call(db, sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    // 10. Mandatory invalid-body regressions
    const invalidBodies = [
        { desc: 'undefined', value: undefined },
        { desc: 'null', value: null },
        { desc: 'array', value: [] },
        { desc: 'string', value: 'message' },
        { desc: 'number', value: 42 },
        { desc: 'true', value: true },
        { desc: 'false', value: false }
    ];

    await t.test('Invalid bodies', async (t) => {
        for (const item of invalidBodies) {
            await t.test(`structurally invalid body: ${item.desc}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.get = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body: item.value };
                const resObj = await invokeHandler(req);

                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Ayar anahtarı gereklidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // 11. Mandatory invalid-key regressions
    const invalidKeys = [
        { desc: 'undefined', value: undefined },
        { desc: 'null', value: null },
        { desc: 'number 42', value: 42 },
        { desc: 'number 0', value: 0 },
        { desc: 'boolean true', value: true },
        { desc: 'boolean false', value: false },
        { desc: 'array', value: [] },
        { desc: 'object', value: {} },
        { desc: 'boxed string', value: new String('message') },
        { desc: 'empty string', value: '' },
        { desc: 'space', value: ' ' },
        { desc: 'whitespace', value: ' \t\n ' }
    ];

    await t.test('Invalid keys', async (t) => {
        for (const item of invalidKeys) {
            await t.test(`invalid key: ${item.desc}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.get = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body: { key: item.value, value: 'some value' } };
                const resObj = await invokeHandler(req);

                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Ayar anahtarı gereklidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // 12. Mandatory invalid-value regressions
    const invalidValues = [
        { desc: 'undefined', value: undefined },
        { desc: 'null', value: null }
    ];

    await t.test('Invalid values', async (t) => {
        for (const item of invalidValues) {
            await t.test(`invalid value: ${item.desc}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.get = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body: { key: 'message', value: item.value } };
                const resObj = await invokeHandler(req);

                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Ayar değeri gereklidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // 13. Mandatory valid-key normalization regressions
    await t.test('Valid key normalization regression', async () => {
        let runCalls = 0;
        let receivedSql, receivedParams;
        let callbackCompleted = false;

        db.run = function(sql, params, cb) {
            runCalls++;
            receivedSql = sql;
            receivedParams = params;
            setTimeout(() => {
                callbackCompleted = true;
                cb.call(this, null);
            }, 5);
        };

        const resObj = await invokeHandler({ body: { key: '  message  ', value: 'Merhaba sınıf' } });

        assert.strictEqual(callbackCompleted, true);
        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Ayarlar güncellendi' });
        assert.strictEqual(runCalls, 1);
        assert.strictEqual(receivedSql, "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        assert.deepEqual(receivedParams, ['message', 'Merhaba sınıf']);
    });

    // 14. Mandatory accepted-value regressions
    const acceptedValues = [
        { desc: 'false', value: false },
        { desc: '0', value: 0 },
        { desc: 'empty string', value: '' }
    ];

    await t.test('Accepted values regression', async (t) => {
        for (const item of acceptedValues) {
            await t.test(`accepted value: ${item.desc}`, async () => {
                let runCalls = 0;
                let receivedParams;
                let callbackCompleted = false;

                db.run = function(sql, params, cb) {
                    runCalls++;
                    receivedParams = params;
                    setTimeout(() => {
                        callbackCompleted = true;
                        cb.call(this, null);
                    }, 5);
                };

                const resObj = await invokeHandler({ body: { key: 'test_key', value: item.value } });

                assert.strictEqual(callbackCompleted, true);
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { message: 'Ayarlar güncellendi' });
                assert.strictEqual(runCalls, 1);
                assert.strictEqual(receivedParams[1], item.value);
            });
        }
    });

    // 15. Mandatory database-error regression
    await t.test('Database error regression', async () => {
        const fakeError = new Error('Database simulated error');
        let runCalls = 0;
        let receivedParams;
        let callbackCompleted = false;

        db.run = function(sql, params, cb) {
            runCalls++;
            receivedParams = params;
            setTimeout(() => {
                callbackCompleted = true;
                cb.call(this, fakeError);
            }, 5);
        };

        const originalLogError = Logger.prototype.error;
        const errorLogCalls = [];
        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        try {
            const resObj = await invokeHandler({ body: { key: '  err_key  ', value: 'err_val' } });

            assert.strictEqual(callbackCompleted, true);
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Ayarlar güncellenirken hata oluştu' });
            assert.strictEqual(runCalls, 1);
            assert.strictEqual(receivedParams[0], 'err_key');

            assert.strictEqual(errorLogCalls.length, 1);
            const logCall = errorLogCalls[0];
            assert.strictEqual(logCall[0], COMPONENTS.API);
            assert.strictEqual(logCall[1], 'Error updating settings');
            assert.strictEqual(logCall[2], fakeError);
            assert.deepEqual(logCall[3], { key: '  err_key  ', value: 'err_val' });
        } finally {
            Logger.prototype.error = originalLogError;
        }
    });

    // 16. Mandatory real SQLite regression
    await t.test('Real SQLite regression', async () => {
        const resObj = await invokeHandler({ body: { key: '  settings_test_key  ', value: 'settings_test_value' } });

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Ayarlar güncellendi' });

        try {
            const rowPadded = await getDb("SELECT * FROM settings WHERE key = ?", ['  settings_test_key  ']);
            assert.strictEqual(rowPadded, undefined);

            const rowTrimmed = await getDb("SELECT * FROM settings WHERE key = ?", ['settings_test_key']);
            assert.ok(rowTrimmed);
            assert.strictEqual(rowTrimmed.value, 'settings_test_value');
        } finally {
            await runDb("DELETE FROM settings WHERE key = ?", ['settings_test_key']);
        }
    });

});
