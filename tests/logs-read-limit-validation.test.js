const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-logs-read-test-'));
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

test('Logs Read Limit Validation Tests', async (t) => {
    let originalDbAll, originalLoggerError;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
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

    const getLogsRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/logs' && layer.route.methods.get
    );

    await t.test('Route discovery', () => {
        assert.strictEqual(getLogsRoutes.length, 1, 'Exactly one GET /api/logs route must exist');
    });

    const getHandler = getLogsRoutes[0].route.stack[getLogsRoutes[0].route.stack.length - 1].handle;

    const invalidLimits = [
        "", "0", "-1", "+1", "01", "001", "1.0", "1.5", "1e2", "10abc", " 10", "10 ", "10\\n", "1001", "999999999999999999999", "NaN", "Infinity",
        [], {}, true, false, null
    ];

    await t.test('Invalid-value matrix', async (t) => {
        for (const invalidValue of invalidLimits) {
            await t.test(`rejects limit=${JSON.stringify(invalidValue)}`, () => {
                let dbAllCount = 0;
                db.all = function(sql, params, cb) {
                    dbAllCount++;
                };

                const req = { query: { limit: invalidValue } };
                const res = createMockRes();

                getHandler(req, res);

                assert.strictEqual(dbAllCount, 0, 'zero db.all calls');
                assert.strictEqual(res.responseCount, 1, 'exactly one response');
                assert.strictEqual(res.statusCode, 400, 'exact status 400');
                assert.deepStrictEqual(res.body, { error: 'Geçersiz limit değeri' }, 'exact body');
            });
        }
    });

    await t.test('Default behavior', async () => {
        let dbAllCount = 0;
        let capturedSql = null;
        let capturedParams = null;

        db.all = function(sql, params, cb) {
            dbAllCount++;
            capturedSql = sql;
            capturedParams = params;
            if (cb) cb(null, [{ id: 1, message: 'Test log', error_details: null, context: null }]);
        };

        const req = { query: {} };
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
        assert.ok(capturedSql.includes('ORDER BY timestamp DESC LIMIT ?'), 'SQL contains ORDER BY timestamp DESC LIMIT ?');
        assert.strictEqual(capturedParams[capturedParams.length - 1], 100, 'last parameter is numeric 100');
        assert.strictEqual(res.responseCount, 1, 'normal array response is returned exactly once');
        assert.strictEqual(res.statusCode, 200, 'success status code');
        assert.deepStrictEqual(res.body, [{ id: 1, message: 'Test log', error_details: null, context: null }], 'returned array');
    });

    await t.test('Valid boundaries', async (t) => {
        const validBoundaries = [1, 1000];
        
        for (const limitValue of validBoundaries) {
            await t.test(`accepts limit=${limitValue}`, () => {
                let dbAllCount = 0;
                let capturedParams = null;

                db.all = function(sql, params, cb) {
                    dbAllCount++;
                    capturedParams = params;
                    if (cb) cb(null, []);
                };

                const req = { query: { limit: String(limitValue) } };
                const res = createMockRes();

                getHandler(req, res);

                assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
                assert.strictEqual(capturedParams[capturedParams.length - 1], limitValue, `numeric parameter ${limitValue} is passed`);
            });
        }
    });

    await t.test('Filter parameter order', async () => {
        let capturedParams = null;

        db.all = function(sql, params, cb) {
            capturedParams = params;
            if (cb) cb(null, []);
        };

        const req = { 
            query: { 
                level: 'ERROR',
                component: 'API',
                since: '2026-07-14T10:00:00.000Z',
                limit: '25'
            } 
        };
        const res = createMockRes();

        getHandler(req, res);

        assert.deepStrictEqual(capturedParams, [
            'ERROR',
            'API',
            '2026-07-14T10:00:00.000Z',
            25
        ], 'database parameters are exactly ordered');
    });

    await t.test('Database error', async () => {
        let dbAllCount = 0;
        let loggerErrorCount = 0;
        let loggedComponent = null;

        db.all = function(sql, params, cb) {
            dbAllCount++;
            if (cb) cb(new Error('Test DB Error'));
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerErrorCount++;
            loggedComponent = component;
        };

        const req = { query: {} };
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
        assert.strictEqual(res.statusCode, 500, 'one 500 response');
        assert.deepStrictEqual(res.body, { error: 'Test DB Error' }, 'error response body');
        assert.strictEqual(res.responseCount, 1, 'no success response afterward');
        assert.strictEqual(loggerErrorCount, 1, 'logger call remains intact');
        assert.strictEqual(loggedComponent, COMPONENTS.API);
    });
});
