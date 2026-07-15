const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// 1. Database Isolation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-star-error-redaction-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);

const originalDbPath = process.env.CLASSROOM_DB_PATH;
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

// Require application components
const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

test('Role Star Create Error Redaction Tests', async (t) => {
    // Await scheduled migrations if present
    if (db.scheduleMigrationPromise) {
        await db.scheduleMigrationPromise;
    }

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

            fs.rmdirSync(tempDir);
        } finally {
            global.setInterval = originalSetInterval;
            if (originalDbPath === undefined) {
                delete process.env.CLASSROOM_DB_PATH;
            } else {
                process.env.CLASSROOM_DB_PATH = originalDbPath;
            }
        }
    });

    // 2. Discover the target route handler
    const targetRoute = app._router.stack.find(
        layer => layer.route && layer.route.path === '/api/roles' && layer.route.methods.post
    );

    assert.ok(targetRoute, 'POST /api/roles route must exist');
    assert.strictEqual(targetRoute.route.stack.length, 4, 'Route must have exactly 4 middleware layers');
    
    assert.strictEqual(targetRoute.route.stack[0].name, 'requireAdminSession', 'Layer 1 must be requireAdminSession');
    assert.strictEqual(targetRoute.route.stack[1].name, 'requireCsrfToken', 'Layer 2 must be requireCsrfToken');
    assert.ok(typeof targetRoute.route.stack[2].handle === 'function', 'Layer 3 must be a function');
    assert.ok(typeof targetRoute.route.stack[3].handle === 'function', 'Layer 4 must be a function');
    assert.notStrictEqual(targetRoute.route.stack[2].handle, targetRoute.route.stack[3].handle, 'Layer 3 must be distinct from the final handler');

    const finalHandler = targetRoute.route.stack[3].handle;

    // 3. Response Tracking Helper
    function createTrackedResponse() {
        let resolvePromise, rejectPromise;
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
                
                clearTimeout(this.timeout);
                this.resolveTimeout = setTimeout(() => {
                    resolvePromise({
                        statusCode: this.statusCode,
                        body: this.body,
                        responseCount: this.responseCount
                    });
                }, 5);
                return this;
            }
        };

        res.timeout = setTimeout(() => {
            rejectPromise(new Error('Expected exactly one response, received 0'));
        }, 50);

        res.promise = promise;
        res.cleanup = () => {
            clearTimeout(res.timeout);
            clearTimeout(res.resolveTimeout);
        };

        return res;
    }

    await t.test('Helper regression: Multiple responses sent', async () => {
        const res = createTrackedResponse();
        res.json({ first: true });
        res.json({ second: true });
        
        const result = await res.promise;
        assert.ok(result.responseCount > 1, 'Should detect multiple responses');
        res.cleanup();
    });

    await t.test('Helper regression: Expected exactly one response, received 0', async () => {
        const res = createTrackedResponse();
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
        res.cleanup();
    });

    const originalDbRun = db.run;
    const originalLoggerError = Logger.prototype.error;

    t.afterEach(() => {
        db.run = originalDbRun;
        Logger.prototype.error = originalLoggerError;
    });

    const verifySingleResponse = (result) => {
        assert.strictEqual(result.responseCount, 1, 'Exactly one response must be sent');
    };

    // 1. Invalid input preservation
    await t.test('1. Invalid input preservation', async (t) => {
        const invalidInputs = [
            null,
            undefined,
            'not_an_object',
            {},
            { role_type: 'star' }, // missing student_id
            { student_id: 'abc', role_type: 'star' }, // non-numeric string
            { student_id: 47.5, role_type: 'star' }, // float
            { student_id: 47, role_type: 'invalid_role' } // invalid role type
        ];

        for (const body of invalidInputs) {
            let dbRunCalled = false;
            db.run = () => { dbRunCalled = true; };
            
            let loggerCalled = false;
            Logger.prototype.error = () => { loggerCalled = true; };

            const req = { body, requestId: 'invalid-input-req' };
            const res = createTrackedResponse();
            
            await finalHandler(req, res, () => {});
            const result = await res.promise;
            res.cleanup();

            assert.strictEqual(result.statusCode, 400);
            const parsed = JSON.parse(result.body);
            // The exact message can vary ("Geçersiz öğrenci ID" or "Geçersiz rol türü" etc), 
            // we just ensure the 400 structure and that logic isn't touched
            assert.ok(parsed.error);
            assert.strictEqual(dbRunCalled, false, 'db.run must not be called');
            assert.strictEqual(loggerCalled, false, 'Logger error must not be called');
            verifySingleResponse(result);
        }
    });

    // 2. Successful star role
    await t.test('2. Successful star role', async () => {
        let runSql, runParams;
        db.run = (sql, params, cb) => {
            runSql = sql;
            runParams = params;
            cb.call({ changes: 1, lastID: 123 }, null);
        };

        let loggerCalled = false;
        Logger.prototype.error = () => { loggerCalled = true; };

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-success-request'
        };
        const res = createTrackedResponse();
        
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 200);
        assert.deepEqual(JSON.parse(result.body), {
            id: 123,
            message: 'Rol başarıyla atandı'
        });
        
        assert.ok(runSql.includes('INSERT INTO roles'), 'Should contain exact multiline SQL');
        assert.deepEqual(runParams, [47, 'star', 47, 'star']);
        assert.strictEqual(typeof runParams[0], 'number');
        assert.strictEqual(typeof runParams[2], 'number');
        
        assert.strictEqual(loggerCalled, false, 'Logger must not be called');
        verifySingleResponse(result);
    });

    // 3. Duplicate star role
    await t.test('3. Duplicate star role', async () => {
        let runSql, runParams;
        db.run = (sql, params, cb) => {
            runSql = sql;
            runParams = params;
            cb.call({ changes: 0, lastID: 0 }, null);
        };

        let loggerCalled = false;
        Logger.prototype.error = () => { loggerCalled = true; };

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-dup-request'
        };
        const res = createTrackedResponse();
        
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 400);
        assert.deepEqual(JSON.parse(result.body), {
            error: 'Bu öğrenci zaten haftanın yıldızı'
        });
        
        assert.ok(runSql.includes('INSERT INTO roles'));
        assert.deepEqual(runParams, [47, 'star', 47, 'star']);
        assert.strictEqual(loggerCalled, false, 'Logger must not be called');
        verifySingleResponse(result);
    });

    // 4. Foreign-key classification preservation
    await t.test('4. Foreign-key classification preservation', async () => {
        const fakeError = new Error('FOREIGN KEY constraint failed on roles');
        fakeError.code = 'SQLITE_CONSTRAINT';

        let runSql, runParams;
        db.run = (sql, params, cb) => {
            runSql = sql;
            runParams = params;
            cb.call(this, fakeError);
        };

        let loggerArgs = null;
        Logger.prototype.error = (...args) => {
            loggerArgs = args;
        };

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-fk-request'
        };
        const res = createTrackedResponse();
        
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 400);
        assert.deepEqual(JSON.parse(result.body), {
            error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.'
        });
        
        assert.ok(!result.body.includes('SQLITE_CONSTRAINT'));
        assert.ok(!result.body.includes('FOREIGN KEY'));
        verifySingleResponse(result);

        assert.ok(loggerArgs, 'Logger must be called exactly once');
        assert.strictEqual(loggerArgs[0], COMPONENTS.API);
        assert.strictEqual(loggerArgs[1], 'Error inserting role');
        assert.strictEqual(loggerArgs[2], fakeError); // By identity
        
        const metadata = loggerArgs[3];
        assert.strictEqual(metadata.endpoint, '/api/roles');
        assert.strictEqual(metadata.requestId, 'star-role-fk-request');
        assert.strictEqual(metadata.studentId, 47);
        assert.strictEqual(metadata.roleType, 'star');
        assert.strictEqual(metadata.query, runSql);
        assert.strictEqual(metadata.params, runParams); // Exact parameter-array object
        assert.strictEqual(metadata.errorMessage, fakeError.message);
        assert.strictEqual(metadata.errorCode, fakeError.code);
    });

    // 5. General database-error redaction
    await t.test('5. General database-error redaction', async () => {
        const fakeError = new Error('SENSITIVE_STAR_ROLE_INSERT_DETAIL');
        fakeError.code = 'SQLITE_ERROR';

        let runSql, runParams;
        db.run = (sql, params, cb) => {
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

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-error-request'
        };
        const res = createTrackedResponse();
        
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 500);
        assert.deepEqual(JSON.parse(result.body), {
            error: 'Rol atanırken hata oluştu'
        });
        
        assert.ok(!result.body.includes('SENSITIVE_STAR_ROLE_INSERT_DETAIL'));
        assert.ok(!result.body.includes('SQLITE_ERROR'));
        verifySingleResponse(result);

        assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
        assert.strictEqual(loggerArgs[0], COMPONENTS.API);
        assert.strictEqual(loggerArgs[1], 'Error inserting role');
        assert.strictEqual(loggerArgs[2], fakeError); // By identity
        
        const metadata = loggerArgs[3];
        assert.strictEqual(metadata.endpoint, '/api/roles');
        assert.strictEqual(metadata.requestId, 'star-role-error-request');
        assert.strictEqual(metadata.studentId, 47);
        assert.strictEqual(metadata.roleType, 'star');
        assert.strictEqual(metadata.query, runSql);
        assert.strictEqual(metadata.params, runParams); // Exact parameter-array object
        assert.strictEqual(metadata.errorMessage, fakeError.message);
        assert.strictEqual(metadata.errorCode, fakeError.code);
    });
});
