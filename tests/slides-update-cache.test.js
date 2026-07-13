const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-update-cache-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const originalDateNow = Date.now;
let mockTime = originalDateNow();
Date.now = () => mockTime;

const app = require('../backend/server.js');
const db = require('../backend/database.js');

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

test('Slides Update Cache Tests', async (t) => {
    let originalDbAll, originalDbGet, originalDbRun, originalFsUnlinkSync, originalFsExistsSync;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsUnlinkSync = fs.unlinkSync;
        originalFsExistsSync = fs.existsSync;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
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

    const putSlidesRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.put
    );

    await t.test('A. Actual route discovery', () => {
        assert.strictEqual(getActiveRoutes.length, 1, 'Exactly one GET /api/slides/active route must exist');
        assert.strictEqual(putSlidesRoutes.length, 1, 'Exactly one PUT /api/slides/:id route must exist');
        
        const putRoute = putSlidesRoutes[0].route;
        assert.ok(putRoute.stack.length >= 2, 'PUT route must include at least Multer layer and final handler');
    });

    const activeHandler = getActiveRoutes[0].route.stack[0].handle;
    const putHandler = putSlidesRoutes[0].route.stack[putSlidesRoutes[0].route.stack.length - 1].handle;

    await t.test('B. Exactly-one-response helper', () => {
        const res = createMockRes();
        assert.strictEqual(res.responseCount, 0);

        res.status(200).json({ success: true });
        assert.strictEqual(res.responseCount, 1);
        assert.throws(() => res.json({ success: false }), /Multiple responses sent/);
    });

    await t.test('C. Successful update invalidates a populated cache', async (t) => {
        mockTime += 5 * 60 * 1000 + 1000; // Advance clock to clear any previous state
        
        let dbAllCount = 0;
        let activeSlidesRow = [
            { id: 47, title: 'Eski başlık', media_path: '/uploads/slides/old.png' }
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
        assert.deepStrictEqual(getRes1.body, [{ id: 47, title: 'Eski başlık', media_path: '/uploads/slides/old.png' }]);
        assert.strictEqual(getRes1.responseCount, 1);
        assert.strictEqual(dbAllCount, 1);

        let capturedLookupSql = null;
        let capturedLookupParams = null;
        let capturedUpdateSql = null;
        let capturedUpdateParams = null;
        let fsUnlinkSyncCount = 0;

        db.get = function(sql, params, cb) {
            capturedLookupSql = sql;
            capturedLookupParams = params;
            cb(null, { media_path: '/uploads/slides/old.png' });
        };

        db.run = function(sql, params, cb) {
            capturedUpdateSql = sql;
            capturedUpdateParams = params;
            this.changes = 1;
            cb.call(this, null);
        };

        fs.unlinkSync = () => { fsUnlinkSyncCount++; };

        const putReq = {
            params: { id: '47' },
            body: { title: 'Yeni başlık' },
            file: undefined,
            requestId: 'req-2'
        };

        const putRes = createMockRes();
        putHandler(putReq, putRes);

        assert.strictEqual(capturedLookupSql, 'SELECT media_path FROM slides WHERE id = ?');
        assert.deepStrictEqual(capturedLookupParams, [47]);
        assert.strictEqual(capturedUpdateSql, 'UPDATE slides SET title = ? WHERE id = ?');
        assert.deepStrictEqual(capturedUpdateParams, ['Yeni başlık', 47]);
        
        assert.strictEqual(putRes.statusCode, 200);
        assert.deepStrictEqual(putRes.body, { message: 'Slayt başarıyla güncellendi', changes: 1 });
        assert.strictEqual(putRes.responseCount, 1);
        assert.strictEqual(fsUnlinkSyncCount, 0);

        activeSlidesRow = [
            { id: 47, title: 'Yeni başlık', media_path: '/uploads/slides/old.png' }
        ];

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-3' }, getRes2);
        
        assert.strictEqual(dbAllCount, 2);
        assert.strictEqual(getRes2.statusCode, 200);
        assert.deepStrictEqual(getRes2.body, [{ id: 47, title: 'Yeni başlık', media_path: '/uploads/slides/old.png' }]);
        assert.strictEqual(getRes2.responseCount, 1);
    });

    await t.test('D. Update failure must preserve the existing populated cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        const activeSlidesRow = [
            { id: 47, title: 'Old title', media_path: '/uploads/slides/old.png' }
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
            cb(null, { media_path: '/uploads/slides/old.png' });
        };

        db.run = function(sql, params, cb) {
            cb.call(this, new Error('Update error'));
        };

        const putReq = {
            params: { id: '47' },
            body: { title: 'New title' },
            file: undefined,
            requestId: 'req-5'
        };

        const putRes = createMockRes();
        putHandler(putReq, putRes);

        assert.strictEqual(putRes.statusCode, 500);
        assert.deepStrictEqual(putRes.body, { error: 'Slayt güncellenirken hata oluştu' });
        assert.strictEqual(putRes.responseCount, 1);

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-6' }, getRes2);
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getRes2.body, activeSlidesRow);
    });

    await t.test('E. No-update-fields path must not invalidate cache', async () => {
        mockTime += 5 * 60 * 1000 + 1000;
        
        let dbAllCount = 0;
        let dbRunCount = 0;
        const activeSlidesRow = [
            { id: 47, title: 'Old title 2', media_path: '/uploads/slides/old2.png' }
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
            cb(null, { media_path: '/uploads/slides/old2.png' });
        };

        db.run = function(sql, params, cb) {
            dbRunCount++;
            cb.call(this, null);
        };

        const putReq = {
            params: { id: '47' },
            body: {},
            file: undefined,
            requestId: 'req-8'
        };

        const putRes = createMockRes();
        putHandler(putReq, putRes);

        assert.strictEqual(putRes.statusCode, 400);
        assert.deepStrictEqual(putRes.body, { error: 'Güncellenecek alan belirtilmedi' });
        assert.strictEqual(putRes.responseCount, 1);
        assert.strictEqual(dbRunCount, 0);

        const getRes2 = createMockRes();
        activeHandler({ requestId: 'req-9' }, getRes2);
        
        assert.strictEqual(dbAllCount, 1);
        assert.deepStrictEqual(getRes2.body, activeSlidesRow);
    });
});
