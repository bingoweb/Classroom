const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-reorder-cache-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const originalDateNow = Date.now;
let mockTime = originalDateNow();
Date.now = () => mockTime;

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) return reject(err);
            resolve();
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

function createTrackedResponse() {
    let resolvePromise;
    let rejectPromise;
    
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const timeout = setTimeout(() => {
        rejectPromise(new Error('Expected exactly one response, received 0'));
    }, 50);

    const res = {
        statusCode: 200,
        responseCount: 0,
        body: null,
        promise,
        resolveTimeout: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseCount++;
            if (this.responseCount > 1) {
                clearTimeout(timeout);
                if (this.resolveTimeout) clearTimeout(this.resolveTimeout);
                rejectPromise(new Error('Multiple responses sent'));
                return this;
            }
            this.body = data;
            clearTimeout(timeout);
            // Delay resolution slightly to catch immediate double-responses
            this.resolveTimeout = setTimeout(() => {
                resolvePromise({ statusCode: this.statusCode, body: this.body, responseCount: this.responseCount });
            }, 5);
            return this;
        }
    };
    return res;
}

test('Slides Reorder Cache Tests', async (t) => {
    let originalDbAll, originalDbSerialize, originalDbPrepare, originalLoggerError;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalDbSerialize = db.serialize;
        originalDbPrepare = db.prepare;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
        if (originalDbSerialize) db.serialize = originalDbSerialize;
        if (originalDbPrepare) db.prepare = originalDbPrepare;
        if (originalLoggerError) Logger.prototype.error = originalLoggerError;
    });

    t.after(async () => {
        await closeDatabase(db);
        removeFileIfPresent(fs, testDbPath);
        removeFileIfPresent(fs, testDbPath + '-journal');
        removeFileIfPresent(fs, testDbPath + '-wal');
        removeFileIfPresent(fs, testDbPath + '-shm');
        removeDirectoryIfPresent(fs, tempDir);
        
        global.setInterval = originalSetInterval;
        Date.now = originalDateNow;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    const getActiveRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides/active' && layer.route.methods.get
    );

    const reorderSlidesRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides/reorder' && layer.route.methods.put
    );

    const activeHandler = getActiveRoutes[0].route.stack[getActiveRoutes[0].route.stack.length - 1].handle;
    const reorderHandler = reorderSlidesRoutes[0].route.stack[reorderSlidesRoutes[0].route.stack.length - 1].handle;

    await t.test('A. Actual route discovery', () => {
        assert.strictEqual(getActiveRoutes.length, 1, 'Exactly one GET /api/slides/active route must exist');
        assert.strictEqual(reorderSlidesRoutes.length, 1, 'Exactly one PUT /api/slides/reorder route must exist');
        assert.strictEqual(typeof activeHandler, 'function', 'Active handler must be a function');
        assert.strictEqual(typeof reorderHandler, 'function', 'Reorder handler must be a function');

        // Verify reorder is registered before /api/slides/:id
        const slideIdRoutes = app._router.stack.filter(
            layer => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.put
        );
        const reorderIndex = app._router.stack.findIndex(layer => layer.route && layer.route.path === '/api/slides/reorder' && layer.route.methods.put);
        const slideIdIndex = app._router.stack.findIndex(layer => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.put);
        assert.ok(reorderIndex < slideIdIndex, 'Reorder route must be registered before /api/slides/:id');
    });

    await t.test('Helper self-regression: double response', async () => {
        const handler = (req, res) => {
            res.status(200).json({ first: true });
            res.json({ second: true });
        };
        const res = createTrackedResponse();
        handler({}, res);
        await assert.rejects(res.promise, /Multiple responses sent/);
    });

    await t.test('Helper self-regression: zero response', async () => {
        const handler = (req, res) => {};
        const res = createTrackedResponse();
        handler({}, res);
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
    });

    await t.test('B. Successful reorder invalidates a populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        let activeSlidesRow = [
            { id: 1, title: 'Birinci slayt', media_path: null, display_order: 1 },
            { id: 2, title: 'İkinci slayt', media_path: null, display_order: 2 }
        ];

        db.all = function(sql, params, cb) {
            let actualCb = cb || params;
            if (sql.includes('slides')) {
                dbAllCount++;
                actualCb(null, activeSlidesRow);
            } else {
                actualCb(null, []);
            }
        };

        const getRes1 = createTrackedResponse();
        activeHandler({ requestId: 'req-1' }, getRes1);
        const getResult1 = await getRes1.promise;
        assert.strictEqual(getResult1.statusCode, 200);
        assert.deepStrictEqual(getResult1.body, activeSlidesRow);
        assert.strictEqual(getResult1.responseCount, 1);
        assert.strictEqual(dbAllCount, 1);

        let serializeCount = 0;
        let prepareCount = 0;
        let finalizeCount = 0;
        let capturedSql = null;
        const capturedParams = [];
        const capturedCallbacks = [];
        let runCalls = [];

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') cb = params;
            runCalls.push(sql);
            if (cb) {
                if (sql === "COMMIT") setTimeout(() => cb(null), 5);
                else cb(null);
            }
        };

        db.serialize = function(cb) {
            serializeCount++;
            cb();
        };

        db.prepare = function(sql) {
            prepareCount++;
            capturedSql = sql;
            return {
                run: function(params, cb) {
                    capturedParams.push(params);
                    capturedCallbacks.push(cb);
                },
                finalize: function() {
                    finalizeCount++;
                }
            };
        };

        const reorderReq = {
            body: {
                slideOrders: [
                    { id: 2, display_order: 1 },
                    { id: 1, display_order: 2 }
                ]
            },
            requestId: 'reorder-cache-success'
        };

        const reorderRes = createTrackedResponse();
        reorderHandler(reorderReq, reorderRes);

        assert.strictEqual(reorderRes.responseCount, 0);
        assert.strictEqual(finalizeCount, 0);
        assert.strictEqual(capturedCallbacks.length, 1);

        // Execute first item callback
        capturedCallbacks[0](null);

        assert.strictEqual(reorderRes.responseCount, 0);
        assert.strictEqual(finalizeCount, 0);

        // Call GET /api/slides/active at intermediate point
        const getResInter = createTrackedResponse();
        activeHandler({ requestId: 'req-inter' }, getResInter);
        const getResultInter = await getResInter.promise;
        
        assert.strictEqual(dbAllCount, 1, 'Cache should still be used');
        assert.deepStrictEqual(getResultInter.body, activeSlidesRow);

        // Execute second item callback
        capturedCallbacks[1](null);

        const result = await reorderRes.promise;

        assert.strictEqual(serializeCount, 1);
        assert.strictEqual(prepareCount, 1);
        assert.strictEqual(capturedSql, 'UPDATE slides SET display_order = ? WHERE id = ?');
        assert.deepStrictEqual(capturedParams, [
            [1, 2],
            [2, 1]
        ]);
        assert.strictEqual(finalizeCount, 1);
        assert.strictEqual(result.statusCode, 200);
        assert.deepStrictEqual(result.body, { message: 'Sıralama başarıyla güncellendi' });
        assert.strictEqual(result.responseCount, 1);
        assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "COMMIT"]);

        // Immediately after success
        activeSlidesRow = [
            { id: 2, title: 'İkinci slayt', media_path: null, display_order: 1 },
            { id: 1, title: 'Birinci slayt', media_path: null, display_order: 2 }
        ];

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-3' }, getRes2);
        const getResult2 = await getRes2.promise;
        
        assert.strictEqual(dbAllCount, 2);
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
        assert.strictEqual(getResult2.responseCount, 1);
    });

    await t.test('C. One statement error must preserve the populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 1, title: 'Birinci slayt', media_path: null, display_order: 1 },
            { id: 2, title: 'İkinci slayt', media_path: null, display_order: 2 }
        ];

        db.all = function(sql, params, cb) {
            let actualCb = cb || params;
            dbAllCount++;
            actualCb(null, activeSlidesRow);
        };

        const getRes1 = createTrackedResponse();
        activeHandler({ requestId: 'req-4' }, getRes1);
        const getResult1 = await getRes1.promise;
        assert.strictEqual(dbAllCount, 1);

        let finalizeCount = 0;
        let capturedSql = null;
        const capturedParams = [];
        const capturedCallbacks = [];
        let runCalls = [];

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') cb = params;
            runCalls.push(sql);
            if (cb) cb(null);
        };

        db.serialize = function(cb) { cb(); };

        db.prepare = function(sql) {
            capturedSql = sql;
            return {
                run: function(params, cb) {
                    capturedParams.push(params);
                    capturedCallbacks.push(cb);
                },
                finalize: function() {
                    finalizeCount++;
                }
            };
        };

        let loggedComponent, loggedMessage, loggedError, loggedContext;
        Logger.prototype.error = function(component, message, err, context) {
            loggedComponent = component;
            loggedMessage = message;
            loggedError = err;
            loggedContext = context;
        };

        const reorderReq = {
            body: {
                slideOrders: [
                    { id: 2, display_order: 1 },
                    { id: 1, display_order: 2 }
                ]
            },
            requestId: 'reorder-cache-failure'
        };

        const reorderRes = createTrackedResponse();
        reorderHandler(reorderReq, reorderRes);

        const reorderError = new Error('second reorder update failed');
        assert.strictEqual(capturedCallbacks.length, 1);
        capturedCallbacks[0](null);
        
        assert.strictEqual(reorderRes.responseCount, 0);
        assert.strictEqual(capturedCallbacks.length, 2);

        capturedCallbacks[1](reorderError);

        const result = await reorderRes.promise;

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(finalizeCount, 1);
        assert.strictEqual(capturedCallbacks.length, 2);
        assert.strictEqual(capturedSql, 'UPDATE slides SET display_order = ? WHERE id = ?');
        assert.deepStrictEqual(capturedParams, [ [1, 2], [2, 1] ]);
        assert.deepStrictEqual(runCalls, ["BEGIN IMMEDIATE TRANSACTION", "ROLLBACK"]);

        assert.strictEqual(loggedComponent, COMPONENTS.API);
        assert.strictEqual(loggedMessage, 'Error updating slide order');
        assert.strictEqual(loggedError, reorderError);
        assert.deepStrictEqual(loggedContext, {
            slideId: 1,
            displayOrder: 2,
            requestId: 'reorder-cache-failure'
        });

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-6' }, getRes2);
        const getResult2 = await getRes2.promise;
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
    });

    await t.test('D. Invalid request must preserve the populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 1, title: 'Birinci slayt', media_path: null, display_order: 1 }
        ];

        db.all = function(sql, params, cb) {
            let actualCb = cb || params;
            dbAllCount++;
            actualCb(null, activeSlidesRow);
        };

        const getRes1 = createTrackedResponse();
        activeHandler({ requestId: 'req-7' }, getRes1);
        const getResult1 = await getRes1.promise;
        assert.strictEqual(dbAllCount, 1);

        let serializeCalled = false;
        let prepareCalled = false;

        db.serialize = function(cb) { serializeCalled = true; cb(); };
        db.prepare = function(sql) { prepareCalled = true; return {}; };

        const reorderReq = {
            body: {
                slideOrders: []
            },
            requestId: 'reorder-cache-invalid'
        };

        const reorderRes = createTrackedResponse();
        reorderHandler(reorderReq, reorderRes);
        const result = await reorderRes.promise;

        assert.strictEqual(result.statusCode, 400);
        assert.deepStrictEqual(result.body, { error: 'Geçersiz sıralama verisi' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(serializeCalled, false);
        assert.strictEqual(prepareCalled, false);

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-9' }, getRes2);
        const getResult2 = await getRes2.promise;
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
    });
});
