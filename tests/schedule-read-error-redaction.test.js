const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-schedule-read-error-redaction-test-'));
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

test('Schedule Read Error Redaction Tests', async (t) => {
    let originalDbAll, originalLoggerError;

    t.before(async () => {
        await db.scheduleMigrationPromise;
    });

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbAll) db.all = originalDbAll;
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

    const getScheduleRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/schedule' && layer.route.methods.get
    );

    await t.test('Exactly one GET /api/schedule route exists', () => {
        assert.strictEqual(getScheduleRoutes.length, 1);
    });

    const getHandler = getScheduleRoutes[0].route.stack[getScheduleRoutes[0].route.stack.length - 1].handle;

    await t.test('Successful response path', async () => {
        let dbAllCount = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCount = 0;

        const representativeRows = [
            {
                id: 1,
                day: 'weekday',
                period: 1,
                course: 'Türkçe',
                period_type: 'class',
                start_time: '09:00',
                end_time: '09:40',
                is_active: 1
            },
            {
                id: 2,
                day: 'weekday',
                period: 2,
                course: 'Matematik',
                period_type: 'class',
                start_time: '09:55',
                end_time: '10:35',
                is_active: 1
            }
        ];

        db.all = function(sql, params, cb) {
            dbAllCount++;
            capturedSql = sql;
            capturedParams = params;
            if (cb) cb(null, representativeRows);
        };

        Logger.prototype.error = function() {
            loggerErrorCount++;
        };

        const req = {};
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
        assert.strictEqual(capturedSql, 'SELECT * FROM schedule ORDER BY period', 'SQL is exactly expected');
        assert.deepStrictEqual(capturedParams, [], 'Parameters are exactly empty array');
        assert.strictEqual(res.responseCount, 1, 'Exactly one response is sent');
        assert.strictEqual(res.statusCode, 200, 'Status remains 200');
        assert.deepStrictEqual(res.body, representativeRows, 'Response body exactly equals the representative schedule rows');
        assert.strictEqual(loggerErrorCount, 0, 'The error logger is not called');
    });

    await t.test('Database error path', async () => {
        let dbAllCount = 0;
        let capturedSql = null;
        let capturedParams = null;
        let loggerErrorCount = 0;
        let loggedComponent = null;
        let loggedMessage = null;
        let loggedErrorObj = null;
        let loggedMeta = null;

        const secretMarker = 'SENSITIVE_SCHEDULE_READ_DB_DETAIL_5e83b2';
        const databaseError = new Error(secretMarker);

        db.all = function(sql, params, cb) {
            dbAllCount++;
            capturedSql = sql;
            capturedParams = params;
            if (cb) cb(databaseError);
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerErrorCount++;
            loggedComponent = component;
            loggedMessage = message;
            loggedErrorObj = err;
            loggedMeta = meta;
        };

        const req = {};
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
        assert.strictEqual(res.responseCount, 1, 'exactly one response is sent');
        assert.strictEqual(res.statusCode, 500, 'HTTP status is exactly 500');
        assert.deepStrictEqual(res.body, { error: 'Ders programı alınırken hata oluştu' }, 'Response body is exactly expected');

        const serializedBody = JSON.stringify(res.body);
        assert.ok(!serializedBody.includes(secretMarker), 'secret marker is absent from client response');

        assert.strictEqual(loggerErrorCount, 1, 'logger is called exactly once');
        assert.strictEqual(loggedComponent, COMPONENTS.API, 'logger component is exactly COMPONENTS.API');
        assert.strictEqual(loggedMessage, 'Error fetching schedule', 'logger message is exactly expected');
        assert.strictEqual(loggedErrorObj, databaseError, 'logger receives the exact original databaseError object');
        assert.ok(loggedErrorObj.message.includes(secretMarker), 'logged error message contains secretMarker');
        
        assert.strictEqual(loggedMeta.query, capturedSql, 'Logger metadata query is exactly the SQL value passed to db.all');
        assert.strictEqual(loggedMeta.params, capturedParams, 'Logger metadata parameters are exactly the parameter array passed to db.all');
        
        assert.strictEqual(capturedSql, 'SELECT * FROM schedule ORDER BY period', 'The captured SQL is exactly expected');
        assert.deepStrictEqual(capturedParams, [], 'The captured parameters are exactly empty array');
    });
});
