const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// 1. Database Isolation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-bounded-error-redaction-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);

const originalDbPath = process.env.CLASSROOM_DB_PATH;
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

// Require application components
const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

test('Role Bounded Create Error Redaction Tests', async (t) => {
    t.after(async () => {
        try {
            await new Promise((resolve, reject) => {
                db.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            // Clean up files ONLY after successful close
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

    const roles = ['vice_president', 'duty'];

    for (const rType of roles) {
        await t.test(`Role ${rType}`, async (subT) => {

            // Preserved success
            await subT.test('Successful insertion', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 1, lastID: 999 }, null);
                };

                let loggerCalled = false;
                Logger.prototype.error = () => { loggerCalled = true; };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-success' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 200);
                assert.deepStrictEqual(JSON.parse(result.body), { id: 999, message: 'Rol başarıyla atandı' });
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            // Zero-change classification preservation
            await subT.test('Limit response', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                db.get = function (sql, params, cb) {
                    // count query
                    if (sql.includes('COUNT(*)')) {
                        return cb(null, { count: rType === 'duty' ? 4 : 2 });
                    }
                    cb(null, null); // duplicated handled below
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
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            await subT.test('Duplicate response', async () => {
                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call({ changes: 0, lastID: 0 }, null);
                };

                db.get = function (sql, params, cb) {
                    if (sql.includes('COUNT(*)')) {
                        return cb(null, { count: 0 }); // not limited
                    }
                    if (sql.includes('SELECT 1 FROM roles WHERE')) {
                        return cb(null, { "1": 1 }); // duplicated
                    }
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
                assert.strictEqual(loggerCalled, false, 'Logger must not be called');
            });

            // Foreign-key error behavior
            await subT.test('Foreign-key constraint failed', async () => {
                const fakeError = new Error('FOREIGN KEY constraint failed');
                fakeError.code = 'SQLITE_CONSTRAINT';

                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call(this, fakeError);
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-fk' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(JSON.parse(result.body), {
                    error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.'
                });
                assert.ok(!result.body.includes('FOREIGN KEY'));
                assert.ok(!result.body.includes('SQLITE_CONSTRAINT'));

                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error inserting bounded role');
                assert.strictEqual(loggerArgs[2], fakeError); // By identity
                
                const metadata = loggerArgs[3];
                assert.strictEqual(metadata.endpoint, '/api/roles');
                assert.strictEqual(metadata.requestId, 'req-fk');
                assert.strictEqual(metadata.studentId, 47);
                assert.strictEqual(metadata.roleType, rType);
                assert.strictEqual(metadata.maximum, rType === 'duty' ? 4 : 2);
                assert.strictEqual(metadata.query, runSql);
                assert.strictEqual(metadata.params, runParams);
                assert.strictEqual(metadata.errorMessage, fakeError.message);
                assert.strictEqual(metadata.errorCode, fakeError.code);
                
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
            });

            // General error redaction
            await subT.test('General error - secret marker', async () => {
                const marker = `SECRET_MARKER_${crypto.randomBytes(4).toString('hex')}`;
                const fakeError = new Error(marker);
                fakeError.code = 'SQLITE_IOERR';

                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call(this, fakeError);
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
                assert.ok(!result.body.includes(marker));
                assert.ok(!result.body.includes('SQLITE_IOERR'));

                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error inserting bounded role');
                assert.strictEqual(loggerArgs[2], fakeError); // By identity
                
                const metadata = loggerArgs[3];
                assert.strictEqual(metadata.endpoint, '/api/roles');
                assert.strictEqual(metadata.requestId, 'req-err1');
                assert.strictEqual(metadata.studentId, 47);
                assert.strictEqual(metadata.roleType, rType);
                assert.strictEqual(metadata.maximum, rType === 'duty' ? 4 : 2);
                assert.strictEqual(metadata.query, runSql);
                assert.strictEqual(metadata.params, runParams);
                assert.strictEqual(metadata.errorMessage, fakeError.message);
                assert.strictEqual(metadata.errorCode, fakeError.code);
                
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
            });

            await subT.test('General error - legacy message', async () => {
                const fakeError = new Error('Atomic DB Error');
                fakeError.code = 'SQLITE_ERROR';

                let runSql, runParams;
                db.run = function (sql, params, cb) {
                    runSql = sql;
                    runParams = params;
                    cb.call(this, fakeError);
                };

                let loggerArgs = null;
                let loggerCallCount = 0;
                Logger.prototype.error = (...args) => {
                    loggerCallCount++;
                    loggerArgs = args;
                };

                const req = { body: { student_id: 47, role_type: rType }, requestId: 'req-err2' };
                const res = createTrackedResponse();
                
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();

                assert.strictEqual(result.statusCode, 500);
                assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
                assert.ok(!result.body.includes('Atomic DB Error'));
                assert.ok(!result.body.includes('SQLITE_ERROR'));

                assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
                assert.strictEqual(loggerArgs[0], COMPONENTS.API);
                assert.strictEqual(loggerArgs[1], 'Error inserting bounded role');
                assert.strictEqual(loggerArgs[2], fakeError); // By identity
                
                const metadata = loggerArgs[3];
                assert.strictEqual(metadata.endpoint, '/api/roles');
                assert.strictEqual(metadata.requestId, 'req-err2');
                assert.strictEqual(metadata.studentId, 47);
                assert.strictEqual(metadata.roleType, rType);
                assert.strictEqual(metadata.maximum, rType === 'duty' ? 4 : 2);
                assert.strictEqual(metadata.query, runSql);
                assert.strictEqual(metadata.params, runParams);
                assert.strictEqual(metadata.errorMessage, fakeError.message);
                assert.strictEqual(metadata.errorCode, fakeError.code);
                
                assert.strictEqual(runSql, expectedSql);
                assert.deepStrictEqual(runParams, expectedParams[rType]);
            });
        });
    }
});
