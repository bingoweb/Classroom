const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// Save globals and environments before anything else
const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-slides-active-read-error-redaction-')
);
const testDbPath = path.join(
    tempDir,
    `test-${crypto.randomBytes(4).toString('hex')}.db`
);

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
                resolvePromise({
                    statusCode: this.statusCode,
                    body: this.body,
                    responseCount: this.responseCount
                });
            }, 5);

            return this;
        }
    };

    return res;
}

test('Active Slides Read Error Redaction Tests', async (t) => {
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

    if (db.scheduleMigrationPromise) {
        await db.scheduleMigrationPromise;
    }

    // Helper regression tests
    await t.test('Double-response regression', async () => {
        const res = createTrackedResponse();
        res.json({ a: 1 });
        res.json({ b: 2 });
        await assert.rejects(res.promise, /Multiple responses sent/);
    });

    await t.test('Zero-response regression', async () => {
        const res = createTrackedResponse();
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
    });

    // Find the handlers
    let activeHandler = null;
    
    const activeRoutes = [];
    const listRoutes = [];
    const idRoutes = [];

    const slideRoutes = [];
    app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path && layer.route.path.startsWith('/api/slides')) {
            if (layer.route.methods.get) {
                slideRoutes.push(layer.route.path);

                if (layer.route.path === '/api/slides/active') {
                    activeRoutes.push(layer);
                } else if (layer.route.path === '/api/slides') {
                    listRoutes.push(layer);
                } else if (layer.route.path === '/api/slides/:id') {
                    idRoutes.push(layer);
                }
            }
        }
    });

    await t.test('Exactly one GET /api/slides/active route exists', () => {
        assert.strictEqual(activeRoutes.length, 1);
        assert.strictEqual(activeRoutes[0].route.stack.length, 1);
        activeHandler = activeRoutes[0].route.stack[0].handle;
        assert.strictEqual(typeof activeHandler, 'function');
    });

    await t.test('Exactly one GET /api/slides route exists', () => {
        assert.strictEqual(listRoutes.length, 1);
    });

    await t.test('Exactly one GET /api/slides/:id route exists', () => {
        assert.strictEqual(idRoutes.length, 1);
    });

    await t.test('Route registration order remains exactly: /api/slides/active -> /api/slides -> /api/slides/:id', () => {
        const activeIndex = slideRoutes.indexOf('/api/slides/active');
        const listIndex = slideRoutes.indexOf('/api/slides');
        const idIndex = slideRoutes.indexOf('/api/slides/:id');
        
        assert.ok(activeIndex !== -1);
        assert.ok(listIndex !== -1);
        assert.ok(idIndex !== -1);
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
            AND is_fallback = CASE
                WHEN EXISTS (
                    SELECT 1 FROM slides
                    WHERE is_active = 1
                    AND is_fallback = 0
                    AND (expires_at IS NULL OR expires_at > datetime('now'))
                ) THEN 0
                ELSE 1
            END
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
