const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-stats-read-error-redaction-test-')
);
const testDbPath = path.join(tempDir, 'test.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server');
const db = require('../backend/database');
const { Logger, COMPONENTS } = require('../backend/logger');

test('Stats Read Error Redaction Tests', async (t) => {
    if (db.scheduleMigrationPromise) {
        try {
            await db.scheduleMigrationPromise;
        } catch (err) {
            // Ignore migration errors in isolated tests
        }
    }

    const matchingRoutes = app._router.stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/stats' &&
            layer.route.methods.get
    );

    assert.strictEqual(
        matchingRoutes.length,
        1,
        'Exactly one matching GET /api/stats route must exist'
    );
    
    const routeLayer = matchingRoutes[0];
    
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbGet;
    let originalDbAll;
    let originalLoggerError;

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbAll = db.all;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        db.get = originalDbGet;
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

    function removeDirectoryIfPresent(fsApi, directoryPath) {
        try {
            fsApi.rmdirSync(directoryPath);
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
                removeDirectoryIfPresent(fs, tempDir);
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
    
    await t.test('1. Successful response path', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let capturedToday;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                assert.strictEqual(sql, "SELECT COUNT(*) as total FROM students");
                assert.deepEqual(params, []);
                cb(null, { total: 10 });
            } else if (getCalls === 2) {
                assert.strictEqual(sql, "SELECT COUNT(*) as girls FROM students WHERE gender = 'F'");
                assert.deepEqual(params, []);
                cb(null, { girls: 6 });
            } else if (getCalls === 3) {
                assert.strictEqual(sql, "SELECT COUNT(*) as boys FROM students WHERE gender = 'M'");
                assert.deepEqual(params, []);
                cb(null, { boys: 4 });
            } else if (getCalls === 4) {
                assert.strictEqual(sql, "SELECT COUNT(*) as present FROM attendance WHERE date = ? AND status = 'present'");
                assert.strictEqual(params.length, 1);
                capturedToday = params[0];
                cb(null, { present: 8 });
            }
        };
        
        db.all = (sql, params, cb) => {
            allCalls++;
            assert.strictEqual(sql, "SELECT students.id, students.name, students.photo, students.gender FROM attendance JOIN students ON attendance.student_id = students.id WHERE attendance.date = ? AND attendance.status = 'absent'");
            assert.deepEqual(params, [capturedToday]);
            cb(null, [
                { id: 1, name: 'Ali', photo: null, gender: 'M' },
                { id: 2, name: 'Ayşe', photo: null, gender: 'F' }
            ]);
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
            
            assert.strictEqual(getCalls, 4);
            assert.strictEqual(allCalls, 1);
            assert.strictEqual(loggerCalled, false);
            
            assert.deepEqual(this.body, {
                total: 10,
                girls: 6,
                boys: 4,
                todayPresent: 8,
                todayAbsent: 2,
                absentStudents: [
                    { id: 1, name: 'Ali', photo: null, gender: 'M' },
                    { id: 2, name: 'Ayşe', photo: null, gender: 'F' }
                ]
            });
            
            done();
        };

        handler(req, res);
    });

    await t.test('2. Error fetching total student count', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_STATS_TOTAL_COUNT_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                capturedSql = sql;
                capturedParams = params;
                cb(databaseError, null);
            }
        };
        
        db.all = () => {
            allCalls++;
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
            assert.deepEqual(this.body, { error: 'Sınıf istatistikleri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(getCalls, 1);
            assert.strictEqual(allCalls, 0);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching total student count');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        handler(req, res);
    });

    await t.test('3. Error fetching female student count', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_STATS_FEMALE_COUNT_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                cb(null, { total: 10 });
            } else if (getCalls === 2) {
                capturedSql = sql;
                capturedParams = params;
                cb(databaseError, null);
            }
        };
        
        db.all = () => {
            allCalls++;
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
            assert.deepEqual(this.body, { error: 'Sınıf istatistikleri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(getCalls, 2);
            assert.strictEqual(allCalls, 0);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching female student count');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        handler(req, res);
    });

    await t.test('4. Error fetching male student count', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_STATS_MALE_COUNT_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                cb(null, { total: 10 });
            } else if (getCalls === 2) {
                cb(null, { girls: 6 });
            } else if (getCalls === 3) {
                capturedSql = sql;
                capturedParams = params;
                cb(databaseError, null);
            }
        };
        
        db.all = () => {
            allCalls++;
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
            assert.deepEqual(this.body, { error: 'Sınıf istatistikleri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(getCalls, 3);
            assert.strictEqual(allCalls, 0);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching male student count');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        handler(req, res);
    });

    await t.test('5. Error fetching present student count', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_STATS_PRESENT_COUNT_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                cb(null, { total: 10 });
            } else if (getCalls === 2) {
                cb(null, { girls: 6 });
            } else if (getCalls === 3) {
                cb(null, { boys: 4 });
            } else if (getCalls === 4) {
                capturedSql = sql;
                capturedParams = params;
                cb(databaseError, null);
            }
        };
        
        db.all = () => {
            allCalls++;
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
            assert.deepEqual(this.body, { error: 'Sınıf istatistikleri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(getCalls, 4);
            assert.strictEqual(allCalls, 0);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching present student count');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        handler(req, res);
    });

    await t.test('6. Error fetching absent student details', (subT, done) => {
        let getCalls = 0;
        let allCalls = 0;
        let loggerCalls = 0;
        let loggedComponent, loggedMessage, loggedError, loggedMeta;
        let capturedSql, capturedParams;
        
        const secretMarker = 'SENSITIVE_STATS_ABSENT_DETAILS_DB_DETAIL';
        const databaseError = new Error(secretMarker);

        db.get = (sql, params, cb) => {
            getCalls++;
            if (getCalls === 1) {
                cb(null, { total: 10 });
            } else if (getCalls === 2) {
                cb(null, { girls: 6 });
            } else if (getCalls === 3) {
                cb(null, { boys: 4 });
            } else if (getCalls === 4) {
                cb(null, { present: 8 });
            }
        };
        
        db.all = (sql, params, cb) => {
            allCalls++;
            if (allCalls === 1) {
                capturedSql = sql;
                capturedParams = params;
                cb(databaseError, null);
            }
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
            assert.deepEqual(this.body, { error: 'Sınıf istatistikleri alınırken hata oluştu' });
            assert.strictEqual(this.responseCount, 1);
            
            const serializedBody = JSON.stringify(this.body);
            assert.ok(!serializedBody.includes(secretMarker));

            assert.strictEqual(getCalls, 4);
            assert.strictEqual(allCalls, 1);

            assert.strictEqual(loggerCalls, 1);
            assert.strictEqual(loggedComponent, COMPONENTS.API);
            assert.strictEqual(loggedMessage, 'Error fetching absent student details');
            assert.strictEqual(loggedError, databaseError);
            assert.strictEqual(loggedMeta.query, capturedSql);
            assert.strictEqual(loggedMeta.params, capturedParams);
            
            done();
        };

        handler(req, res);
    });
});
