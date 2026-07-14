const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-delete-cache-test-'));
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

function createTrackedResponse({ timeoutMs = 1000, observationMs = 15 } = {}) {
    let resolvePromise;
    let rejectPromise;
    let settled = false;

    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const res = {
        statusCode: 200,
        responseCount: 0,
        body: null,
        promise,
        resolveTimeout: null,
        noResponseTimeout: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseCount++;
            if (settled) return this;

            if (this.responseCount > 1) {
                settled = true;
                if (this.noResponseTimeout) clearTimeout(this.noResponseTimeout);
                if (this.resolveTimeout) clearTimeout(this.resolveTimeout);
                rejectPromise(new Error('Multiple responses sent'));
                return this;
            }

            this.body = data;
            if (this.noResponseTimeout) clearTimeout(this.noResponseTimeout);

            this.resolveTimeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolvePromise({ statusCode: this.statusCode, body: this.body, responseCount: this.responseCount });
            }, observationMs);

            return this;
        }
    };

    res.noResponseTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (res.resolveTimeout) clearTimeout(res.resolveTimeout);
        rejectPromise(new Error('Expected exactly one response, received 0'));
    }, timeoutMs);

    return res;
}

test('Slides Delete Cache Tests (Atomic)', async (t) => {
    let originalDbAll, originalDbGet, originalDbRun, originalFsUnlinkSync, originalFsExistsSync, originalLoggerError;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsUnlinkSync = fs.unlinkSync;
        originalFsExistsSync = fs.existsSync;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
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
    const deleteSlidesRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.delete
    );

    const activeHandler = getActiveRoutes[0].route.stack[getActiveRoutes[0].route.stack.length - 1].handle;
    const deleteHandler = deleteSlidesRoutes[0].route.stack[deleteSlidesRoutes[0].route.stack.length - 1].handle;

    await t.test('C. Successful deletion invalidates a populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;

        let dbAllCount = 0;
        let activeSlidesRow = [
            { id: 47, title: 'Silinecek slayt', media_path: '/uploads/slides/delete-me.png', display_order: 1 },
            { id: 48, title: 'Kalacak slayt', media_path: '/uploads/slides/keep.png', display_order: 2 }
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

        let capturedLookupSql = null;
        let capturedLookupParams = null;
        let capturedDeleteSql = null;
        let capturedDeleteParams = null;
        let fsUnlinkSyncCount = 0;
        let fsExistsSyncCount = 0;

        db.get = function(sql, params, cb) {
            capturedLookupSql = sql;
            capturedLookupParams = params;
            cb(null, { media_path: null, display_order: 1 });
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            if (sql.includes('DELETE')) {
                capturedDeleteSql = sql;
                capturedDeleteParams = params;
                this.changes = 1;
            }
            actualCb.call(this, null);
        };

        fs.unlinkSync = () => { fsUnlinkSyncCount++; };
        fs.existsSync = () => { fsExistsSyncCount++; return true; };

        const delReq = { params: { id: '47' }, requestId: 'delete-cache-success' };
        const delRes = createTrackedResponse();
        deleteHandler(delReq, delRes);

        const result = await delRes.promise;

        assert.strictEqual(result.statusCode, 200);
        assert.deepStrictEqual(result.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(fsUnlinkSyncCount, 0);
        assert.strictEqual(fsExistsSyncCount, 0);

        activeSlidesRow = [
            { id: 48, title: 'Kalacak slayt', media_path: '/uploads/slides/keep.png', display_order: 1 }
        ];

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-3' }, getRes2);
        const getResult2 = await getRes2.promise;

        assert.strictEqual(dbAllCount, 2);
        assert.deepStrictEqual(getResult2.body, [{ id: 48, title: 'Kalacak slayt', media_path: '/uploads/slides/keep.png', display_order: 1 }]);
        assert.strictEqual(getResult2.responseCount, 1);
    });

    await t.test('D. Primary DELETE failure must preserve the populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;

        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 47, title: 'Slide 1', media_path: '/uploads/slides/1.png', display_order: 1 }
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

        db.get = function(sql, params, cb) {
            cb(null, { media_path: '/uploads/slides/1.png', display_order: 1 });
        };

        let fsUnlinkSyncCount = 0;
        let fsExistsSyncCount = 0;

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            if (sql.includes('DELETE')) {
                actualCb.call(this, new Error('slide delete failed'));
            } else {
                actualCb.call(this, null);
            }
        };

        fs.unlinkSync = () => { fsUnlinkSyncCount++; };
        fs.existsSync = () => { fsExistsSyncCount++; return true; };

        const delReq = { params: { id: '47' }, requestId: 'req-5' };
        const delRes = createTrackedResponse();
        deleteHandler(delReq, delRes);
        const result = await delRes.promise;

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'slide delete failed' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(fsUnlinkSyncCount, 0);
        assert.strictEqual(fsExistsSyncCount, 0);

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-6' }, getRes2);
        const getResult2 = await getRes2.promise;

        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
    });

    await t.test('E. Missing-slide path must preserve the populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;

        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 47, title: 'Slide 1', media_path: '/uploads/slides/1.png', display_order: 1 }
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

        db.get = function(sql, params, cb) {
            cb(null, undefined);
        };

        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            actualCb.call(this, null);
        };

        let fsUnlinkSyncCount = 0;
        let fsExistsSyncCount = 0;
        fs.unlinkSync = () => { fsUnlinkSyncCount++; };
        fs.existsSync = () => { fsExistsSyncCount++; return true; };

        const delReq = { params: { id: '47' }, requestId: 'req-8' };
        const delRes = createTrackedResponse();
        deleteHandler(delReq, delRes);
        const result = await delRes.promise;

        assert.strictEqual(result.statusCode, 404);
        assert.deepStrictEqual(result.body, { error: 'Slayt bulunamadı' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(fsUnlinkSyncCount, 0);
        assert.strictEqual(fsExistsSyncCount, 0);

        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-9' }, getRes2);
        const getResult2 = await getRes2.promise;

        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
    });

    await t.test('F. Compaction error causes rollback and preserves the cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;

        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 47, title: 'Silinecek slayt', media_path: '/uploads/slides/delete-me.png', display_order: 1 }
        ];

        db.all = function(sql, params, cb) {
            let actualCb = cb || params;
            dbAllCount++;
            actualCb(null, activeSlidesRow);
        };

        const getRes1 = createTrackedResponse();
        activeHandler({ requestId: 'req-10' }, getRes1);
        const getResult1 = await getRes1.promise;
        assert.strictEqual(dbAllCount, 1);

        db.get = function(sql, params, cb) {
            cb(null, { media_path: null, display_order: 1 });
        };

        let rollbackCalled = false;
        db.run = function(sql, params, cb) {
            const actualCb = typeof params === 'function' ? params : cb;
            if (sql.includes('UPDATE')) {
                actualCb.call(this, new Error('compaction failed completely'));
            } else if (sql === 'ROLLBACK') {
                rollbackCalled = true;
                actualCb.call(this, null);
            } else {
                actualCb.call(this, null);
            }
        };

        const delReq = { params: { id: '47' }, requestId: 'req-11' };
        const delRes = createTrackedResponse();
        deleteHandler(delReq, delRes);

        const result = await delRes.promise;

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'compaction failed completely' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(rollbackCalled, true);

        // Active cache should NOT be invalidated because COMMIT didn't run.
        const getRes2 = createTrackedResponse();
        activeHandler({ requestId: 'req-12' }, getRes2);
        const getResult2 = await getRes2.promise;

        // Since cache is not invalidated, dbAllCount should remain 1, getting the cached response!
        assert.strictEqual(dbAllCount, 1, 'Should return cached result, not querying db again');
        assert.deepStrictEqual(getResult2.body, activeSlidesRow);
        assert.strictEqual(getResult2.responseCount, 1);
    });
});
