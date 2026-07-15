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

    // 5. Strengthen route discovery
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

    // 4. Replace the response helper
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
    const originalLoggerError = Logger.prototype.error;

    t.afterEach(() => {
        db.run = originalDbRun;
        Logger.prototype.error = originalLoggerError;
    });

    // 6. Preserve exact invalid-input responses
    await t.test('6. Invalid input preservation', async (t) => {
        const invalidInputs = [
            { body: null, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: undefined, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: 'not_an_object', expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: [], expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: {}, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { role_type: 'star' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 'abc', role_type: 'star' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 47.5, role_type: 'star' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 47, role_type: 'invalid_role' }, expected: { error: 'Geçersiz rol tipi' } }
        ];

        for (const tc of invalidInputs) {
            let dbRunCalled = false;
            db.run = () => { dbRunCalled = true; };

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
            assert.strictEqual(loggerCalled, false, 'Logger error must not be called');
        }
    });

    const expectedSql = `
            INSERT INTO roles (student_id, role_type)
            SELECT ?, ?
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE student_id = ? AND role_type = ?
            )
        `;
    const expectedParams = [47, 'star', 47, 'star'];

    // 7. Verify the exact multiline SQL (Successful star role)
    await t.test('7. Successful star role', async () => {
        let runSql, runParams;
        db.run = function (sql, params, cb) {
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
        assert.deepStrictEqual(JSON.parse(result.body), {
            id: 123,
            message: 'Rol başarıyla atandı'
        });

        assert.strictEqual(runSql, expectedSql);
        assert.deepStrictEqual(runParams, expectedParams);

        assert.strictEqual(loggerCalled, false, 'Logger must not be called');
    });

    // Duplicate star role
    await t.test('Duplicate star role', async () => {
        let runSql, runParams;
        db.run = function (sql, params, cb) {
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
        assert.deepStrictEqual(JSON.parse(result.body), {
            error: 'Bu öğrenci zaten haftanın yıldızı'
        });

        assert.strictEqual(runSql, expectedSql);
        assert.deepStrictEqual(runParams, expectedParams);
        assert.strictEqual(loggerCalled, false, 'Logger must not be called');
    });

    // Foreign-key classification preservation
    await t.test('Foreign-key classification preservation', async () => {
        const fakeError = new Error('FOREIGN KEY constraint failed on roles');
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

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-fk-request'
        };
        const res = createTrackedResponse();

        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 400);
        assert.deepStrictEqual(JSON.parse(result.body), {
            error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.'
        });

        assert.ok(!result.body.includes('SQLITE_CONSTRAINT'));
        assert.ok(!result.body.includes('FOREIGN KEY'));

        assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
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

    // 8. General database-error redaction - Unique secret marker
    await t.test('8. General database-error redaction - Unique secret marker', async () => {
        const marker = `SENSITIVE_STAR_ROLE_INSERT_DETAIL_${crypto.randomBytes(4).toString('hex')}`;
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

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-error-request'
        };
        const res = createTrackedResponse();

        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), {
            error: 'Rol atanırken hata oluştu'
        });

        assert.ok(!result.body.includes(marker));
        assert.ok(!result.body.includes('SQLITE_IOERR'));

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
        assert.strictEqual(metadata.params, runParams);
        assert.strictEqual(metadata.errorMessage, fakeError.message);
        assert.strictEqual(metadata.errorCode, fakeError.code);

        assert.strictEqual(runSql, expectedSql);
        assert.deepStrictEqual(runParams, expectedParams);
    });

    // 8. General database-error redaction - Legacy message regression
    await t.test('8. General database-error redaction - Legacy message regression', async () => {
        const fakeError = new Error('insert failed');
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

        const req = {
            body: { student_id: 47, role_type: 'star' },
            requestId: 'star-role-legacy-error'
        };
        const res = createTrackedResponse();

        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), {
            error: 'Rol atanırken hata oluştu'
        });

        assert.ok(!result.body.includes('insert failed'));

        assert.strictEqual(loggerCallCount, 1, 'Logger must be called exactly once');
        assert.strictEqual(loggerArgs[0], COMPONENTS.API);
        assert.strictEqual(loggerArgs[1], 'Error inserting role');
        assert.strictEqual(loggerArgs[2], fakeError); // By identity

        const metadata = loggerArgs[3];
        assert.strictEqual(metadata.endpoint, '/api/roles');
        assert.strictEqual(metadata.requestId, 'star-role-legacy-error');
        assert.strictEqual(metadata.studentId, 47);
        assert.strictEqual(metadata.roleType, 'star');
        assert.strictEqual(metadata.query, runSql);
        assert.strictEqual(metadata.params, runParams);
        assert.strictEqual(metadata.errorMessage, fakeError.message);
        assert.strictEqual(metadata.errorCode, fakeError.code);

        assert.strictEqual(runSql, expectedSql);
        assert.deepStrictEqual(runParams, expectedParams);
    });
});
