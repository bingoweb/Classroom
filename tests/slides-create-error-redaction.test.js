const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-create-error-'));
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

test('Slides Create Error Redaction Tests', async (t) => {
    let originalDbGet, originalFsUnlinkSync, originalLoggerError;

    t.before(async () => {
        await db.scheduleMigrationPromise;
    });

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalFsUnlinkSync = fs.unlinkSync;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbGet) db.get = originalDbGet;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
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
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    function findPostSlidesHandler() {
        let targetHandler = null;
        for (const layer of app._router.stack) {
            if (layer.route && layer.route.path === '/api/slides' && layer.route.methods.post) {
                targetHandler = layer.route.stack[layer.route.stack.length - 1].handle;
                break;
            }
        }
        return targetHandler;
    }

    function invokeHandler(req, handlerToUse, timeoutMs = 500) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            const fail = (err) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err);
            };

            timeoutId = setTimeout(() => {
                fail(new Error(`Expected exactly one response, received ${responseCount}`));
            }, timeoutMs);

            const scheduleCompletion = () => {
                if (completionScheduled) return;
                completionScheduled = true;
                setImmediate(() => {
                    if (settled) return;
                    if (responseCount !== 1 || !responseSnapshot) {
                        fail(new Error(`Expected exactly one response, received ${responseCount}`));
                        return;
                    }
                    settled = true;
                    cleanup();
                    resolve({
                        ...responseSnapshot,
                        count: responseCount
                    });
                });
            };

            const res = {
                statusCode: 200,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(data) {
                    responseCount++;
                    if (responseCount > 1) {
                        fail(new Error('Response sent more than once'));
                        return this;
                    }
                    responseSnapshot = {
                        statusCode: this.statusCode || 200,
                        body: data
                    };
                    scheduleCompletion();
                    return this;
                }
            };

            const next = (err) => {
                if (err) fail(err);
                else fail(new Error('next() called without error'));
            };

            try {
                handlerToUse(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('1. Database error in max display order lookup preserves error in logger and redacts response', async () => {
        const handler = findPostSlidesHandler();
        assert.ok(handler, 'POST /api/slides handler should be found');

        const mockError = new Error('SENSITIVE_DB_ERROR_123');
        let dbGetCalled = false;
        let loggedError = null;
        let loggedContext = null;
        let unlinkCalled = false;
        let unlinkedPath = null;
        
        let capturedGetParams = null;

        db.get = function(sql, params, cb) {
            if (sql.includes('SELECT MAX(display_order)')) {
                dbGetCalled = true;
                capturedGetParams = params;
                return cb(mockError);
            }
            return originalDbGet.apply(this, arguments);
        };

        fs.unlinkSync = function(filepath) {
            unlinkCalled = true;
            unlinkedPath = filepath;
        };

        Logger.prototype.error = function(component, message, err, context) {
            if (component === COMPONENTS.DATABASE && message.includes('max display order')) {
                loggedError = err;
                loggedContext = context;
            }
        };

        const mockReq = {
            body: {
                title: 'Test Slide',
                content_type: 'text'
            },
            file: {
                originalname: 'test.jpg',
                filename: 'test-timestamp.jpg',
                path: '/tmp/test-timestamp.jpg',
                mimetype: 'image/jpeg'
            },
            requestId: 'req-456'
        };

        const result = await invokeHandler(mockReq, handler);

        assert.strictEqual(dbGetCalled, true, 'db.get should be called for max display order');
        assert.strictEqual(unlinkCalled, true, 'fs.unlinkSync should be called on failure');
        assert.strictEqual(unlinkedPath, '/tmp/test-timestamp.jpg', 'Correct file path unlinked');

        assert.strictEqual(result.statusCode, 500, 'Should return 500 status');
        assert.strictEqual(result.body.error, 'Slayt sırası hesaplanırken bir hata oluştu.', 'Error message should be redacted and in Turkish');
        assert.ok(!JSON.stringify(result.body).includes('SENSITIVE'), 'Raw error must not reach the client');

        assert.strictEqual(loggedError, mockError, 'Logger should receive the exact Error object');
        assert.strictEqual(loggedContext.query, 'SELECT MAX(display_order) as max_order FROM slides', 'Logger should preserve SQL query');
        assert.strictEqual(loggedContext.params, capturedGetParams, 'Logger and SQLite params must have object identity equality');
        assert.deepEqual(loggedContext.params, [], 'Logger should preserve SQL params structure');
        assert.strictEqual(loggedContext.requestId, 'req-456', 'Logger should preserve requestId');
        assert.strictEqual(result.count, 1, 'Should return exactly 1 response');
    });
});
