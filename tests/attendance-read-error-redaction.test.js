const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-attendance-read-error-redaction-test-')
);
const testDbPath = path.join(tempDir, 'test.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');
const { getIstanbulDateKey } = require('../backend/date-utils.js');

test('Attendance Read Error Redaction Tests', async (t) => {
    if (db.scheduleMigrationPromise) {
        await db.scheduleMigrationPromise;
    }

    const matchingTodayRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/attendance/today' && layer.route.methods.get
    );

    const matchingDateRoutes = app._router.stack.filter(
        layer => layer.route && layer.route.path === '/api/attendance/:date' && layer.route.methods.get
    );

    assert.strictEqual(matchingTodayRoutes.length, 1, 'Exactly one GET /api/attendance/today route must exist');
    assert.strictEqual(matchingDateRoutes.length, 1, 'Exactly one GET /api/attendance/:date route must exist');

    const todayRouteIndex = app._router.stack.findIndex(layer => layer.route && layer.route.path === '/api/attendance/today' && layer.route.methods.get);
    const dateRouteIndex = app._router.stack.findIndex(layer => layer.route && layer.route.path === '/api/attendance/:date' && layer.route.methods.get);
    
    assert.ok(todayRouteIndex < dateRouteIndex, 'The today route must be registered before the parameterized route');

    const todayRouteLayer = matchingTodayRoutes[0];
    const todayMiddlewares = todayRouteLayer.route.stack;
    const todayHandler = todayMiddlewares[todayMiddlewares.length - 1].handle;
    
    // Check unexpected auth middlewares
    assert.strictEqual(todayMiddlewares.length, 1, 'Today route should not have unexpected middlewares');

    const dateRouteLayer = matchingDateRoutes[0];
    const dateMiddlewares = dateRouteLayer.route.stack;
    const dateHandler = dateMiddlewares[dateMiddlewares.length - 1].handle;

    assert.strictEqual(dateMiddlewares.length, 1, 'Date route should not have unexpected middlewares');

    let originalDbAll;
    let originalLoggerError;

    t.beforeEach(() => {
        originalDbAll = db.all;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        db.all = originalDbAll;
        Logger.prototype.error = originalLoggerError;
    });

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

    t.after(async () => {
        try {
            await closeDatabase(db);
        } finally {
            try {
                removeFileIfPresent(fs, testDbPath);
                removeFileIfPresent(fs, testDbPath + '-journal');
                removeFileIfPresent(fs, testDbPath + '-wal');
                removeFileIfPresent(fs, testDbPath + '-shm');
                try {
                    fs.rmdirSync(tempDir);
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        throw err;
                    }
                }
            } finally {
                global.setInterval = originalSetInterval;
                if (originalDbPath === undefined) {
                    delete process.env.CLASSROOM_DB_PATH;
                } else {
                    process.env.CLASSROOM_DB_PATH = originalDbPath;
                }
            }
        }
    });

    function createMockRes() {
        const res = {
            statusCode: 200,
            responseCount: 0,
            body: null,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.responseCount++;
                if (this.responseCount > 1) {
                    throw new Error('Response sent more than once');
                }
                this.body = data;
                return this;
            }
        };
        return res;
    }

    await t.test('1. Successful today-route test', (subT, done) => {
        let allCalls = 0;
        
        const expectedSql = `SELECT attendance.*, students.name, students.gender 
                 FROM attendance 
                 JOIN students ON attendance.student_id = students.id 
                 WHERE attendance.date = ? 
                 ORDER BY students.name`;
                 
        const expectedDate = getIstanbulDateKey();
        
        const mockRows = [{ id: 1, name: 'Ali', status: 'present' }];

        db.all = (sql, params, cb) => {
            allCalls++;
            assert.strictEqual(sql, expectedSql);
            assert.deepEqual(params, [expectedDate]);
            cb(null, mockRows);
        };

        let loggerCalled = false;
        Logger.prototype.error = function() {
            loggerCalled = true;
        };

        const req = {};
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            
            assert.strictEqual(this.statusCode, 200);
            assert.strictEqual(this.responseCount, 1);
            
            assert.strictEqual(allCalls, 1);
            assert.strictEqual(loggerCalled, false);
            
            assert.strictEqual(this.body, mockRows);
            
            done();
        };

        todayHandler(req, res);
    });

    await t.test('2. Successful date-route test', (subT, done) => {
        let allCalls = 0;
        
        const expectedSql = `SELECT attendance.*, students.name, students.gender 
                 FROM attendance 
                 JOIN students ON attendance.student_id = students.id 
                 WHERE attendance.date = ? 
                 ORDER BY students.name`;
                 
        const expectedDate = '2026-07-15';
        
        const mockRows = [{ id: 2, name: 'Ayşe', status: 'absent' }];

        db.all = (sql, params, cb) => {
            allCalls++;
            assert.strictEqual(sql, expectedSql);
            assert.deepEqual(params, [expectedDate]);
            cb(null, mockRows);
        };

        let loggerCalled = false;
        Logger.prototype.error = function() {
            loggerCalled = true;
        };

        const req = { params: { date: '2026-07-15' } };
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            
            assert.strictEqual(this.statusCode, 200);
            assert.strictEqual(this.responseCount, 1);
            
            assert.strictEqual(allCalls, 1);
            assert.strictEqual(loggerCalled, false);
            
            assert.strictEqual(this.body, mockRows);
            
            done();
        };

        dateHandler(req, res);
    });

    await t.test('3. Today-route error test', (subT, done) => {
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_ATTENDANCE_TODAY_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.all = (sql, params, cb) => {
            allCalls++;
            capturedSql = sql;
            capturedParams = params;
            cb(databaseError, null);
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerCalls++;
            loggedComponent = component;
            loggedMessage = message;
            loggedError = err;
            loggedMeta = meta;
        };

        const req = {};
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 500);
            assert.deepEqual(this.body, { error: 'Yoklama bilgileri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(allCalls, 1);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, "Error fetching today's attendance");
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        todayHandler(req, res);
    });

    await t.test('4. Date-route error test', (subT, done) => {
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_ATTENDANCE_DATE_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.all = (sql, params, cb) => {
            allCalls++;
            capturedSql = sql;
            capturedParams = params;
            cb(databaseError, null);
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerCalls++;
            loggedComponent = component;
            loggedMessage = message;
            loggedError = err;
            loggedMeta = meta;
        };

        const req = { params: { date: '2026-07-15' } };
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 500);
            assert.deepEqual(this.body, { error: 'Yoklama bilgileri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(allCalls, 1);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching attendance by date');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            assert.deepEqual(loggedMeta.params, ['2026-07-15']);
            
            done();
        };

        dateHandler(req, res);
    });
});
