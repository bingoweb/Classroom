const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-logs-read-json-test-'));
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

test('Logs Read JSON Parsing Tests', async (t) => {
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

    await t.test('Exactly one GET /api/logs route exists', () => {
        assert.strictEqual(getLogsRoutes.length, 1);
    });

    const getHandler = getLogsRoutes[0].route.stack[getLogsRoutes[0].route.stack.length - 1].handle;

    await t.test('JSON Parsing matrix', async () => {
        let dbAllCount = 0;
        
        const testRows = [
            // Valid JSON object
            { id: 1, message: 'Valid object', error_details: '{"code":1}', context: '{"route":"/"}' },
            // Valid JSON array
            { id: 2, message: 'Valid array', error_details: '["item"]', context: '[1,2,3]' },
            // Valid JSON scalar
            { id: 3, message: 'Valid scalar', error_details: '42', context: 'true' },
            { id: 4, message: 'Valid null scalar', error_details: 'null', context: '"stringval"' },
            // Malformed error_details, valid context
            { id: 5, message: 'Malformed error_details', error_details: '{bad}', context: '{"ok":true}' },
            // Valid error_details, malformed context
            { id: 6, message: 'Malformed context', error_details: '{"ok":true}', context: '[bad]' },
            // Both malformed
            { id: 7, message: 'Both malformed', error_details: 'some string', context: '{not:json}' },
            // Whitespace and malformed strings
            { id: 8, message: 'Whitespace strings', error_details: '   ', context: ' \n ' },
            // empty, null, undefined
            { id: 9, message: 'Empty string', error_details: '', context: '' },
            { id: 10, message: 'Null values', error_details: null, context: null },
            { id: 11, message: 'Undefined values', error_details: undefined, context: undefined },
            // Defensive non-string non-null values
            { id: 12, message: 'Defensive non-strings', error_details: { directObject: true }, context: [1] }
        ];

        db.all = function(sql, params, cb) {
            dbAllCount++;
            if (cb) cb(null, testRows);
        };

        const req = { query: {} };
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all called exactly once');
        assert.strictEqual(res.responseCount, 1, 'exactly one response sent');
        assert.strictEqual(res.statusCode, 200, 'successful response');
        
        const body = res.body;
        assert.ok(Array.isArray(body), 'response remains an array');
        assert.strictEqual(body.length, 12, 'all rows returned even with malformed fields');
        
        // 1. Valid object
        assert.deepStrictEqual(body[0].error_details, {code: 1});
        assert.deepStrictEqual(body[0].context, {route: '/'});
        assert.strictEqual(body[0].message, 'Valid object', 'preserves unrelated fields');
        
        // 2. Valid array
        assert.deepStrictEqual(body[1].error_details, ["item"]);
        assert.deepStrictEqual(body[1].context, [1, 2, 3]);

        // 3 & 4. Valid JSON scalar
        assert.strictEqual(body[2].error_details, 42);
        assert.strictEqual(body[2].context, true);
        assert.strictEqual(body[3].error_details, null);
        assert.strictEqual(body[3].context, "stringval");

        // 5. Malformed error_details
        assert.strictEqual(body[4].error_details, '{bad}');
        assert.deepStrictEqual(body[4].context, {ok: true});

        // 6. Malformed context
        assert.deepStrictEqual(body[5].error_details, {ok: true});
        assert.strictEqual(body[5].context, '[bad]');

        // 7. Both malformed
        assert.strictEqual(body[6].error_details, 'some string');
        assert.strictEqual(body[6].context, '{not:json}');

        // 8. Whitespace strings (malformed JSON but preserved as string, not stripped)
        assert.strictEqual(body[7].error_details, '   ');
        assert.strictEqual(body[7].context, ' \n ');

        // 9. Exact empty string
        assert.strictEqual(body[8].error_details, null);
        assert.strictEqual(body[8].context, null);

        // 10. Null values
        assert.strictEqual(body[9].error_details, null);
        assert.strictEqual(body[9].context, null);

        // 11. Undefined values
        assert.strictEqual(body[10].error_details, null);
        assert.strictEqual(body[10].context, null);

        // 12. Defensive non-strings
        assert.deepStrictEqual(body[11].error_details, { directObject: true });
        assert.deepStrictEqual(body[11].context, [1]);
    });

    await t.test('Database error path', async () => {
        let dbAllCount = 0;
        let loggerErrorCount = 0;
        let loggedComponent = null;
        let loggedMessage = null;
        let loggedErrorObj = null;
        let loggedMeta = null;

        const secretMarker = 'SENSITIVE_LOG_JSON_DB_DETAIL_4c82e1';
        const databaseError = new Error(secretMarker);

        db.all = function(sql, params, cb) {
            dbAllCount++;
            if (cb) cb(databaseError);
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerErrorCount++;
            loggedComponent = component;
            loggedMessage = message;
            loggedErrorObj = err;
            loggedMeta = meta;
        };

        const req = { query: {} };
        const res = createMockRes();

        getHandler(req, res);

        assert.strictEqual(dbAllCount, 1, 'db.all is called exactly once');
        assert.strictEqual(res.responseCount, 1, 'exactly one response is sent');
        assert.strictEqual(res.statusCode, 500, 'HTTP status is exactly 500');
        assert.deepStrictEqual(res.body, { error: 'Hata günlükleri alınırken hata oluştu' });

        const serializedBody = JSON.stringify(res.body);
        assert.ok(!serializedBody.includes(secretMarker), 'secret marker absent from client response');

        assert.strictEqual(loggerErrorCount, 1, 'logger is called exactly once');
        assert.strictEqual(loggedComponent, COMPONENTS.API, 'logger component is API');
        assert.strictEqual(loggedMessage, 'Error fetching logs');
        assert.strictEqual(loggedErrorObj, databaseError);
        assert.ok(loggedErrorObj.message.includes(secretMarker));
        assert.ok(typeof loggedMeta.query === 'string', 'metadata contains a query string');
        assert.deepStrictEqual(loggedMeta.params, [100], 'metadata parameters equal [100]');
    });
});
