const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-reorder-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;
const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
process.env.CLASSROOM_ADMIN_PASSWORD = 'test_password';

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

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

test('Slides Reorder Route Tests', async (t) => {
    let server;
    let serverUrl;
    let adminCookie = null;
    let originalDbSerialize, originalDbPrepare, originalDbGet, originalDbRun;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                serverUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
        // Initial login to get cookie
        const loginData = JSON.stringify({ password: 'test_password' });
        adminCookie = await new Promise((resolve, reject) => {
            const req = http.request(serverUrl + '/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(loginData)
                }
            }, (res) => {
                let setCookieHeader = res.headers['set-cookie'];
                let cookie = setCookieHeader ? setCookieHeader[0].split(';')[0] : null;
                res.on('data', () => {});
                res.on('end', () => resolve(cookie));
            });
            req.on('error', reject);
            req.write(loginData);
            req.end();
        });
    });

    t.beforeEach(() => {
        originalDbSerialize = db.serialize;
        originalDbPrepare = db.prepare;
        originalDbGet = db.get;
        originalDbRun = db.run;
    });

    t.afterEach(() => {
        if (originalDbSerialize) db.serialize = originalDbSerialize;
        if (originalDbPrepare) db.prepare = originalDbPrepare;
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
    });

    t.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
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
        if (originalPassword === undefined) {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        } else {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalPassword;
        }
    });

    function makeRequest(method, endpoint, bodyObj) {
        return new Promise((resolve, reject) => {
            const headers = { 'Content-Type': 'application/json' };
            if (adminCookie) {
                headers['Cookie'] = adminCookie;
            }
            const req = http.request(serverUrl + endpoint, {
                method: method,
                headers: headers
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                });
            });
            req.on('error', reject);
            if (bodyObj) {
                req.write(JSON.stringify(bodyObj));
            }
            req.end();
        });
    }

    await t.test('1. Mandatory route-stack ordering test', () => {
        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.put)
            .map(r => r.route.path);

        const reorderIndex = routes.findIndex(path => path === '/api/slides/reorder');
        const updateIndex = routes.findIndex(path => path === '/api/slides/:id');

        assert.ok(reorderIndex !== -1, 'reorder route must exist');
        assert.ok(updateIndex !== -1, '/:id route must exist');

        const reorderCount = routes.filter(path => path === '/api/slides/reorder').length;
        const updateCount = routes.filter(path => path === '/api/slides/:id').length;

        assert.strictEqual(reorderCount, 1, 'there must be exactly one reorder route');
        assert.strictEqual(updateCount, 1, 'there must be exactly one /:id update route');

        assert.ok(reorderIndex < updateIndex, 'reorder route must be registered before /:id route');
    });

    await t.test('2. Mandatory successful real-dispatch test', async () => {
        let getCalled = false;
        let serializeCalled = 0;
        let prepareCalled = 0;
        let preparedSql = null;
        let runCalls = [];
        let finalizeCalled = 0;

        db.get = function() {
            getCalled = true;
            throw new Error('db.get must not be called');
        };

        db.serialize = function(cb) {
            serializeCalled++;
            cb();
        };

        db.prepare = function(sql, params, cb) {
            if (typeof params === 'function') cb = params;
            prepareCalled++;
            preparedSql = sql;
            if (cb) setImmediate(() => cb(null));
            return {
                run: function(params, cb) {
                    runCalls.push(params);
                    if (cb) cb(null);
                },
                finalize: function(cb) {
                    finalizeCalled++;
                    if (cb) cb(null);
                }
            };
        };

        const payload = {
            slideOrders: [
                { id: 2, display_order: 1 },
                { id: 1, display_order: 2 }
            ]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);

        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(response.body, { message: 'Sıralama başarıyla güncellendi' });

        assert.strictEqual(getCalled, false);
        assert.strictEqual(serializeCalled, 1);
        assert.strictEqual(prepareCalled, 1);
        assert.strictEqual(preparedSql, 'UPDATE slides SET display_order = ? WHERE id = ?');
        assert.strictEqual(runCalls.length, 2);
        assert.deepEqual(runCalls, [
            [1, 2],
            [2, 1]
        ]);
        assert.strictEqual(finalizeCalled, 1);
    });

    await t.test('3. Mandatory invalid-payload real-dispatch test', async () => {
        let getCalled = false;
        let serializeCalled = false;
        let prepareCalled = false;

        db.get = () => { getCalled = true; };
        db.serialize = () => { serializeCalled = true; };
        db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') p(null); else if (c) c(null); };

        const payload = { slideOrders: [] };
        const response = await makeRequest('PUT', '/api/slides/reorder', payload);

        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi' });

        assert.strictEqual(serializeCalled, false);
        assert.strictEqual(prepareCalled, false);
        assert.strictEqual(getCalled, false);
    });

    await t.test('4. Mandatory item-validation preservation test', async () => {
        let dbCalled = false;
        const markDbCalled = (s, p, c) => { dbCalled = true; if (typeof p === 'function') setImmediate(() => p(null)); else if (c) setImmediate(() => c(null)); };

        db.get = markDbCalled;
        db.serialize = markDbCalled;
        db.prepare = markDbCalled;
        db.run = markDbCalled;

        const payload = {
            slideOrders: [
                { id: 1 }
            ]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);

        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        assert.strictEqual(dbCalled, false);
    });


    await t.test('Real HTTP: A. Null item', async () => {
        let dbCalled = false;
        const markDbCalled = (s, p, c) => { dbCalled = true; if (typeof p === 'function') setImmediate(() => p(null)); else if (c) setImmediate(() => c(null)); };

        db.get = markDbCalled;
        db.serialize = markDbCalled;
        db.prepare = markDbCalled;
        db.run = markDbCalled;

        const payload = {
            slideOrders: [null]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);

        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        assert.strictEqual(dbCalled, false);
    });

    await t.test('Real HTTP: B. Numeric-string fields', async () => {
        let dbCalled = false;
        const markDbCalled = (s, p, c) => { dbCalled = true; if (typeof p === 'function') p(null); else if (c) c(null); };

        db.get = markDbCalled;
        db.serialize = markDbCalled;
        db.prepare = markDbCalled;
        db.run = markDbCalled;

        const payload = {
            slideOrders: [
                {
                    id: '2',
                    display_order: '1'
                }
            ]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);

        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        assert.strictEqual(dbCalled, false);
    });

    await t.test('5. Mandatory numeric update-route preservation check', async () => {
        let getSql = null;
        let getParams = null;
        let runSql = null;

        db.get = function(sql, params, cb) {
            getSql = sql;
            getParams = params;
            // Return a dummy existing slide so update can proceed
            cb(null, { media_path: 'old.jpg' });
        };

        db.run = function(sql, params, cb) {
            runSql = sql;
            this.changes = 1;
            cb.call(this, null);
        };

        const payload = { title: 'Yeni başlık' };
        const response = await makeRequest('PUT', '/api/slides/47', payload);

        // Assert we actually reached the update handler
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(response.body, {
            message: 'Slayt başarıyla güncellendi',
            changes: 1
        });

        assert.ok(getSql.includes('SELECT media_path FROM slides WHERE id = ?'));
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(typeof getParams[0], 'number');
        assert.ok(runSql.includes('UPDATE slides SET'));
    });
    await t.test('6. Mandatory actual handler discovery and structural tests', async (t2) => {
        const matchingRoutes = app._router.stack.filter(
            layer =>
                layer.route &&
                layer.route.path === '/api/slides/reorder' &&
                layer.route.methods.put
        );

        assert.strictEqual(
            matchingRoutes.length,
            1,
            'Exactly one matching PUT /api/slides/reorder route must exist'
        );

        const routeLayer = matchingRoutes[0];
        const middlewares = routeLayer.route.stack;
        const handler = middlewares[middlewares.length - 1].handle;

        function createMockRes() {
            const res = {
                statusCode: 200,
                responseCount: 0,
                body: null,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(data) {
                    this.responseCount++;
                    if (this.responseCount > 1) {
                        throw new Error('Multiple responses sent');
                    }
                    this.body = data;
                    return this;
                }
            };
            return res;
        }

        const primitiveBodies = [undefined, null, [], 'reorder', 42, true, false];

        for (const testedBody of primitiveBodies) {
            const testName = Array.isArray(testedBody) ? '[]' : String(testedBody);
            await t2.test(`Structural body regression: ${testName} is rejected with 400`, () => {
                let serializeCalled = false;
                let prepareCalled = false;
                let getCalled = false;
                let runCalled = false;

                db.serialize = () => { serializeCalled = true; };
                db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') setImmediate(() => p(null)); else if (c) setImmediate(() => c(null)); };
                db.get = () => { getCalled = true; };
                db.run = () => { runCalled = true; };

                const req = { body: testedBody };
                const res = createMockRes();

                assert.doesNotThrow(() => {
                    handler(req, res);
                });

                assert.strictEqual(res.statusCode, 400);
                assert.deepStrictEqual(res.body, { error: 'Geçersiz sıralama verisi' });
                assert.strictEqual(res.responseCount, 1);

                assert.strictEqual(serializeCalled, false);
                assert.strictEqual(prepareCalled, false);
                assert.strictEqual(getCalled, false);
                assert.strictEqual(runCalled, false);
            });
        }

        await t2.test(`Mandatory empty-object regression`, () => {
            let serializeCalled = false;
            let prepareCalled = false;
            let getCalled = false;
            let runCalled = false;

            db.serialize = () => { serializeCalled = true; };
            db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') p(null); else if (c) c(null); };
            db.get = () => { getCalled = true; };
            db.run = () => { runCalled = true; };

            const req = { body: {} };
            const res = createMockRes();

            assert.doesNotThrow(() => {
                handler(req, res);
            });

            assert.strictEqual(res.statusCode, 400);
            assert.deepStrictEqual(res.body, { error: 'Geçersiz sıralama verisi' });
            assert.strictEqual(res.responseCount, 1);

            assert.strictEqual(serializeCalled, false);
            assert.strictEqual(prepareCalled, false);
            assert.strictEqual(getCalled, false);
            assert.strictEqual(runCalled, false);
        });


        const structuralInvalidItems = [
            undefined, null, [], 'reorder', 42, true, false, {}
        ];

        for (let i = 0; i < structuralInvalidItems.length; i++) {
            const testedItem = structuralInvalidItems[i];
            const testName = typeof testedItem === 'object' && testedItem ? JSON.stringify(testedItem) : String(testedItem);

            await t2.test(`Direct handler: Structural invalid item ${testName} is rejected with 400`, () => {
                let serializeCalled = false;
                let prepareCalled = false;
                let getCalled = false;
                let runCalled = false;

                db.serialize = () => { serializeCalled = true; };
                db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') setImmediate(() => p(null)); else if (c) setImmediate(() => c(null)); };
                db.get = () => { getCalled = true; };
                db.run = () => { runCalled = true; };

                const req = {
                    body: { slideOrders: [testedItem] },
                    requestId: 'reorder-item-validation'
                };
                const res = createMockRes();

                assert.doesNotThrow(() => { handler(req, res); });

                assert.strictEqual(res.statusCode, 400);
                assert.deepStrictEqual(res.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
                assert.strictEqual(res.responseCount, 1);
                assert.strictEqual(serializeCalled, false);
                assert.strictEqual(prepareCalled, false);
                assert.strictEqual(getCalled, false);
                assert.strictEqual(runCalled, false);
            });
        }

        const invalidIdMatrix = [
            { id: undefined, display_order: 1 },
            { id: null, display_order: 1 },
            { id: '1', display_order: 1 },
            { id: '', display_order: 1 },
            { id: true, display_order: 1 },
            { id: [], display_order: 1 },
            { id: 0, display_order: 1 },
            { id: -1, display_order: 1 },
            { id: 1.5, display_order: 1 },
            { id: NaN, display_order: 1 },
            { id: Infinity, display_order: 1 },
            { id: Number.MAX_SAFE_INTEGER + 1, display_order: 1 }
        ];

        for (const testedItem of invalidIdMatrix) {
            await t2.test(`Direct handler: Invalid id ${String(testedItem.id)} is rejected`, () => {
                let serializeCalled = false;
                let prepareCalled = false;
                let getCalled = false;
                let runCalled = false;

                db.serialize = () => { serializeCalled = true; };
                db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') setImmediate(() => p(null)); else if (c) setImmediate(() => c(null)); };
                db.get = () => { getCalled = true; };
                db.run = () => { runCalled = true; };

                const req = {
                    body: { slideOrders: [testedItem] },
                    requestId: 'reorder-item-validation'
                };
                const res = createMockRes();

                assert.doesNotThrow(() => { handler(req, res); });

                assert.strictEqual(res.statusCode, 400);
                assert.deepStrictEqual(res.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
                assert.strictEqual(res.responseCount, 1);
                assert.strictEqual(serializeCalled, false);
                assert.strictEqual(prepareCalled, false);
                assert.strictEqual(getCalled, false);
                assert.strictEqual(runCalled, false);
            });
        }

        const invalidOrderMatrix = [
            { id: 1 },
            { id: 1, display_order: undefined },
            { id: 1, display_order: null },
            { id: 1, display_order: '1' },
            { id: 1, display_order: '' },
            { id: 1, display_order: true },
            { id: 1, display_order: false },
            { id: 1, display_order: [] },
            { id: 1, display_order: 0 },
            { id: 1, display_order: -1 },
            { id: 1, display_order: 1.5 },
            { id: 1, display_order: NaN },
            { id: 1, display_order: Infinity },
            { id: 1, display_order: Number.MAX_SAFE_INTEGER + 1 }
        ];

        for (const testedItem of invalidOrderMatrix) {
            await t2.test(`Direct handler: Invalid display_order ${String(testedItem.display_order)} is rejected`, () => {
                let serializeCalled = false;
                let prepareCalled = false;
                let getCalled = false;
                let runCalled = false;

                db.serialize = () => { serializeCalled = true; };
                db.prepare = (s, p, c) => { prepareCalled = true; if (typeof p === 'function') p(null); else if (c) c(null); };
                db.get = () => { getCalled = true; };
                db.run = () => { runCalled = true; };

                const req = {
                    body: { slideOrders: [testedItem] },
                    requestId: 'reorder-item-validation'
                };
                const res = createMockRes();

                assert.doesNotThrow(() => { handler(req, res); });

                assert.strictEqual(res.statusCode, 400);
                assert.deepStrictEqual(res.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
                assert.strictEqual(res.responseCount, 1);
                assert.strictEqual(serializeCalled, false);
                assert.strictEqual(prepareCalled, false);
                assert.strictEqual(getCalled, false);
                assert.strictEqual(runCalled, false);
            });
        }

        await t2.test('Direct handler: Valid boundary preservation (1, MAX_SAFE_INTEGER)', async () => {
            let serializeCalled = 0;
            let prepareCalled = 0;
            let preparedSql = null;
            let stmtRunCalls = [];
            let finalizeCalled = 0;
            let dbRunCalls = [];

            db.serialize = (cb) => { serializeCalled++; cb(); };
            db.prepare = (sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                prepareCalled++;
                preparedSql = sql;
                if (cb) setImmediate(() => cb(null));
                return {
                    run: (params, cb) => {
                        stmtRunCalls.push(params);
                        if (cb) cb(null);
                    },
                    finalize: (cb) => {
                        finalizeCalled++;
                        if (cb) cb(null);
                    }
                };
            };
            db.get = () => { throw new Error('db.get must not be called'); };
            db.run = (sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                dbRunCalls.push(sql);
                if (cb) cb(null);
            };

            const payload = [
                { id: 1, display_order: 1 },
                { id: Number.MAX_SAFE_INTEGER, display_order: Number.MAX_SAFE_INTEGER }
            ];

            let resCode = 200;
            let resBody = null;
            await new Promise((resolve) => {
                const res = {
                    status: (code) => { resCode = code; return res; },
                    json: (data) => {
                        resBody = data;
                        resolve();
                    }
                };

                const req = {
                    body: { slideOrders: payload },
                    requestId: 'reorder-valid-boundary'
                };

                assert.doesNotThrow(() => { handler(req, res); });
            });

            assert.strictEqual(resCode, 200);
            assert.deepStrictEqual(resBody, { message: 'Sıralama başarıyla güncellendi' });
            assert.strictEqual(serializeCalled, 1);
            assert.strictEqual(prepareCalled, 1);
            assert.strictEqual(preparedSql, 'UPDATE slides SET display_order = ? WHERE id = ?');
            assert.strictEqual(stmtRunCalls.length, 2);
            assert.deepStrictEqual(stmtRunCalls, [
                [1, 1],
                [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
            ]);
            assert.strictEqual(finalizeCalled, 1);
            assert.deepStrictEqual(dbRunCalls, ["BEGIN IMMEDIATE TRANSACTION", "COMMIT"]);
        });
    });

    await t.test('7. Mocked transaction sequencing', async (t2) => {
        const matchingRoutes = app._router.stack.filter(layer => layer.route && layer.route.path === '/api/slides/reorder' && layer.route.methods.put);
        const handler = matchingRoutes[0].route.stack[matchingRoutes[0].route.stack.length - 1].handle;

        function invokeHandlerMockDb(reqBody, dbMock, timeoutMs = 500) {
            let originalSerialize = db.serialize;
            let originalRun = db.run;
            let originalPrepare = db.prepare;

            db.serialize = dbMock.serialize || ((cb) => cb());
            db.run = dbMock.run;
            db.prepare = dbMock.prepare;

            return new Promise((resolve, reject) => {
                let resCount = 0;
                let resBody = null;
                let resCode = 200;
                let settled = false;
                let timeoutId = null;
                let observationId = null;
                const cleanupTimers = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (observationId) clearTimeout(observationId);
                };
                const fail = (err) => {
                    if (!settled) {
                        settled = true;
                        cleanupTimers();
                        reject(err);
                    }
                };
                const res = {
                    status(code) { resCode = code; return this; },
                    json(data) {
                        resCount++;
                        if (resCount === 1) {
                            resBody = data;
                            observationId = setTimeout(() => {
                                if (!settled) {
                                    settled = true;
                                    cleanupTimers();
                                    resolve({ statusCode: resCode, body: resBody });
                                }
                            }, 10);
                        } else {
                            fail(new Error('Multiple responses'));
                        }
                        return this;
                    }
                };
                timeoutId = setTimeout(() => {
                    if (!settled && resCount === 0) fail(new Error('Expected exactly one response, received 0'));
                }, timeoutMs);

                try {
                    handler({ body: reqBody, requestId: 'test' }, res);
                } catch (err) {
                    fail(err);
                }
            }).finally(() => {
                db.serialize = originalSerialize;
                db.run = originalRun;
                db.prepare = originalPrepare;
            });
        }

        await t2.test('Helper self-regression: zero responses', async () => {
            const p = invokeHandlerMockDb({ slideOrders: [{id: 1, display_order: 1}] }, {
                run: function() {},
                prepare: function() { return { run: () => {}, finalize: () => {} }; }
            }, 50);
            await assert.rejects(p, /Expected exactly one response, received 0/);
        });

        await t2.test('Helper self-regression: two immediate responses', async () => {
            const p = invokeHandlerMockDb({ slideOrders: [{id: 1, display_order: 1}] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) { cb(null); cb(null); }
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return { run: (p, c) => { if (c) c(null); }, finalize: (c) => { if (c) c(null); } };
                }
            });
            await assert.rejects(p, /Multiple responses/);
        });

        await t2.test('Helper self-regression: delayed second response', async () => {
            const p = invokeHandlerMockDb({ slideOrders: [{id: 1, display_order: 1}] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) {
                        cb(null);
                        setTimeout(() => cb(null), 5);
                    }
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return { run: (p, c) => { if (c) c(null); }, finalize: (c) => { if (c) c(null); } };
                }
            });
            await assert.rejects(p, /Multiple responses/);
        });

        await t2.test('Helper self-regression: exactly one response resolves successfully', async () => {
            const resObj = await invokeHandlerMockDb({ slideOrders: [{id: 1, display_order: 1}] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return { run: (p, c) => { if (c) c(null); }, finalize: (c) => { if (c) c(null); } };
                }
            });
            assert.strictEqual(resObj.statusCode, 200);
        });

        await t2.test('Begin failure causes zero prepare/update calls', async () => {
            let runCalls = [];
            let prepareCalled = false;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (sql === "BEGIN IMMEDIATE TRANSACTION") {
                        if (cb) cb(new Error('begin failed'));
                    } else if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    prepareCalled = true;
                    if (cb) setImmediate(() => cb(null));
                    return { run: function() {}, finalize: function(cb) { if (cb) cb(null); } };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepStrictEqual(resObj.body, { error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
            assert.strictEqual(prepareCalled, false);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION"]);
        });

        await t2.test('Update failure causes statement finalization followed by ROLLBACK', async () => {
            let runCalls = [];
            let prepareCalls = [];
            let finalizeCalled = false;
            let stmtRunCalls = 0;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    prepareCalls.push(sql);
                    if (cb) setImmediate(() => cb(null));
                    return {
                        run: function(p, c) {
                            stmtRunCalls++;
                            if (stmtRunCalls === 1) {
                                if (c) c(new Error('update failed'));
                            } else {
                                if (c) c(null);
                            }
                        },
                        finalize: function(c) { finalizeCalled = true; if (c) c(null); }
                    };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.strictEqual(stmtRunCalls, 1);
            assert.strictEqual(finalizeCalled, true);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "ROLLBACK"]);
        });

        await t2.test('Commit failure causes ROLLBACK', async () => {
            let runCalls = [];
            let finalizeCalled = false;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (sql === "COMMIT") {
                        if (cb) cb(new Error('commit failed'));
                    } else {
                        if (cb) cb(null);
                    }
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return {
                        run: function(p, c) { if (c) c(null); },
                        finalize: function(c) { finalizeCalled = true; if (c) c(null); }
                    };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.strictEqual(finalizeCalled, true);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "COMMIT", "ROLLBACK"]);
        });

        await t2.test('Successful updates cause finalization followed by COMMIT and success not sent before commit callback', async () => {
            let runCalls = [];
            let finalizeCalled = false;
            let commitCallbackCompleted = false;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (sql === "COMMIT") {
                        setTimeout(() => {
                            commitCallbackCompleted = true;
                            if (cb) cb(null);
                        }, 10);
                    } else {
                        if (cb) cb(null);
                    }
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return {
                        run: function(p, c) { if (c) c(null); },
                        finalize: function(c) { finalizeCalled = true; if (c) c(null); }
                    };
                }
            });
            assert.strictEqual(resObj.statusCode, 200);
            assert.strictEqual(finalizeCalled, true);
            assert.strictEqual(commitCallbackCompleted, true);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "COMMIT"]);
        });

        await t2.test('Asynchronous prepare failure', async () => {
            let runCalls = [];
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setTimeout(() => cb(new Error('async prepare error')), 5);
                    return { run: function() {}, finalize: function(c) { if (c) c(null); } };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepStrictEqual(resObj.body, { error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "ROLLBACK"]);
        });

        await t2.test('Finalize failure after all updates', async () => {
            let runCalls = [];
            let finalizeCalled = false;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return {
                        run: function(p, c) { if (c) c(null); },
                        finalize: function(c) { finalizeCalled = true; if (c) c(new Error('finalize failed')); }
                    };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.strictEqual(finalizeCalled, true);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "ROLLBACK"]);
        });

        await t2.test('Update failure plus finalize failure', async () => {
            let runCalls = [];
            let finalizeCalled = false;
            const resObj = await invokeHandlerMockDb({ slideOrders: [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }] }, {
                run: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    runCalls.push(sql);
                    if (cb) cb(null);
                },
                prepare: function(sql, params, cb) {
                    if (typeof params === 'function') cb = params;
                    if (cb) setImmediate(() => cb(null));
                    return {
                        run: function(p, c) { if (c) c(new Error('update failed')); },
                        finalize: function(c) { finalizeCalled = true; if (c) c(new Error('finalize failed')); }
                    };
                }
            });
            assert.strictEqual(resObj.statusCode, 500);
            assert.strictEqual(finalizeCalled, true);
            assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "ROLLBACK"]);
        });
    });

    await t.test('8. Real SQLite atomicity regression', async () => {
        function runSql(sql, params = []) {
            return new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        }

        function allSql(sql, params = []) {
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }

        await runSql("DELETE FROM slides");
        const id1 = (await runSql("INSERT INTO slides (content_type, media_type, media_path, display_order) VALUES ('test', 'image', '1.jpg', 1)")).lastID;
        const id2 = (await runSql("INSERT INTO slides (content_type, media_type, media_path, display_order) VALUES ('test', 'image', '2.jpg', 2)")).lastID;
        const id3 = (await runSql("INSERT INTO slides (content_type, media_type, media_path, display_order) VALUES ('test', 'image', '3.jpg', 3)")).lastID;

        await runSql(`
            CREATE TRIGGER abort_middle_slide
            BEFORE UPDATE ON slides
            FOR EACH ROW
            WHEN NEW.id = ${id2}
            BEGIN
                SELECT RAISE(ABORT, 'Simulated update failure');
            END;
        `);

        const http = require('node:http');
        const server = http.createServer(app);
        await new Promise(resolve => server.listen(0, resolve));
        const port = server.address().port;

        const makeRequest = (body) => new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port,
                path: '/api/slides/reorder',
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.write(JSON.stringify(body));
            req.end();
        });

        const res = await makeRequest({
            slideOrders: [
                { id: id1, display_order: 10 },
                { id: id2, display_order: 20 },
                { id: id3, display_order: 30 }
            ]
        });

        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });

        const rows = await allSql("SELECT id, display_order FROM slides ORDER BY id");
        assert.deepStrictEqual(rows, [
            { id: id1, display_order: 1 },
            { id: id2, display_order: 2 },
            { id: id3, display_order: 3 }
        ]);

        await runSql("DROP TRIGGER abort_middle_slide");

        const resSuccess = await makeRequest({
            slideOrders: [
                { id: id1, display_order: 10 },
                { id: id2, display_order: 20 },
                { id: id3, display_order: 30 }
            ]
        });

        assert.strictEqual(resSuccess.statusCode, 200);
        const newRows = await allSql("SELECT id, display_order FROM slides ORDER BY id");
        assert.deepStrictEqual(newRows, [
            { id: id1, display_order: 10 },
            { id: id2, display_order: 20 },
            { id: id3, display_order: 30 }
        ]);

        server.close();
    });
});
