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

    const DEFAULT_TIMEOUT_MS = 2000;
    const DEFAULT_OBSERVATION_MS = 10;
    const MAX_HELPER_DELAY_MS = 1000;

    function createPromiseHelper(testHandler, options = {}) {
        let timeoutMs = DEFAULT_TIMEOUT_MS;
        let observationMs = DEFAULT_OBSERVATION_MS;

        if (options.timeoutMs !== undefined) {
            if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > MAX_HELPER_DELAY_MS) {
                throw new Error('Invalid timeoutMs option');
            }
            timeoutMs = options.timeoutMs;
        }

        if (options.observationMs !== undefined) {
            if (!Number.isSafeInteger(options.observationMs) || options.observationMs <= 0 || options.observationMs > MAX_HELPER_DELAY_MS) {
                throw new Error('Invalid observationMs option');
            }
            observationMs = options.observationMs;
        }

        if (observationMs >= timeoutMs) {
            throw new Error('observationMs must be less than timeoutMs');
        }

        return function invokeTestHandler(req) {
            return new Promise((resolve, reject) => {
                let responseCount = 0;
                let settled = false;
                let globalTimeoutId;
                let observationTimeoutId;

                const settle = (err, result) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(globalTimeoutId);
                    clearTimeout(observationTimeoutId);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                };

                let capturedStatusCode = 200;
                let capturedBody;

                const res = {
                    statusCode: 200,
                    status: function(code) {
                        this.statusCode = code;
                        return this;
                    },
                    json: function(data) {
                        responseCount++;
                        if (responseCount === 1) {
                            capturedStatusCode = this.statusCode;
                            capturedBody = data;
                            observationTimeoutId = setTimeout(() => {
                                settle(null, {
                                    statusCode: capturedStatusCode,
                                    body: capturedBody,
                                    responseCount: responseCount
                                });
                            }, observationMs);
                        } else {
                            settle(new Error('Multiple responses detected'), null);
                        }
                        return this;
                    }
                };

                const next = (err) => {
                    settle(err || new Error('next() called without error'), null);
                };

                globalTimeoutId = setTimeout(() => {
                    settle(new Error('Response timeout exceeded'), null);
                }, timeoutMs);

                try {
                    testHandler(req, res, next);
                } catch (err) {
                    settle(err, null);
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

    await t.test('Helper: asynchronous double response is detected', async () => {
        const invokeAsyncDouble = createPromiseHelper((req, res) => {
            res.json({ first: true });
            setTimeout(() => {
                res.json({ second: true });
            }, 5);
        }, { timeoutMs: 100, observationMs: 20 });
        await assert.rejects(invokeAsyncDouble({}), /Multiple responses detected/);
    });

    await t.test('Helper: single response is correctly returned', async () => {
        const invokeSingle = createPromiseHelper((req, res) => {
            res.status(201).json({ ok: true });
        });
        const resObj = await invokeSingle({});
        assert.deepEqual(resObj, {
            statusCode: 201,
            body: { ok: true },
            responseCount: 1
        });
    });

    await t.test('Helper: invalid options are rejected synchronously', async () => {
        const dummyHandler = (req, res) => res.json({ ok: true });

        const invalidTimeouts = [
            Infinity, 1.5, 0, Number.MAX_SAFE_INTEGER + 1, MAX_HELPER_DELAY_MS + 1
        ];
        for (const t of invalidTimeouts) {
            assert.throws(() => createPromiseHelper(dummyHandler, { timeoutMs: t }));
        }

        const invalidObservations = [
            Infinity, 1.5, 0, -1, MAX_HELPER_DELAY_MS + 1
        ];
        for (const o of invalidObservations) {
            assert.throws(() => createPromiseHelper(dummyHandler, { observationMs: o }));
        }

        assert.throws(() => createPromiseHelper(dummyHandler, { timeoutMs: 20, observationMs: 20 }));
        assert.throws(() => createPromiseHelper(dummyHandler, { timeoutMs: 20, observationMs: 25 }));
    });

    await t.test('Helper: global timeout enforces maximum total time despite pending observation', async () => {
        const invokeDeadline = createPromiseHelper((req, res) => {
            setTimeout(() => {
                res.json({ first: true });
            }, 10);
        }, {
            timeoutMs: 30,
            observationMs: 25
        });

        await assert.rejects(
            invokeDeadline({}),
            /Response timeout exceeded/
        );
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
                assert.strictEqual(resObj.responseCount, 1);
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
                assert.strictEqual(resObj.responseCount, 1);
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
                assert.strictEqual(resObj.responseCount, 1);
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
        assert.strictEqual(resObj.responseCount, 1);
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
                assert.strictEqual(resObj.responseCount, 1);
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
            assert.strictEqual(resObj.responseCount, 1);
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
        assert.strictEqual(resObj.responseCount, 1);

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

    // 17. Slide Settings Update Route Tests
    await t.test('Slide Settings Update Route Tests', async (t) => {
        const slideSettingsRoutes = app._router.stack.filter(
            layer => layer.route && layer.route.path === '/api/slide-settings' && layer.route.methods.post
        );
        assert.strictEqual(slideSettingsRoutes.length, 1, 'Exactly one POST /api/slide-settings route exists');

        const slideSettingsMiddlewares = slideSettingsRoutes[0].route.stack;
        const slideSettingsHandler = slideSettingsMiddlewares[slideSettingsMiddlewares.length - 1].handle;
        const invokeSlideSettingsHandler = createPromiseHelper(slideSettingsHandler);

        await t.test('missing key or value validation', async () => {
            let dbCalls = 0;
            const originalRun = db.run;
            db.run = () => { dbCalls++; };
            try {
                const resObjMissingKey = await invokeSlideSettingsHandler({ body: { value: 'some value' } });
                assert.strictEqual(resObjMissingKey.statusCode, 400);
                assert.deepEqual(resObjMissingKey.body, { error: 'Key ve value gereklidir' });
                assert.strictEqual(dbCalls, 0);

                const resObjMissingValue = await invokeSlideSettingsHandler({ body: { key: 'some key' } });
                assert.strictEqual(resObjMissingValue.statusCode, 400);
                assert.deepEqual(resObjMissingValue.body, { error: 'Key ve value gereklidir' });
                assert.strictEqual(dbCalls, 0);
            } finally {
                db.run = originalRun;
            }
        });

        await t.test('Successful path preserves exact SQL and returns existing success response', async () => {
            let runCalls = 0;
            let receivedSql, receivedParams;
            let callbackCompleted = false;

            const originalRun = db.run;
            db.run = function(sql, params, cb) {
                runCalls++;
                receivedSql = sql;
                receivedParams = params;
                setTimeout(() => {
                    callbackCompleted = true;
                    cb.call(this, null);
                }, 5);
            };

            let resObj;
            try {
                resObj = await invokeSlideSettingsHandler({ body: { key: 'test_key', value: 'test_val' } });
            } finally {
                db.run = originalRun;
            }

            assert.strictEqual(callbackCompleted, true);
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(resObj.body, { message: 'Ayar başarıyla güncellendi' });
            assert.strictEqual(resObj.responseCount, 1);
            assert.strictEqual(runCalls, 1);
            assert.strictEqual(receivedSql, "INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)");
            assert.deepEqual(receivedParams, ['test_key', 'test_val']);
        });

        await t.test('Database error redaction and logger verification', async () => {
            const secretMarker = 'SENSITIVE_SLIDE_SETTINGS_UPDATE_DB_DETAIL_' + crypto.randomBytes(4).toString('hex');
            const fakeError = new Error(secretMarker);

            let runCalls = 0;
            let receivedSql, receivedParams;
            let callbackCompleted = false;

            const originalRun = db.run;
            db.run = function(sql, params, cb) {
                runCalls++;
                receivedSql = sql;
                receivedParams = params;
                setTimeout(() => {
                    callbackCompleted = true;
                    cb.call(this, fakeError);
                }, 5);
            };

            const originalLogError = Logger.prototype.error;
            let loggerErrorCount = 0;
            let loggedComponent, loggedMessage, loggedErrorObj, loggedMeta;

            Logger.prototype.error = function(component, message, err, meta) {
                loggerErrorCount++;
                loggedComponent = component;
                loggedMessage = message;
                loggedErrorObj = err;
                loggedMeta = meta;
            };

            let resObj;
            try {
                resObj = await invokeSlideSettingsHandler({
                    body: { key: 'err_key', value: 'err_val' },
                    requestId: 'test-req-123'
                });
            } finally {
                db.run = originalRun;
                Logger.prototype.error = originalLogError;
            }

            assert.strictEqual(callbackCompleted, true);
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Slayt ayarları güncellenirken hata oluştu' });
            assert.strictEqual(resObj.responseCount, 1);
            assert.strictEqual(runCalls, 1);
            assert.strictEqual(receivedSql, "INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)");

            const serializedBody = JSON.stringify(resObj.body);
            assert.ok(!serializedBody.includes(secretMarker), 'secret marker is absent from client response');

            assert.strictEqual(loggerErrorCount, 1, 'logger is called exactly once');
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error updating slide settings');
            assert.strictEqual(loggedErrorObj, fakeError);
            assert.strictEqual(loggedMeta.requestId, 'test-req-123');
            assert.strictEqual(loggedMeta.query, receivedSql);
            assert.strictEqual(loggedMeta.params, receivedParams, 'Logger params and SQLite params have object-identity equality');
        });
    });

});
