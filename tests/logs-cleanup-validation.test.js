const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-logs-cleanup-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) reject(err);
            else resolve();
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

test('Logs Cleanup Route Validation', async (t) => {
    let cleanupHandler;
    let originalDbRun;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.delete && r.route.path === '/api/logs/cleanup');
        assert.strictEqual(routes.length, 1, 'Exactly one matching DELETE route must exist');
        cleanupHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalDbRun = db.run;
    });

    t.afterEach(() => {
        if (originalDbRun) db.run = originalDbRun;
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

    function invokeHandler(req) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;

            const fail = (err) => {
                if (settled) return;
                settled = true;
                reject(err);
            };

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
            };

            try {
                cleanupHandler(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('1. Mandatory invalid-input coverage without db.run', async () => {
        const invalidValues = [
            '', ' ', '0', '00', '01', '-1', '+1', '1.0', '0.5', '1e2',
            '7abc', 'abc', '9007199254740992',
            '1000000000000', // valid safe integer string, but creates invalid Date
            null, 30, true, false, [], {}, ['30']
        ];

        for (const val of invalidValues) {
            let runCalled = 0;
            db.run = () => { runCalled++; };

            const req = { query: { days: val } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz gün sayısı' });
            assert.strictEqual(resObj.count, 1);
            assert.strictEqual(runCalled, 0);
        }
    });

    await t.test('2. Mandatory real-database preservation regression', async () => {
        // Clear table first
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM error_logs", (err) => err ? reject(err) : resolve());
        });

        // Insert distinct rows
        const timestamp = new Date().toISOString();
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Message1', '{}', ?)", [timestamp], (err) => err ? reject(err) : resolve());
        });
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Message2', '{}', ?)", [timestamp], (err) => err ? reject(err) : resolve());
        });

        const dangerousValues = ['-1', '0', '0.5', '7abc'];

        for (const val of dangerousValues) {
            const req = { query: { days: val } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz gün sayısı' });

            const rows = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM error_logs ORDER BY message ASC", (err, rows) => err ? reject(err) : resolve(rows));
            });

            assert.strictEqual(rows.length, 2);
            assert.strictEqual(rows[0].message, 'Message1');
            assert.strictEqual(rows[1].message, 'Message2');
        }
    });

    await t.test('3. Mandatory valid explicit-days regression', async () => {
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM error_logs", (err) => err ? reject(err) : resolve());
        });

        const now = new Date();
        const sixDaysAgo = new Date(now.getTime());
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        const eightDaysAgo = new Date(now.getTime());
        eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Keep', '{}', ?)", [sixDaysAgo.toISOString()], (err) => err ? reject(err) : resolve());
        });
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Delete', '{}', ?)", [eightDaysAgo.toISOString()], (err) => err ? reject(err) : resolve());
        });

        const req = { query: { days: '7' } };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: '1 eski log kaydı silindi' });
        assert.strictEqual(resObj.count, 1);

        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM error_logs ORDER BY message ASC", (err, rows) => err ? reject(err) : resolve(rows));
        });

        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].message, 'Keep');
    });

    await t.test('4. Mandatory omitted-days regression', async () => {
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM error_logs", (err) => err ? reject(err) : resolve());
        });

        const now = new Date();
        const twentyNineDaysAgo = new Date(now.getTime());
        twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
        const thirtyOneDaysAgo = new Date(now.getTime());
        thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Keep', '{}', ?)", [twentyNineDaysAgo.toISOString()], (err) => err ? reject(err) : resolve());
        });
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO error_logs (level, component, message, error_details, timestamp) VALUES ('ERROR', 'Test', 'Delete', '{}', ?)", [thirtyOneDaysAgo.toISOString()], (err) => err ? reject(err) : resolve());
        });

        const req = { query: {} };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: '1 eski log kaydı silindi' });
        assert.strictEqual(resObj.count, 1);

        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM error_logs ORDER BY message ASC", (err, rows) => err ? reject(err) : resolve(rows));
        });

        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].message, 'Keep');
    });

const { Logger } = require('../backend/logger.js');

    await t.test('5. Database error redaction and logger preservation', async () => {
        let runCalled = 0;
        let loggedError = null;
        let loggedContext = null;

        const originalLoggerError = Logger.prototype.error;
        Logger.prototype.error = function(component, message, err, context) {
            loggedError = err;
            loggedContext = context;
        };

        const uniqueSensitiveMarker = 'UNIQUE_SENSITIVE_MARKER_' + crypto.randomBytes(8).toString('hex');
        const dbError = new Error(`Simulated DB error with ${uniqueSensitiveMarker}`);

        let capturedParams;
        db.run = function(sql, params, cb) {
            runCalled++;
            capturedParams = params;
            cb.call(this, dbError);
        };

        const req = { query: { days: '7' }, requestId: 'req-12345' };

        let resObj;
        try {
            resObj = await invokeHandler(req);
        } finally {
            Logger.prototype.error = originalLoggerError;
        }

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Eski loglar temizlenirken bir hata oluştu.' });
        assert.strictEqual(resObj.count, 1);
        assert.strictEqual(runCalled, 1);

        assert.ok(!JSON.stringify(resObj.body).includes(uniqueSensitiveMarker), 'Sensitive marker must not be present in response');

        assert.strictEqual(loggedError, dbError, 'Logger must receive the exact Error object');
        assert.strictEqual(loggedContext.requestId, 'req-12345', 'Logger context must preserve requestId');
        assert.strictEqual(loggedContext.query, 'DELETE FROM error_logs WHERE timestamp < ?', 'Logger context must preserve exact query');
        assert.strictEqual(loggedContext.params, capturedParams, 'Logger context params must have object identity equality with SQLite params');
    });

});
