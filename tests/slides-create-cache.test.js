const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-create-cache-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

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

test('Slides Create Cache Invalidation Tests', async (t) => {
    let originalDbAll, originalDbGet, originalDbRun, originalFsUnlinkSync, originalFsExistsSync, originalDateNow;
    let timeOffset = 0;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsUnlinkSync = fs.unlinkSync;
        originalFsExistsSync = fs.existsSync;
        originalDateNow = Date.now;
        timeOffset = 0;
        Date.now = () => originalDateNow() + timeOffset;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
        if (originalDateNow) Date.now = originalDateNow;
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

    // Extract routes
    const postSlidesRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides' && layer.route.methods.post
    );
    const getActiveRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/slides/active' && layer.route.methods.get
    );

    await t.test('1. Actual registered route discovery', () => {
        assert.strictEqual(postSlidesRoutes.length, 1, 'Exactly one POST /api/slides route must exist');
        assert.strictEqual(getActiveRoutes.length, 1, 'Exactly one GET /api/slides/active route must exist');

        const postRouteLayer = postSlidesRoutes[0];
        const middlewares = postRouteLayer.route.stack;
        
        // Prove Multer and final handler are separate layers
        assert.ok(middlewares.length >= 2, 'POST /api/slides should have at least 2 layers');
        assert.notStrictEqual(middlewares[0].handle, middlewares[middlewares.length - 1].handle);
    });

    const getActiveHandler = getActiveRoutes[0].route.stack[getActiveRoutes[0].route.stack.length - 1].handle;
    const postHandler = postSlidesRoutes[0].route.stack[postSlidesRoutes[0].route.stack.length - 1].handle;

    await t.test('2. Response-count helper self-regression', () => {
        const res1 = createMockRes();
        assert.strictEqual(res1.responseCount, 0);

        const res2 = createMockRes();
        res2.status(200).json({ ok: true });
        assert.strictEqual(res2.responseCount, 1);
        assert.throws(() => res2.json({ second: true }), /Multiple responses sent/);
    });

    await t.test('3. Failing-before-fix cache regression', async () => {
        // A. Prime the active-slides cache
        let dbAllCount = 0;
        let dbGetCount = 0;
        let dbRunCount = 0;
        let unlinkSyncCount = 0;
        let lastRunParams = null;
        let lastRunSql = null;
        
        let currentDbAllRows = [
            { id: 1, title: 'Eski slayt', media_path: '/uploads/slides/old.png' }
        ];

        db.all = (sql, params, cb) => {
            dbAllCount++;
            assert.ok(sql.includes('is_active = 1'));
            assert.ok(sql.includes('ORDER BY display_order ASC'));
            if (typeof params === 'function') {
                params(null, currentDbAllRows);
            } else {
                cb(null, currentDbAllRows);
            }
        };

        const req1 = { query: {} };
        const res1 = createMockRes();
        await new Promise((resolve) => {
            // Because handler might be async/callback
            const originalJson = res1.json.bind(res1);
            res1.json = (data) => {
                originalJson(data);
                resolve();
            };
            getActiveHandler(req1, res1);
        });

        assert.strictEqual(res1.statusCode, 200);
        assert.deepStrictEqual(res1.body, [{ id: 1, title: 'Eski slayt', media_path: '/uploads/slides/old.png' }]);
        assert.strictEqual(res1.responseCount, 1);
        assert.strictEqual(dbAllCount, 1);

        // B. Invoke the POST final handler
        const req2 = {
            body: {
                title: 'Yeni slayt',
                content_type: 'announcement',
                media_type: 'image',
                text_content: 'Yeni duyuru',
                display_duration: '8',
                video_auto_advance: 'true',
                transition_type: 'fade',
                transition_duration: '1',
                transition_mode: 'auto',
                expires_at: '2030-01-01T00:00:00.000Z'
            },
            file: {
                path: '/tmp/classroom-slide-create-cache-test.png',
                originalname: 'duyuru.png',
                mimetype: 'image/png'
            }
        };
        const res2 = createMockRes();

        db.get = (sql, params, cb) => {
            dbGetCount++;
            assert.strictEqual(sql, 'SELECT MAX(display_order) as max_order FROM slides');
            if (typeof params === 'function') {
                params(null, { max_order: 4 });
            } else {
                cb(null, { max_order: 4 });
            }
        };

        db.run = function(sql, params, cb) {
            dbRunCount++;
            lastRunSql = sql;
            lastRunParams = params;
            this.lastID = 55;
            if (typeof params === 'function') {
                params.call(this, null);
            } else {
                cb.call(this, null);
            }
        };

        fs.unlinkSync = (path) => {
            unlinkSyncCount++;
        };

        await new Promise((resolve) => {
            const originalJson = res2.json.bind(res2);
            res2.json = (data) => {
                originalJson(data);
                resolve();
            };
            postHandler(req2, res2);
        });

        assert.strictEqual(dbGetCount, 1);
        assert.strictEqual(dbRunCount, 1);
        assert.strictEqual(lastRunSql, 'INSERT INTO slides (title, content_type, media_type, media_path, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode, display_order, expires_at, is_poster) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        assert.deepStrictEqual(lastRunParams, [
            'Yeni slayt',
            'announcement',
            'image',
            '/tmp/classroom-slide-create-cache-test.png',
            'Yeni duyuru',
            8000,
            1,
            'fade',
            1000,
            'auto',
            5,
            '2030-01-01T00:00:00.000Z',
            0
        ]);
        assert.strictEqual(res2.statusCode, 200);
        assert.deepStrictEqual(res2.body, { id: 55, message: 'Slayt başarıyla oluşturuldu' });
        assert.strictEqual(res2.responseCount, 1);
        assert.strictEqual(unlinkSyncCount, 0);

        // C. Prove that the cache was invalidated
        currentDbAllRows = [
            { id: 1, title: 'Eski slayt', media_path: '/uploads/slides/old.png' },
            { id: 55, title: 'Yeni slayt', media_path: '/tmp/classroom-slide-create-cache-test.png' }
        ];

        const req3 = { query: {} };
        const res3 = createMockRes();
        await new Promise((resolve) => {
            const originalJson = res3.json.bind(res3);
            res3.json = (data) => {
                originalJson(data);
                resolve();
            };
            getActiveHandler(req3, res3);
        });

        assert.strictEqual(res3.statusCode, 200);
        assert.deepStrictEqual(res3.body, currentDbAllRows);
        assert.strictEqual(res3.responseCount, 1);
        assert.strictEqual(dbAllCount, 2); // Proof it queried the DB again and bypassed cache
    });

    await t.test('4. Mandatory validation-preservation regression', async () => {
        let dbGetCount = 0;
        let dbRunCount = 0;
        let unlinkSyncCount = 0;
        let unlinkedPath = null;

        db.get = () => { dbGetCount++; };
        db.run = () => { dbRunCount++; };
        fs.existsSync = (path) => { return true; };
        fs.unlinkSync = (path) => {
            unlinkSyncCount++;
            unlinkedPath = path;
        };

        const req = {
            body: {},
            file: {
                path: '/tmp/rejected-slide-create.png',
                originalname: 'rejected.png',
                mimetype: 'image/png'
            }
        };
        const res = createMockRes();

        await new Promise((resolve) => {
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                originalJson(data);
                resolve();
            };
            postHandler(req, res);
        });

        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'İçerik tipi gereklidir' });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(dbGetCount, 0);
        assert.strictEqual(dbRunCount, 0);
        assert.strictEqual(unlinkSyncCount, 1);
        assert.strictEqual(unlinkedPath, req.file.path);
    });

    await t.test('5. Mandatory INSERT-error preservation regression', async () => {
        timeOffset += 10 * 60 * 1000; // Fast forward 10 mins to clear previous cache
        // Prime cache
        let dbAllCount = 0;
        let unlinkSyncCount = 0;
        let unlinkedPath = null;
        
        let currentDbAllRows = [
            { id: 1, title: 'Eski slayt', media_path: '/uploads/slides/old.png' }
        ];

        db.all = (sql, params, cb) => {
            dbAllCount++;
            if (typeof params === 'function') {
                params(null, currentDbAllRows);
            } else {
                cb(null, currentDbAllRows);
            }
        };

        const req1 = { query: {} };
        const res1 = createMockRes();
        await new Promise((resolve) => {
            const originalJson = res1.json.bind(res1);
            res1.json = (data) => {
                originalJson(data);
                resolve();
            };
            getActiveHandler(req1, res1);
        });

        assert.strictEqual(dbAllCount, 1);

        // POST handler with valid body but INSERT error
        db.get = (sql, params, cb) => {
            if (typeof params === 'function') {
                params(null, { max_order: 4 });
            } else {
                cb(null, { max_order: 4 });
            }
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                params.call(this, new Error('Test DB Error'));
            } else {
                cb.call(this, new Error('Test DB Error'));
            }
        };

        fs.existsSync = (path) => { return true; };
        fs.unlinkSync = (path) => {
            unlinkSyncCount++;
            unlinkedPath = path;
        };

        const req2 = {
            body: {
                title: 'Yeni slayt',
                content_type: 'announcement',
                media_type: 'image',
                text_content: 'Yeni duyuru',
                display_duration: '8',
                video_auto_advance: 'true',
                transition_type: 'fade',
                transition_duration: '1',
                transition_mode: 'auto',
                expires_at: '2030-01-01T00:00:00.000Z'
            },
            file: {
                path: '/tmp/classroom-slide-create-cache-test-error.png',
                originalname: 'duyuru.png',
                mimetype: 'image/png'
            }
        };
        const res2 = createMockRes();

        await new Promise((resolve) => {
            const originalJson = res2.json.bind(res2);
            res2.json = (data) => {
                originalJson(data);
                resolve();
            };
            postHandler(req2, res2);
        });

        assert.strictEqual(res2.statusCode, 500);
        assert.deepStrictEqual(res2.body, { error: 'Slayt oluşturulurken hata oluştu' });
        assert.strictEqual(res2.responseCount, 1);
        assert.strictEqual(unlinkSyncCount, 1);
        assert.strictEqual(unlinkedPath, req2.file.path);

        // Check cache is NOT invalidated
        const req3 = { query: {} };
        const res3 = createMockRes();
        await new Promise((resolve) => {
            const originalJson = res3.json.bind(res3);
            res3.json = (data) => {
                originalJson(data);
                resolve();
            };
            getActiveHandler(req3, res3);
        });

        assert.strictEqual(dbAllCount, 1); // Proof it used the existing cache
    });
});
