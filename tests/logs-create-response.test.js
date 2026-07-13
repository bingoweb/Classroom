const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-logs-create-test-'));
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

test('Logs Create Response Tests', async (t) => {
    let originalDbRun, originalFsExistsSync, originalFsMkdirSync, originalFsAppendFileSync;

    t.beforeEach(() => {
        originalDbRun = db.run;
        originalFsExistsSync = fs.existsSync;
        originalFsMkdirSync = fs.mkdirSync;
        originalFsAppendFileSync = fs.appendFileSync;
    });

    t.afterEach(() => {
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
        if (originalFsMkdirSync) fs.mkdirSync = originalFsMkdirSync;
        if (originalFsAppendFileSync) fs.appendFileSync = originalFsAppendFileSync;
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

    // A. Actual route discovery
    const postLogsRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/logs' && layer.route.methods.post
    );

    await t.test('A. Route discovery', () => {
        assert.strictEqual(postLogsRoutes.length, 1, 'Exactly one POST /api/logs route must exist');
    });

    const postHandler = postLogsRoutes[0].route.stack[postLogsRoutes[0].route.stack.length - 1].handle;

    await t.test('B. Response-count helper self-regression', () => {
        const res = createMockRes();
        assert.strictEqual(res.responseCount, 0);

        res.status(200).json({ success: true });
        assert.strictEqual(res.responseCount, 1);
        assert.throws(() => res.json({ success: false }), /Multiple responses sent/);
    });

    await t.test('C, D, E, F, H. Core response flow and contract preservation', async (t) => {
        let capturedCallback = null;
        let capturedSql = null;
        let capturedParams = null;
        
        let existsSyncCount = 0;
        let mkdirSyncCount = 0;
        let appendFileSyncCount = 0;
        let appendedContent = null;
        let appendedPath = null;

        db.run = function(sql, params, cb) {
            let actualCb = cb;
            if (typeof params === 'function') {
                actualCb = params;
                params = [];
            }
            if (sql.includes('error_logs')) {
                capturedSql = sql;
                capturedParams = params;
                // Capture but do NOT execute
                if (actualCb) capturedCallback = actualCb.bind(this);
            } else {
                if (actualCb) actualCb.call(this, null);
            }
        };

        fs.existsSync = (path) => {
            existsSyncCount++;
            return false;
        };

        fs.mkdirSync = (path, opts) => {
            mkdirSyncCount++;
        };

        fs.appendFileSync = (path, content, encoding) => {
            appendFileSyncCount++;
            appendedPath = path;
            appendedContent = content;
        };

        const validReq = {
            body: {
                timestamp: '2025-01-01T10:00:00.000Z',
                level: 'error',
                component: 'Frontend',
                message: 'Test message',
                errorDetails: { code: 123 },
                context: { route: '/test' },
                stackTrace: 'Error\n    at test.js:1:1',
                userAgent: 'Test Agent',
                url: 'http://test'
            }
        };

        const res = createMockRes();
        
        // Execute handler synchronously
        postHandler(validReq, res);

        // C. No early response
        await t.test('C. No early response', () => {
            assert.ok(capturedCallback !== null, 'Database callback was not captured');
            assert.strictEqual(res.responseCount, 0, 'Response should not be sent before db callback');
            assert.strictEqual(res.body, null, 'No response body should exist');
            assert.strictEqual(existsSyncCount, 0, 'fs.existsSync should not be called early');
            assert.strictEqual(mkdirSyncCount, 0, 'fs.mkdirSync should not be called early');
            assert.strictEqual(appendFileSyncCount, 0, 'fs.appendFileSync should not be called early');
        });

        // H. SQL contract preservation
        await t.test('H. SQL contract preservation', () => {
            const expectedSql = "INSERT INTO error_logs (timestamp, level, component, message, error_details, context, stack_trace, user_agent, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            assert.strictEqual(capturedSql, expectedSql);
            assert.deepStrictEqual(capturedParams, [
                '2025-01-01T10:00:00.000Z',
                'error',
                'Frontend',
                'Test message',
                '{"code":123}',
                '{"route":"/test"}',
                'Error\n    at test.js:1:1',
                'Test Agent',
                'http://test'
            ]);
        });

        // Test D and E require fresh handlers since we must execute the callback.
    });

    await t.test('E. Database failure', async () => {
        let existsSyncCount = 0;
        let mkdirSyncCount = 0;
        let appendFileSyncCount = 0;

        db.run = function(sql, params, cb) {
            let actualCb = cb;
            if (typeof params === 'function') { actualCb = params; }
            if (sql.includes('error_logs')) {
                if (actualCb) actualCb.call(this, new Error('Test DB Error'));
            } else {
                if (actualCb) actualCb.call(this, null);
            }
        };

        fs.existsSync = (path) => { existsSyncCount++; return true; };
        fs.mkdirSync = (path, opts) => { mkdirSyncCount++; };
        fs.appendFileSync = (path, content, encoding) => { appendFileSyncCount++; };

        const validReq = {
            body: {
                timestamp: '2025-01-01T10:00:00.000Z',
                level: 'error',
                component: 'Frontend',
                message: 'Test message'
            }
        };

        const res = createMockRes();
        
        await new Promise(resolve => {
            const origJson = res.json.bind(res);
            res.json = (data) => {
                origJson(data);
                resolve();
            };
            postHandler(validReq, res);
        });

        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'Failed to save log' });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(mkdirSyncCount, 0);
        assert.strictEqual(appendFileSyncCount, 0);
    });

    await t.test('D. Successful database insert', async () => {
        let existsSyncCount = 0;
        let mkdirSyncCount = 0;
        let appendFileSyncCount = 0;
        let appendedContent = null;
        let appendedPath = null;

        db.run = function(sql, params, cb) {
            let actualCb = cb;
            if (typeof params === 'function') { actualCb = params; }
            if (sql.includes('error_logs')) {
                if (actualCb) actualCb.call(this, null);
            } else {
                if (actualCb) actualCb.call(this, null);
            }
        };

        fs.existsSync = (path) => { existsSyncCount++; return false; }; // trigger mkdir
        fs.mkdirSync = (path, opts) => { mkdirSyncCount++; };
        fs.appendFileSync = (path, content, encoding) => {
            appendFileSyncCount++;
            appendedPath = path;
            appendedContent = content;
        };

        const validReq = {
            body: {
                timestamp: '2025-01-01T10:00:00.000Z',
                level: 'error',
                component: 'Frontend',
                message: 'Test message',
                errorDetails: { code: 123 },
                context: { route: '/test' },
                stackTrace: 'Error\n    at test.js:1:1'
            }
        };

        const res = createMockRes();
        
        await new Promise(resolve => {
            const origJson = res.json.bind(res);
            res.json = (data) => {
                origJson(data);
                resolve();
            };
            postHandler(validReq, res);
        });

        assert.strictEqual(mkdirSyncCount, 1);
        assert.strictEqual(appendFileSyncCount, 1);
        assert.strictEqual(appendedPath, 'logs/slideshow-errors.log');
        
        const expectedLogLine = '[2025-01-01T10:00:00.000Z] [error] [Frontend] Test message | Context: {"route":"/test"} | Error: {"code":123}\nStack: Error\n    at test.js:1:1\n';
        assert.strictEqual(appendedContent, expectedLogLine);
        
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { success: true });
        assert.strictEqual(res.responseCount, 1);
    });

    await t.test('F. Filesystem failure after database success', async () => {
        let appendFileSyncCount = 0;

        db.run = function(sql, params, cb) {
            let actualCb = cb;
            if (typeof params === 'function') { actualCb = params; }
            if (sql.includes('error_logs')) {
                if (actualCb) actualCb.call(this, null);
            } else {
                if (actualCb) actualCb.call(this, null);
            }
        };

        fs.existsSync = (path) => { return true; };
        fs.appendFileSync = (path, content, encoding) => {
            appendFileSyncCount++;
            throw new Error('Disk full');
        };

        const validReq = {
            body: {
                timestamp: '2025-01-01T10:00:00.000Z',
                level: 'error',
                component: 'Frontend',
                message: 'Test message'
            }
        };

        const res = createMockRes();
        
        await new Promise(resolve => {
            const origJson = res.json.bind(res);
            res.json = (data) => {
                origJson(data);
                resolve();
            };
            postHandler(validReq, res);
        });

        assert.strictEqual(appendFileSyncCount, 1);
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { success: true });
        assert.strictEqual(res.responseCount, 1);
    });

    await t.test('G. Validation preservation', () => {
        let dbRunCount = 0;
        let appendFileSyncCount = 0;

        db.run = function(sql, params, cb) {
            let actualCb = cb;
            if (typeof params === 'function') { actualCb = params; }
            if (sql.includes('error_logs')) { dbRunCount++; }
            if (actualCb) actualCb.call(this, null);
        };
        fs.appendFileSync = (path, content, encoding) => { appendFileSyncCount++; };

        const invalidReq = { body: {} }; // missing required fields
        const res = createMockRes();

        postHandler(invalidReq, res);

        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'Invalid log entry' });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(dbRunCount, 0);
        assert.strictEqual(appendFileSyncCount, 0);
    });
});
