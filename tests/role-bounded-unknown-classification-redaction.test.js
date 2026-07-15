const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// Database Isolation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-bounded-unknown-redaction-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);

const originalDbPath = process.env.CLASSROOM_DB_PATH;
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

test('Role Bounded Unknown Classification Redaction Tests', async (t) => {
    t.after(async () => {
        try {
            await new Promise((resolve, reject) => {
                db.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            const filesToRemove = [
                testDbPath,
                `${testDbPath}-journal`,
                `${testDbPath}-wal`,
                `${testDbPath}-shm`
            ];

            for (const file of filesToRemove) {
                try {
                    fs.unlinkSync(file);
                } catch (err) {
                    if (err.code !== 'ENOENT') throw err;
                }
            }

            try {
                fs.rmdirSync(tempDir);
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }
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

    // Exact route discovery
    const roleRoutes = app._router.stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/roles' &&
            layer.route.methods.post
    );

    assert.strictEqual(roleRoutes.length, 1);
    assert.strictEqual(roleRoutes[0].route.stack.length, 4, 'Route must have exactly 4 middleware layers');
    
    assert.strictEqual(roleRoutes[0].route.stack[0].name, 'requireAdminSession', 'Layer 1 must be requireAdminSession');
    assert.strictEqual(roleRoutes[0].route.stack[1].name, 'requireCsrfToken', 'Layer 2 must be requireCsrfToken');
    assert.ok(typeof roleRoutes[0].route.stack[2].handle === 'function', 'Layer 3 must be a function');
    assert.ok(typeof roleRoutes[0].route.stack[3].handle === 'function', 'Layer 4 must be a function');
    assert.notStrictEqual(roleRoutes[0].route.stack[2].handle, roleRoutes[0].route.stack[3].handle, 'Layer 3 must be distinct from the final handler');

    const finalHandler = roleRoutes[0].route.stack[3].handle;

    // Response helper
    function createTrackedResponse() {
        let resolvePromise, rejectPromise;
        let isCompleted = false;
        
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        const res = {
            statusCode: 200,
            body: null,
            responseCount: 0,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                this.responseCount++;
                this.body = JSON.stringify(data);
                
                if (this.responseCount === 1) {
                    clearTimeout(this.zeroTimer);
                    this.successTimer = setTimeout(() => {
                        if (!isCompleted) {
                            isCompleted = true;
                            resolvePromise({
                                statusCode: this.statusCode,
                                body: this.body,
                                responseCount: this.responseCount
                            });
                        }
                    }, 5);
                } else if (this.responseCount > 1) {
                    clearTimeout(this.successTimer);
                    if (!isCompleted) {
                        isCompleted = true;
                        rejectPromise(new Error('Multiple responses sent'));
                    }
                }
                return this;
            }
        };

        res.zeroTimer = setTimeout(() => {
            if (!isCompleted) {
                isCompleted = true;
                rejectPromise(new Error('Expected exactly one response, received 0'));
            }
        }, 50);

        res.promise = promise;
        res.cleanup = () => {
            clearTimeout(res.zeroTimer);
            clearTimeout(res.successTimer);
        };

        return res;
    }

    await t.test('Helper regression: Multiple responses sent', async () => {
        const res = createTrackedResponse();
        res.json({ first: true });
        res.json({ second: true });
        
        await assert.rejects(res.promise, /Multiple responses sent/);
        res.cleanup();
    });

    await t.test('Helper regression: Expected exactly one response, received 0', async () => {
        const res = createTrackedResponse();
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
        res.cleanup();
    });

    const originalDbRun = db.run;
    const originalDbGet = db.get;
    const originalLoggerError = Logger.prototype.error;

    t.afterEach(() => {
        db.run = originalDbRun;
        db.get = originalDbGet;
        Logger.prototype.error = originalLoggerError;
    });

    // Validation preservation
    await t.test('Invalid input preservation', async (t) => {
        const invalidInputs = [
            { body: null, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: undefined, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: 'not_an_object', expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: [], expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: {}, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { role_type: 'duty' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 'abc', role_type: 'duty' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 47.5, role_type: 'duty' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 47, role_type: 'invalid_role' }, expected: { error: 'Geçersiz rol tipi' } }
        ];

        for (const tc of invalidInputs) {
            let dbRunCalled = false;
            let dbGetCalled = false;
            db.run = () => { dbRunCalled = true; };
            db.get = () => { dbGetCalled = true; };
            
            let loggerCalled = false;
            Logger.prototype.error = () => { loggerCalled = true; };

            const req = { body: tc.body, requestId: 'invalid-input-req' };
            const res = createTrackedResponse();
            
            await finalHandler(req, res, () => {});
            const result = await res.promise;
            res.cleanup();

            assert.strictEqual(result.statusCode, 400);
            assert.deepStrictEqual(JSON.parse(result.body), tc.expected);
            assert.strictEqual(dbRunCalled, false, 'db.run must not be called');
            assert.strictEqual(dbGetCalled, false, 'db.get must not be called');
            assert.strictEqual(loggerCalled, false, 'Logger error must not be called');
        }
    });

    const expectedSql = `
            INSERT INTO roles (student_id, role_type)
            SELECT ?, ?
            WHERE EXISTS (
                SELECT 1
                FROM students
                WHERE id = ?
            )
            AND NOT EXISTS (
                SELECT 1
                FROM roles
                WHERE student_id = ?
                  AND role_type = ?
            )
            AND (
                SELECT COUNT(*)
                FROM roles
                WHERE role_type = ?
            ) < ?
        `;

    const expectedParams = {
        'vice_president': [47, 'vice_president', 47, 47, 'vice_president', 'vice_president', 2],
        'duty': [47, 'duty', 47, 47, 'duty', 'duty', 4]
    };

    const countSqlPassedToDbGet = "SELECT COUNT(*) as count FROM roles WHERE role_type = ?";
    const expectedCountParams = {
        'vice_president': ['vice_president'],
        'duty': ['duty']
    };

    const duplicateSqlPassedToDbGet = "SELECT 1 FROM roles WHERE student_id = ? AND role_type = ?";
    const expectedDuplicateParams = {
        'vice_president': [47, 'vice_president'],
        'duty': [47, 'duty']
    };

    const studentSqlPassedToDbGet = "SELECT 1 FROM students WHERE id = ?";
    const expectedStudentParams = [47];

    const roles = ['vice_president', 'duty'];

    for (const rType of roles) {
        await t.test(`Role ${rType}`, async (subT) => {

            // Unknown classification redaction test
            await subT.test('Unknown classification redaction', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let actualCountSql, actualCountParams;
                let actualDupSql, actualDupParams;
                let actualStuSql, actualStuParams;
                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        actualCountSql = sql;
                        actualCountParams = params;
                        return cb(null, { count: 0 });
                    }
                    if (sql === duplicateSqlPassedToDbGet) {
                        actualDupSql = sql;
                        actualDupParams = params;
                        return cb(null, null);
                    }
                    if (sql === studentSqlPassedToDbGet) {
                        actualStuSql = sql;
                        actualStuParams = params;
                        return cb(null, { "1": 1 });
                    }
                    throw new Error('Should not reach other queries');
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-err1' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 500);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
                assert.ok(!result.body.includes('Bilinmeyen hata'));
                assert.ok(!result.body.includes('Bounded role classification reached unknown state'));

                assert.strictEqual(getCount, 3, 'Count, duplicate, and student queries should run');
                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Bounded role classification reached unknown state');
                assert.ok(loggerArgs[2] instanceof Error);
                assert.strictEqual(loggerArgs[2].message, 'Bounded role classification reached unknown state');
                
                const metadata = loggerArgs[3];
                assert.strictEqual(metadata.endpoint, '/api/roles');
                assert.strictEqual(metadata.requestId, 'req-err1');
                assert.strictEqual(metadata.studentId, 47);
                assert.strictEqual(metadata.roleType, rType);
                assert.strictEqual(metadata.maximum, rType === 'duty' ? 4 : 2);
                
                assert.strictEqual(metadata.countQuery, countSqlPassedToDbGet);
                assert.strictEqual(metadata.countQuery, actualCountSql); // identity
                assert.strictEqual(metadata.countParams, actualCountParams); // identity
                assert.deepStrictEqual(metadata.countParams, expectedCountParams[rType]); // content
                
                assert.strictEqual(metadata.duplicateQuery, duplicateSqlPassedToDbGet);
                assert.strictEqual(metadata.duplicateQuery, actualDupSql); // identity
                assert.strictEqual(metadata.duplicateParams, actualDupParams); // identity
                assert.deepStrictEqual(metadata.duplicateParams, expectedDuplicateParams[rType]); // content
                
                assert.strictEqual(metadata.studentQuery, studentSqlPassedToDbGet);
                assert.strictEqual(metadata.studentQuery, actualStuSql); // identity
                assert.strictEqual(metadata.studentParams, actualStuParams); // identity
                assert.deepStrictEqual(metadata.studentParams, expectedStudentParams); // content
                
                assert.strictEqual(metadata.errorMessage, 'Bounded role classification reached unknown state');
                
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
            });

            // Preserved classification behavior
            await subT.test('Successful atomic insert', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 1, lastID: 100 }, null);
                };

                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    cb(null, null);
                };

                let loggerCalled = false;
                Logger.prototype.error = () => { loggerCalled = true; };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-succ' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 200);
                assert.strictEqual(getCount, 0, 'No classification query should run');
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            await subT.test('Limit classification', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(null, { count: rType === 'duty' ? 4 : 2 });
                    }
                    cb(null, null);
                };

                let loggerCalled = false;
                Logger.prototype.error = () => { loggerCalled = true; };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-limit' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 400);
                const limitMsg = rType === 'duty' ? 'En fazla 4 nöbetçi atanabilir' : 'En fazla 2 başkan yardımcısı olabilir';
                assert.deepStrictEqual(JSON.parse(result.body), { error: limitMsg });
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
                assert.strictEqual(getCount, 1, 'Only count query should run');
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            await subT.test('Duplicate-found classification', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let actualDupSql, actualDupParams;
                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(null, { count: 0 }); // below limit
                    }
                    if (sql === duplicateSqlPassedToDbGet) {
                        actualDupSql = sql;
                        actualDupParams = params;
                        return cb(null, { "1": 1 }); // duplicated
                    }
                    cb(null, null);
                };

                let loggerCalled = false;
                Logger.prototype.error = () => { loggerCalled = true; };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-dup' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 400);
                const dupMsg = rType === 'duty' ? 'Bu öğrenci zaten nöbetçi' : 'Bu öğrenci zaten başkan yardımcısı';
                assert.deepStrictEqual(JSON.parse(result.body), { error: dupMsg });
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
                assert.strictEqual(getCount, 2, 'Should run count query and duplicate query');
                assert.strictEqual(actualDupSql, duplicateSqlPassedToDbGet);
                assert.deepStrictEqual(actualDupParams, expectedDuplicateParams[rType]);
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            await subT.test('Missing-student classification', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let actualStuSql, actualStuParams;
                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(null, { count: 0 }); // below limit
                    }
                    if (sql === duplicateSqlPassedToDbGet) {
                        return cb(null, null); // not duplicated
                    }
                    if (sql === studentSqlPassedToDbGet) {
                        actualStuSql = sql;
                        actualStuParams = params;
                        return cb(null, null); // missing student
                    }
                    cb(null, null);
                };

                let loggerCalled = false;
                Logger.prototype.error = () => { loggerCalled = true; };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-miss' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
                assert.strictEqual(getCount, 3, 'Should run count, duplicate, and student queries');
                assert.strictEqual(actualStuSql, studentSqlPassedToDbGet);
                assert.deepStrictEqual(actualStuParams, expectedStudentParams);
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            // Existing query-error preservation
            await subT.test('Count-query error', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(new Error('count error'));
                    }
                    throw new Error('Should not reach other queries');
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-c-err' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 500);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });

                assert.strictEqual(getCount, 1, 'Only count query should run');
                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error counting bounded roles');
            });

            await subT.test('Duplicate-query error', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(null, { count: 0 });
                    }
                    if (sql === duplicateSqlPassedToDbGet) {
                        return cb(new Error('dup error'));
                    }
                    throw new Error('Should not reach other queries');
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-d-err' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 500);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });

                assert.strictEqual(getCount, 2, 'Count and duplicate queries should run');
                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error checking bounded role duplicate');
            });

            await subT.test('Student-query error', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                let getCount = 0;
                db.get = function (sql, params, cb) {
                    getCount++;
                    if (sql === countSqlPassedToDbGet) {
                        return cb(null, { count: 0 });
                    }
                    if (sql === duplicateSqlPassedToDbGet) {
                        return cb(null, null);
                    }
                    if (sql === studentSqlPassedToDbGet) {
                        return cb(new Error('stu error'));
                    }
                    throw new Error('Should not reach other queries');
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-s-err' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 500);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });

                assert.strictEqual(getCount, 3, 'Count, duplicate, and student queries should run');
                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error checking bounded role student');
            });
        });
    }
});
