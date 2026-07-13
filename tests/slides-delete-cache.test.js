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
            if (this.responseCount > 1) throw new Error('Multiple responses sent');
            this.body = data;
            return this;
        }
    };
    return res;
}

test('Slides Delete Cache Tests', async (t) => {
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

    await t.test('A. Actual route discovery', () => {
        assert.strictEqual(getActiveRoutes.length, 1, 'Exactly one GET /api/slides/active route must exist');
        assert.strictEqual(deleteSlidesRoutes.length, 1, 'Exactly one DELETE /api/slides/:id route must exist');
    });

    const activeHandler = getActiveRoutes[0].route.stack[getActiveRoutes[0].route.stack.length - 1].handle;
    const deleteHandler = deleteSlidesRoutes[0].route.stack[deleteSlidesRoutes[0].route.stack.length - 1].handle;

    await t.test('B. Exactly-one-response helper', () => {
        const res = createMockRes();
        assert.strictEqual(res.responseCount, 0);

        res.status(200).json({ success: true });
        assert.strictEqual(res.responseCount, 1);
        assert.throws(() => res.json({ success: false }), /Multiple responses sent/);
    });

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

        const getRes1 = createMockRes();
        activeHandler({ requestId: 'req-1' }, getRes1);
        assert.strictEqual(getRes1.statusCode, 200);
        assert.deepStrictEqual(getRes1.body, activeSlidesRow);
        assert.strictEqual(getRes1.responseCount, 1);
        assert.strictEqual(dbAllCount, 1);

        let capturedLookupSql = null;
        let capturedLookupParams = null;
        let capturedDeleteSql = null;
        let capturedDeleteParams = null;
        let capturedCompactionSql = null;
        let capturedCompactionParams = null;
        let fsUnlinkSyncCount = 0;
        let fsExistsSyncCount = 0;

        db.get = function(sql, params, cb) {
            capturedLookupSql = sql;
            capturedLookupParams = params;
            cb(null, { media_path: null, display_order: 1 });
        };

        db.run = function(sql, params, cb) {
            if (sql.includes('DELETE')) {
                capturedDeleteSql = sql;
                capturedDeleteParams = params;
                this.changes = 1;
                cb.call(this, null);
            } else if (sql.includes('UPDATE')) {
                capturedCompactionSql = sql;
                capturedCompactionParams = params;
                cb.call(this, null);
            } else {
                cb.call(this, null);
            }
        };

        fs.unlinkSync = () => { fsUnlinkSyncCount++; };
        fs.existsSync = () => { fsExistsSyncCount++; return true; };

        const delReq = {
            params: { id: '47' },
            requestId: 'delete-cache-success'
        };

        const delRes = createMockRes();
        deleteHandler(delReq, delRes);

        assert.strictEqual(capturedLookupSql, 'SELECT media_path, display_order FROM slides WHERE id = ?');
        assert.deepStrictEqual(capturedLookupParams, [47]);
        assert.strictEqual(capturedDeleteSql, 'DELETE FROM slides WHERE id = ?');
        assert.deepStrictEqual(capturedDeleteParams, [47]);
        assert.strictEqual(capturedCompactionSql, 'UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?');
        assert.deepStrictEqual(capturedCompactionParams, [1]);
        
        assert.strictEqual(delRes.statusCode, 200);
        assert.deepStrictEqual(delRes.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.strictEqual(delRes.responseCount, 1);
        assert.strictEqual(fsUnlinkSyncCount, 0); // No media deletion because media_path is null

        activeSlidesRow = [
            { id: 48, title: 'Kalacak slayt', media_path: '/uploads/slides/keep.png', display_order: 1 }
        ];

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-3' }, getRes2);
        
        assert.strictEqual(dbAllCount, 2);
        assert.strictEqual(getRes2.statusCode, 200);
        assert.deepStrictEqual(getRes2.body, [{ id: 48, title: 'Kalacak slayt', media_path: '/uploads/slides/keep.png', display_order: 1 }]);
        assert.strictEqual(getRes2.responseCount, 1);
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

        const getRes1 = createMockRes();
        activeHandler({ requestId: 'req-4' }, getRes1);
        assert.strictEqual(dbAllCount, 1);

        db.get = function(sql, params, cb) {
            cb(null, { media_path: '/uploads/slides/1.png', display_order: 1 });
        };

        let dbRunCount = 0;
        let fsUnlinkSyncCount = 0;

        db.run = function(sql, params, cb) {
            dbRunCount++;
            if (sql.includes('DELETE')) {
                cb.call(this, new Error('slide delete failed'));
            } else {
                cb.call(this, null);
            }
        };

        fs.unlinkSync = () => { fsUnlinkSyncCount++; };

        const delReq = {
            params: { id: '47' },
            requestId: 'req-5'
        };

        const delRes = createMockRes();
        deleteHandler(delReq, delRes);

        assert.strictEqual(delRes.statusCode, 500);
        assert.deepStrictEqual(delRes.body, { error: 'slide delete failed' });
        assert.strictEqual(delRes.responseCount, 1);
        assert.strictEqual(dbRunCount, 1); // Only DELETE ran, no compaction
        assert.strictEqual(fsUnlinkSyncCount, 0); // No file cleanup on failure

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-6' }, getRes2);
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getRes2.body, activeSlidesRow);
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

        const getRes1 = createMockRes();
        activeHandler({ requestId: 'req-7' }, getRes1);
        assert.strictEqual(dbAllCount, 1);

        db.get = function(sql, params, cb) {
            cb(null, undefined);
        };

        let dbRunCount = 0;
        db.run = function(sql, params, cb) {
            dbRunCount++;
            cb.call(this, null);
        };

        const delReq = {
            params: { id: '47' },
            requestId: 'req-8'
        };

        const delRes = createMockRes();
        deleteHandler(delReq, delRes);

        assert.strictEqual(delRes.statusCode, 404);
        assert.deepStrictEqual(delRes.body, { error: 'Slayt bulunamadı' });
        assert.strictEqual(delRes.responseCount, 1);
        assert.strictEqual(dbRunCount, 0);

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-9' }, getRes2);
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getRes2.body, activeSlidesRow);
    });

    await t.test('F. Compaction error after successful deletion must still invalidate cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        let activeSlidesRow = [
            { id: 47, title: 'Silinecek slayt', media_path: '/uploads/slides/delete-me.png', display_order: 1 }
        ];

        db.all = function(sql, params, cb) {
            let actualCb = cb || params;
            dbAllCount++;
            actualCb(null, activeSlidesRow);
        };

        const getRes1 = createMockRes();
        activeHandler({ requestId: 'req-10' }, getRes1);
        assert.strictEqual(dbAllCount, 1);

        Logger.prototype.error = function() {}; // Silence the error for this test

        db.get = function(sql, params, cb) {
            cb(null, { media_path: null, display_order: 1 });
        };

        db.run = function(sql, params, cb) {
            if (sql.includes('DELETE')) {
                this.changes = 1;
                cb.call(this, null);
            } else if (sql.includes('UPDATE')) {
                cb.call(this, new Error('Compaction error'));
            } else {
                cb.call(this, null);
            }
        };

        const delReq = {
            params: { id: '47' },
            requestId: 'req-11'
        };

        const delRes = createMockRes();
        deleteHandler(delReq, delRes);

        assert.strictEqual(delRes.statusCode, 200);
        assert.deepStrictEqual(delRes.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.strictEqual(delRes.responseCount, 1);

        // Active cache should be invalidated
        activeSlidesRow = [];
        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-12' }, getRes2);
        
        assert.strictEqual(dbAllCount, 2);
        assert.deepStrictEqual(getRes2.body, []);
        assert.strictEqual(getRes2.responseCount, 1);
    });
});
