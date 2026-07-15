const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-read-error-redaction-'));
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
            this.resolveTimeout = setTimeout(() => {
                resolvePromise({ statusCode: this.statusCode, body: this.body, responseCount: this.responseCount });
            }, 5);
            return this;
        }
    };
    return res;
}

test('Slides Read Error Redaction', async (t) => {
    let originalDbAll;
    let originalDbGet;
    let originalLoggerError;

    t.before(async () => {
        if (db.scheduleMigrationPromise) {
            await db.scheduleMigrationPromise;
        }
    });

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalDbGet = db.get;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
        if (originalDbGet) db.get = originalDbGet;
        if (originalLoggerError) Logger.prototype.error = originalLoggerError;
    });

    t.after(async () => {
        try {
            await closeDatabase(db);
            removeFileIfPresent(fs, testDbPath);
            removeFileIfPresent(fs, testDbPath + '-journal');
            removeFileIfPresent(fs, testDbPath + '-wal');
            removeFileIfPresent(fs, testDbPath + '-shm');
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

    const getRoutes = app._router.stack.filter(layer => layer.route && layer.route.methods.get);
    
    const activeRoutes = getRoutes.filter(layer => layer.route.path === '/api/slides/active');
    const allRoutes = getRoutes.filter(layer => layer.route.path === '/api/slides');
    const idRoutes = getRoutes.filter(layer => layer.route.path === '/api/slides/:id');

    const allHandler = allRoutes[0]?.route.stack[allRoutes[0].route.stack.length - 1]?.handle;
    const idHandler = idRoutes[0]?.route.stack[idRoutes[0].route.stack.length - 1]?.handle;

    await t.test('Real route discovery', () => {
        assert.strictEqual(activeRoutes.length, 1, 'Exactly one GET /api/slides/active route exists');
        assert.strictEqual(allRoutes.length, 1, 'Exactly one GET /api/slides route exists');
        assert.strictEqual(idRoutes.length, 1, 'Exactly one GET /api/slides/:id route exists');

        const routesPaths = getRoutes.map(l => l.route.path);
        const activeIndex = routesPaths.indexOf('/api/slides/active');
        const allIndex = routesPaths.indexOf('/api/slides');
        const idIndex = routesPaths.indexOf('/api/slides/:id');
        
        assert.ok(activeIndex < allIndex, 'GET /api/slides/active is registered before GET /api/slides');
        assert.ok(allIndex < idIndex, 'GET /api/slides is registered before GET /api/slides/:id');

        assert.strictEqual(allRoutes[0].route.stack.length, 1, 'GET /api/slides contains only one handler');
        assert.strictEqual(idRoutes[0].route.stack.length, 1, 'GET /api/slides/:id contains only one handler');
        assert.strictEqual(typeof allHandler, 'function', 'the extracted allHandler is a function');
        assert.strictEqual(typeof idHandler, 'function', 'the extracted idHandler is a function');
    });

    await t.test('Successful list-route test', async () => {
        let dbAllCalled = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCalled = 0;

        const mockRows = [
            { id: 1, title: 'No Media', media_path: null, display_order: 1, is_active: 1 },
            { id: 2, title: 'Has Media', media_path: 'backend\\uploads\\slides\\slide.jpg', display_order: 2, is_active: 1 }
        ];

        db.all = (sql, params, cb) => {
            dbAllCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(null, JSON.parse(JSON.stringify(mockRows)));
        };

        Logger.prototype.error = () => {
            loggerErrorCalled++;
        };

        const req = { requestId: 'slides-list-success-request' };
        const res = createTrackedResponse();

        allHandler(req, res);
        const result = await res.promise;

        assert.strictEqual(dbAllCalled, 1);
        assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE is_active = 1 ORDER BY display_order ASC");
        assert.deepStrictEqual(capturedParams, []);
        
        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(loggerErrorCalled, 0);

        assert.strictEqual(result.body.length, 2);
        assert.strictEqual(result.body[0].media_path, null);
        assert.strictEqual(result.body[1].media_path, '/uploads/slides/slide.jpg');
        
        // Ensure order is unchanged
        assert.strictEqual(result.body[0].id, 1);
        assert.strictEqual(result.body[1].id, 2);
    });

    await t.test('Successful single-slide test', async () => {
        let dbGetCalled = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCalled = 0;

        const mockRow = { id: 47, title: 'Single Slide', media_path: 'backend\\uploads\\slides\\slide47.jpg', display_order: 3, is_active: 1 };

        db.get = (sql, params, cb) => {
            dbGetCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(null, { ...mockRow });
        };

        Logger.prototype.error = () => {
            loggerErrorCalled++;
        };

        const req = { params: { id: '47' }, requestId: 'slide-id-success-request' };
        const res = createTrackedResponse();

        idHandler(req, res);
        const result = await res.promise;

        assert.strictEqual(dbGetCalled, 1);
        assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE id = ?");
        assert.deepStrictEqual(capturedParams, [47]);
        assert.strictEqual(typeof capturedParams[0], 'number');

        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(loggerErrorCalled, 0);

        assert.strictEqual(result.body.id, 47);
        assert.strictEqual(result.body.media_path, '/uploads/slides/slide47.jpg');
    });

    await t.test('Invalid-ID preservation test', async (t2) => {
        const invalidIds = ['abc', '47abc', '47.5', '047', '0', '-47', '9007199254740992'];

        for (const val of invalidIds) {
            await t2.test(`Invalid ID: ${val}`, async () => {
                let dbGetCalled = 0;
                let loggerErrorCalled = 0;

                db.get = () => { dbGetCalled++; };
                Logger.prototype.error = () => { loggerErrorCalled++; };

                const req = { params: { id: val } };
                const res = createTrackedResponse();

                idHandler(req, res);
                const result = await res.promise;

                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(result.body, { error: 'Geçersiz slayt ID' });
                assert.strictEqual(result.responseCount, 1);
                assert.strictEqual(dbGetCalled, 0);
                assert.strictEqual(loggerErrorCalled, 0);
            });
        }
    });

    await t.test('Missing-slide preservation test', async () => {
        let dbGetCalled = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCalled = 0;

        db.get = (sql, params, cb) => {
            dbGetCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(null, undefined);
        };

        Logger.prototype.error = () => { loggerErrorCalled++; };

        const req = { params: { id: '47' } };
        const res = createTrackedResponse();

        idHandler(req, res);
        const result = await res.promise;

        assert.strictEqual(dbGetCalled, 1);
        assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE id = ?");
        assert.deepStrictEqual(capturedParams, [47]);
        
        assert.strictEqual(result.statusCode, 404);
        assert.deepStrictEqual(result.body, { error: 'Slayt bulunamadı' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(loggerErrorCalled, 0);
    });

    await t.test('List-route database-error test', async () => {
        let dbAllCalled = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCalls = 0;
        let loggerErrorArgs = null;

        const secretMarker = 'SENSITIVE_SLIDES_LIST_DB_DETAIL_' + crypto.randomBytes(4).toString('hex');
        const dbError = new Error(secretMarker);

        db.all = (sql, params, cb) => {
            dbAllCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(dbError);
        };

        Logger.prototype.error = (component, msg, err, meta) => {
            loggerErrorCalls++;
            loggerErrorArgs = { component, msg, err, meta };
        };

        const req = { requestId: 'slides-list-error-request' };
        const res = createTrackedResponse();

        allHandler(req, res);
        const result = await res.promise;

        assert.strictEqual(dbAllCalled, 1);
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'Slayt bilgileri alınırken hata oluştu' });
        
        const serializedBody = JSON.stringify(result.body);
        assert.ok(!serializedBody.includes(secretMarker), 'Response must not expose secret marker');

        assert.strictEqual(loggerErrorCalls, 1);
        assert.ok(loggerErrorArgs, 'Logger error arguments must be captured');
        assert.strictEqual(loggerErrorArgs.component, COMPONENTS.API);
        assert.strictEqual(loggerErrorArgs.msg, 'Error fetching slides');
        assert.strictEqual(loggerErrorArgs.err, dbError);
        assert.strictEqual(loggerErrorArgs.meta.endpoint, '/api/slides');
        assert.strictEqual(loggerErrorArgs.meta.requestId, 'slides-list-error-request');
        assert.strictEqual(loggerErrorArgs.meta.query, capturedSql);
        assert.strictEqual(loggerErrorArgs.meta.params, capturedParams);
    });

    await t.test('Single-slide database-error test', async () => {
        let dbGetCalled = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCalls = 0;
        let loggerErrorArgs = null;

        const secretMarker = 'SENSITIVE_SLIDE_ID_DB_DETAIL_' + crypto.randomBytes(4).toString('hex');
        const dbError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            dbGetCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(dbError);
        };

        Logger.prototype.error = (component, msg, err, meta) => {
            loggerErrorCalls++;
            loggerErrorArgs = { component, msg, err, meta };
        };

        const req = { params: { id: '47' }, requestId: 'slide-id-error-request' };
        const res = createTrackedResponse();

        idHandler(req, res);
        const result = await res.promise;

        assert.strictEqual(dbGetCalled, 1);
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'Slayt bilgileri alınırken hata oluştu' });
        
        const serializedBody = JSON.stringify(result.body);
        assert.ok(!serializedBody.includes(secretMarker), 'Response must not expose secret marker');

        assert.strictEqual(loggerErrorCalls, 1);
        assert.ok(loggerErrorArgs, 'Logger error arguments must be captured');
        assert.strictEqual(loggerErrorArgs.component, COMPONENTS.API);
        assert.strictEqual(loggerErrorArgs.msg, 'Error fetching slide by id');
        assert.strictEqual(loggerErrorArgs.err, dbError);
        assert.strictEqual(loggerErrorArgs.meta.endpoint, '/api/slides/:id');
        assert.strictEqual(loggerErrorArgs.meta.requestId, 'slide-id-error-request');
        assert.strictEqual(loggerErrorArgs.meta.slideId, 47);
        assert.strictEqual(loggerErrorArgs.meta.query, capturedSql);
        assert.strictEqual(loggerErrorArgs.meta.params, capturedParams);
    });
});
