const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

// Save globals and environments before anything else
const originalSetInterval = global.setInterval;
global.setInterval = () => {};
const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDbPath = 'test-slides-active-read-error-redaction-' + crypto.randomBytes(4).toString('hex') + '.sqlite';
process.env.CLASSROOM_DB_PATH = tempDbPath;

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

const createTrackedResponse = () => {
    let responseCount = 0;
    let statusCode = null;
    let body = null;
    let promiseResolve;
    
    const promise = new Promise((resolve) => {
        promiseResolve = resolve;
    });
    
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseCount++;
            body = data;
            promiseResolve({ statusCode: statusCode || 200, body, responseCount });
        }
    };
    
    res.promise = promise;
    return res;
};

test('Active Slides Read Error Redaction Tests', async (t) => {
    if (db.scheduleMigrationPromise) {
        try {
            await db.scheduleMigrationPromise;
        } catch (e) {
            // Ignore migration errors during test setup
        }
    }

    // Find the handlers
    let activeHandler = null;
    let listHandler = null;
    let idHandler = null;
    
    const slideRoutes = [];
    app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path && layer.route.path.startsWith('/api/slides')) {
            slideRoutes.push({
                path: layer.route.path,
                method: Object.keys(layer.route.methods)[0]
            });
            if (layer.route.path === '/api/slides/active' && layer.route.methods.get) {
                activeHandler = layer.route.stack[0].handle;
            } else if (layer.route.path === '/api/slides' && layer.route.methods.get) {
                listHandler = layer.route.stack[0].handle;
            } else if (layer.route.path === '/api/slides/:id' && layer.route.methods.get) {
                idHandler = layer.route.stack[0].handle;
            }
        }
    });

    await t.test('Exactly one GET /api/slides/active route exists', () => {
        const activeRoutes = slideRoutes.filter(r => r.path === '/api/slides/active' && r.method === 'get');
        assert.strictEqual(activeRoutes.length, 1);
        assert.ok(activeHandler);
    });

    await t.test('Exactly one GET /api/slides route exists', () => {
        const listRoutes = slideRoutes.filter(r => r.path === '/api/slides' && r.method === 'get');
        assert.strictEqual(listRoutes.length, 1);
        assert.ok(listHandler);
    });

    await t.test('Exactly one GET /api/slides/:id route exists', () => {
        const idRoutes = slideRoutes.filter(r => r.path === '/api/slides/:id' && r.method === 'get');
        assert.strictEqual(idRoutes.length, 1);
        assert.ok(idHandler);
    });

    await t.test('Route registration order remains exactly: /api/slides/active -> /api/slides -> /api/slides/:id', () => {
        const activeIndex = slideRoutes.findIndex(r => r.path === '/api/slides/active' && r.method === 'get');
        const listIndex = slideRoutes.findIndex(r => r.path === '/api/slides' && r.method === 'get');
        const idIndex = slideRoutes.findIndex(r => r.path === '/api/slides/:id' && r.method === 'get');
        
        assert.ok(activeIndex < listIndex, 'active route must be registered before list route');
        assert.ok(listIndex < idIndex, 'list route must be registered before id route');
    });

    await t.test('Sequential test flow for /api/slides/active', async (t2) => {
        const originalDbAll = db.all;
        const originalLoggerError = Logger.prototype.error;
        const originalDateNow = Date.now;

        let dbAllCalls = 0;
        let loggerErrorCalls = 0;

        try {
            const fakeNow = 1700000000000;
            Date.now = () => fakeNow;

            const reqError = { requestId: 'active-slides-error-request' };
            const reqSuccess = { requestId: 'active-slides-success-request' };
            const reqCache = { requestId: 'active-slides-cache-request' };

            let capturedSql = null;
            let capturedParams = null;
            let capturedLoggerArgs = null;
            
            const secretMarker = 'SENSITIVE_ACTIVE_SLIDES_DB_DETAIL_' + crypto.randomBytes(4).toString('hex');
            const dbError = new Error(secretMarker);

            // Call 1 - database error
            db.all = (sql, params, cb) => {
                dbAllCalls++;
                capturedSql = sql;
                capturedParams = params;
                cb(dbError);
            };

            Logger.prototype.error = (component, msg, err, meta) => {
                loggerErrorCalls++;
                capturedLoggerArgs = { component, msg, err, meta };
            };

            const res1 = createTrackedResponse();
            await activeHandler(reqError, res1);
            const result1 = await res1.promise;

            assert.strictEqual(dbAllCalls, 1);
            
            const expectedSql = `
            SELECT * FROM slides 
            WHERE is_active = 1 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY display_order ASC
        `;
            assert.strictEqual(capturedSql, expectedSql);
            assert.deepStrictEqual(capturedParams, []);
            
            assert.strictEqual(result1.statusCode, 500);
            assert.strictEqual(result1.responseCount, 1);
            assert.deepStrictEqual(result1.body, { error: 'Slayt bilgileri alınırken hata oluştu' });
            
            const serializedBody1 = JSON.stringify(result1.body);
            assert.ok(!serializedBody1.includes(secretMarker));

            assert.strictEqual(loggerErrorCalls, 1);
            assert.ok(capturedLoggerArgs);
            assert.strictEqual(capturedLoggerArgs.component, COMPONENTS.API);
            assert.strictEqual(capturedLoggerArgs.msg, 'Error fetching active slides');
            assert.strictEqual(capturedLoggerArgs.err, dbError);
            assert.strictEqual(capturedLoggerArgs.meta.endpoint, '/api/slides/active');
            assert.strictEqual(capturedLoggerArgs.meta.requestId, 'active-slides-error-request');
            assert.strictEqual(capturedLoggerArgs.meta.query, capturedSql);
            assert.strictEqual(capturedLoggerArgs.meta.params, capturedParams);

            // Call 2 - successful database read
            const mockRows = [
                {
                    id: 9,
                    title: 'İlk aktif slayt',
                    media_path: null,
                    display_order: 1,
                    is_active: 1
                },
                {
                    id: 12,
                    title: 'İkinci aktif slayt',
                    media_path: 'backend\\uploads\\slides\\active-slide.jpg',
                    display_order: 2,
                    is_active: 1
                }
            ];

            db.all = (sql, params, cb) => {
                dbAllCalls++;
                capturedSql = sql;
                capturedParams = params;
                cb(null, [...mockRows]); // Clone to simulate independent rows
            };

            const res2 = createTrackedResponse();
            await activeHandler(reqSuccess, res2);
            const result2 = await res2.promise;

            assert.strictEqual(dbAllCalls, 2);
            assert.strictEqual(capturedSql, expectedSql);
            assert.deepStrictEqual(capturedParams, []);

            assert.strictEqual(result2.statusCode, 200);
            assert.strictEqual(result2.responseCount, 1);
            
            assert.strictEqual(result2.body.length, 2);
            assert.strictEqual(result2.body[0].id, 9);
            assert.strictEqual(result2.body[0].media_path, null);
            assert.strictEqual(result2.body[1].id, 12);
            assert.strictEqual(result2.body[1].media_path, '/uploads/slides/active-slide.jpg');
            assert.strictEqual(loggerErrorCalls, 1);

            // Call 3 - valid cache hit
            db.all = () => {
                assert.fail('Database should not be queried during a valid cache hit');
            };

            const res3 = createTrackedResponse();
            await activeHandler(reqCache, res3);
            const result3 = await res3.promise;

            assert.strictEqual(dbAllCalls, 2);
            assert.strictEqual(result3.statusCode, 200);
            assert.strictEqual(result3.responseCount, 1);
            assert.deepStrictEqual(result3.body, result2.body);
            
            assert.strictEqual(loggerErrorCalls, 1);

        } finally {
            db.all = originalDbAll;
            Logger.prototype.error = originalLoggerError;
            Date.now = originalDateNow;
        }
    });
});

test('Teardown database', async () => {
    const fs = require('node:fs');
    
    // 1. Await successful database closure
    await new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    // 2. Only after closure succeeds, delete:
    const files = [
        tempDbPath,
        tempDbPath + '-journal',
        tempDbPath + '-wal',
        tempDbPath + '-shm'
    ];

    for (const file of files) {
        try {
            fs.unlinkSync(file);
        } catch (err) {
            // 3. Ignore only ENOENT. 4. Re-throw every other filesystem error.
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }

    // 6. Restore global.setInterval
    global.setInterval = originalSetInterval;
    
    // 7. Restore or delete CLASSROOM_DB_PATH
    if (originalDbPath === undefined) {
        delete process.env.CLASSROOM_DB_PATH;
    } else {
        process.env.CLASSROOM_DB_PATH = originalDbPath;
    }
});
