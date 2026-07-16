const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// Database Isolation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-president-insert-redaction-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);

const originalDbPath = process.env.CLASSROOM_DB_PATH;
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger, COMPONENTS } = require('../backend/logger.js');

test('Role President Insert Error Redaction Tests', async (t) => {
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

    assert.strictEqual(roleRoutes.length, 1, 'Exactly one matching POST route exists');
    assert.strictEqual(roleRoutes[0].route.stack.length, 4, 'Route must have exactly 4 middleware layers');

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

    const serverSource = fs.readFileSync(
        path.join(__dirname, '../backend/server.js'),
        'utf8'
    );

    await t.test('Production source contains no request-ID bypass', async () => {
        assert.ok(
            !serverSource.includes("Rol atanırken hata oluştu: ' + (err.message || 'Bilinmeyen hata')"),
            'Production server source must not contain the rejected raw unknown-classification response'
        );
        assert.ok(
            serverSource.includes("const insertSql = \"INSERT INTO roles (student_id, role_type) VALUES (?, ?)\";"),
            'Production server source must define named insertSql'
        );
        assert.ok(
            serverSource.includes("const insertParams = [studentId, role_type];"),
            'Production server source must define named insertParams'
        );
    });

    const originalDbGet = db.get;
    const originalDbRun = db.run;
    const originalDbCreateIsolatedConnection = db.createIsolatedConnection;
    const originalLogError = Logger.prototype.error;

    t.beforeEach(() => {
        db.createIsolatedConnection = function(cb) {
            const fakeDb = {
                serialize: (...args) => db.serialize(...args),
                prepare: (...args) => db.prepare(...args),
                run: (...args) => db.run(...args),
                get: (...args) => db.get(...args),
                all: (...args) => db.all(...args),
                close: (closeCb) => { if (closeCb) closeCb(null); }
            };
            cb(null, fakeDb);
        };
    });

    t.afterEach(() => {
        db.get = originalDbGet;
        db.run = originalDbRun;
        db.createIsolatedConnection = originalDbCreateIsolatedConnection;
        Logger.prototype.error = originalLogError;
    });

    await t.test('Invalid-input preservation', async () => {
        const testCases = [
            { body: {}, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 'abc', role_type: 'president' }, expected: { error: 'Geçerli bir öğrenci seçilmelidir' } },
            { body: { student_id: 47, role_type: 'unknown' }, expected: { error: 'Geçersiz rol tipi' } }
        ];

        for (const tc of testCases) {
            let dbGetCalled = false;
            let dbRunCalled = false;
            let loggerCalled = false;

            db.get = () => { dbGetCalled = true; };
            db.run = () => { dbRunCalled = true; };
            Logger.prototype.error = () => { loggerCalled = true; };

            const req = { body: tc.body };
            const res = createTrackedResponse();
            await finalHandler(req, res, () => {});
            const result = await res.promise;
            res.cleanup();

            assert.strictEqual(result.statusCode, 400);
            assert.deepStrictEqual(JSON.parse(result.body), tc.expected);
            assert.strictEqual(dbGetCalled, false, 'db.get must not be called');
            assert.strictEqual(dbRunCalled, false, 'db.run must not be called');
            assert.strictEqual(loggerCalled, false, 'Logger error must not be called');
        }
    });

    const expectedStudentSql = "SELECT id FROM students WHERE id = ?";
    const expectedStudentParams = [47];
    const expectedBeginSql = "BEGIN IMMEDIATE";
    const expectedDeleteSql = "DELETE FROM roles WHERE role_type = ?";
    const expectedDeleteParams = ['president'];
    const expectedInsertSql = "INSERT INTO roles (student_id, role_type) VALUES (?, ?)";
    const expectedInsertParams = [47, 'president'];
    const expectedCommitSql = "COMMIT";
    const expectedRollbackSql = "ROLLBACK";

    await t.test('1. Secret-marker INSERT error', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const secretError = new Error('secret-marker-error-8xj4k');
        secretError.code = 'SQLITE_CONSTRAINT';

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        let actualInsertSql = null;
        let actualInsertParams = null;
        
        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('INSERT')) {
                actualInsertSql = sql;
                actualInsertParams = params;
                cb(secretError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-secret' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        const rawBody = result.body;
        assert.ok(!rawBody.includes('secret-marker-error-8xj4k'), 'Response must not contain original error');
        assert.ok(!rawBody.includes('Bilinmeyen hata'), 'Response must not contain raw Bilinmeyen hata string');
        assert.ok(!rawBody.includes('Error inserting role'), 'Response must not contain internal logger message');

        assert.strictEqual(runCalls.length, 4);
        assert.strictEqual(runCalls[0].sql, expectedBeginSql);
        assert.strictEqual(runCalls[1].sql, expectedDeleteSql);
        assert.deepStrictEqual(runCalls[1].params, expectedDeleteParams);
        assert.strictEqual(runCalls[2].sql, expectedInsertSql);
        assert.deepStrictEqual(runCalls[2].params, expectedInsertParams);
        assert.strictEqual(runCalls[3].sql, expectedRollbackSql);
        
        assert.strictEqual(actualInsertSql, expectedInsertSql);
        assert.deepStrictEqual(actualInsertParams, expectedInsertParams);

        assert.strictEqual(errorLogCalls.length, 1, 'Logger.error must be called exactly once for the insertion failure');

        const errorLogArgs = errorLogCalls[0];
        assert.strictEqual(errorLogArgs[0], COMPONENTS.API);
        assert.strictEqual(errorLogArgs[1], 'Error inserting role');
        assert.strictEqual(errorLogArgs[2], secretError);
        
        const metadata = errorLogArgs[3];
        assert.strictEqual(metadata.endpoint, '/api/roles');
        assert.strictEqual(metadata.requestId, 'req-secret');
        assert.strictEqual(metadata.studentId, 47);
        assert.strictEqual(metadata.roleType, 'president');
        assert.strictEqual(metadata.query, actualInsertSql);
        assert.strictEqual(metadata.params, actualInsertParams); // strictly identical
        assert.strictEqual(metadata.errorMessage, secretError.message);
        assert.strictEqual(metadata.errorCode, secretError.code);
    });

    await t.test('2. Empty-message INSERT error', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const emptyError = new Error('');
        emptyError.code = 'SQLITE_CONSTRAINT';

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        let actualInsertSql = null;
        let actualInsertParams = null;

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('INSERT')) {
                actualInsertSql = sql;
                actualInsertParams = params;
                cb(emptyError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-empty' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        const rawBody = result.body;
        assert.ok(!rawBody.includes('Bilinmeyen hata'), 'Response must not contain raw Bilinmeyen hata string');
        assert.ok(!rawBody.includes('Error inserting role'), 'Response must not contain internal logger message');

        assert.strictEqual(actualInsertSql, expectedInsertSql);
        assert.deepStrictEqual(actualInsertParams, expectedInsertParams);

        assert.strictEqual(errorLogCalls.length, 1, 'Logger.error must be called exactly once for the insertion failure');

        const errorLogArgs = errorLogCalls[0];
        assert.strictEqual(errorLogArgs[0], COMPONENTS.API);
        assert.strictEqual(errorLogArgs[1], 'Error inserting role');
        assert.strictEqual(errorLogArgs[2], emptyError);
        
        const metadata = errorLogArgs[3];
        assert.strictEqual(metadata.query, actualInsertSql);
        assert.strictEqual(metadata.params, actualInsertParams); // strictly identical
        assert.strictEqual(metadata.errorMessage, emptyError.message);
        assert.strictEqual(metadata.errorCode, emptyError.code);
    });

    await t.test('3. Foreign-key INSERT error', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const fkError = new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed');
        fkError.code = 'SQLITE_CONSTRAINT';

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        let actualInsertSql = null;
        let actualInsertParams = null;

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('INSERT')) {
                actualInsertSql = sql;
                actualInsertParams = params;
                cb(fkError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-fk' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 400);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
        
        const rawBody = result.body;
        assert.ok(!rawBody.includes('SQLITE_CONSTRAINT'), 'Response must not contain raw SQLite details');
        
        assert.strictEqual(errorLogCalls.length, 1, 'Logger.error must be called exactly once for the insertion failure');

        const errorLogArgs = errorLogCalls[0];
        assert.strictEqual(errorLogArgs[0], COMPONENTS.API);
        assert.strictEqual(errorLogArgs[1], 'Error inserting role');
        assert.strictEqual(errorLogArgs[2], fkError);
        
        const metadata = errorLogArgs[3];
        assert.strictEqual(metadata.query, actualInsertSql);
        assert.strictEqual(metadata.params, actualInsertParams); // strictly identical
        assert.strictEqual(metadata.errorMessage, fkError.message);
        assert.strictEqual(metadata.errorCode, fkError.code);
    });

    await t.test('4. INSERT failure plus rollback failure', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const insertError = new Error('insert-failed-123');
        insertError.code = 'SQLITE_CONSTRAINT';
        
        const rollbackError = new Error('rollback-failed-456');

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('INSERT')) {
                cb(insertError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(rollbackError);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-multi-err' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        const rawBody = result.body;
        assert.ok(!rawBody.includes('insert-failed-123'), 'Response must not contain original insert error');
        assert.ok(!rawBody.includes('rollback-failed-456'), 'Response must not contain original rollback error');
        
        assert.strictEqual(errorLogCalls.length, 2, 'Logger.error must be called twice');

        assert.strictEqual(errorLogCalls[0][0], COMPONENTS.API);
        assert.strictEqual(errorLogCalls[0][1], 'Error inserting role');
        assert.strictEqual(errorLogCalls[0][2], insertError);
        
        assert.strictEqual(errorLogCalls[1][0], COMPONENTS.API);
        assert.strictEqual(errorLogCalls[1][1], 'Error rolling back after insert failure');
        assert.strictEqual(errorLogCalls[1][2], rollbackError);
    });

    await t.test('Preservation: Successful president replacement', async () => {
        let runCalls = [];
        let errorLogCalls = [];

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('INSERT')) {
                this.lastID = 99;
                cb.call(this, null);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-success' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 200);
        assert.deepStrictEqual(JSON.parse(result.body), { id: 99, message: 'Rol başarıyla atandı' });
        
        assert.strictEqual(runCalls.length, 4);
        assert.strictEqual(runCalls[0].sql, expectedBeginSql);
        assert.strictEqual(runCalls[1].sql, expectedDeleteSql);
        assert.strictEqual(runCalls[2].sql, expectedInsertSql);
        assert.strictEqual(runCalls[3].sql, expectedCommitSql);
        
        assert.strictEqual(errorLogCalls.length, 0, 'Logger.error must not be called');
    });

    await t.test('Preservation: Begin failure', async () => {
        let runCalls = [];
        let errorLogCalls = [];

        const beginError = new Error('begin failed');

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql === 'BEGIN IMMEDIATE') {
                cb(beginError);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-begin' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        assert.strictEqual(runCalls.length, 1);
        assert.strictEqual(runCalls[0].sql, expectedBeginSql);
        
        assert.strictEqual(errorLogCalls.length, 1);
        assert.strictEqual(errorLogCalls[0][1], 'Error beginning transaction for president role');
    });

    await t.test('Preservation: Delete failure', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const deleteError = new Error('delete failed');

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql.startsWith('DELETE')) {
                cb(deleteError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-delete' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0].sql, expectedBeginSql);
        assert.strictEqual(runCalls[1].sql, expectedDeleteSql);
        assert.strictEqual(runCalls[2].sql, expectedRollbackSql);
        
        assert.strictEqual(errorLogCalls.length, 1);
        assert.strictEqual(errorLogCalls[0][1], 'Error clearing president role');
    });

    await t.test('Preservation: Commit failure', async () => {
        let runCalls = [];
        let errorLogCalls = [];
        let rollbackCallbackCompleted = false;

        const commitError = new Error('commit failed');

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql === 'COMMIT') {
                cb(commitError);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-commit' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Rol atanırken hata oluştu' });
        
        assert.strictEqual(runCalls.length, 5);
        assert.strictEqual(runCalls[0].sql, expectedBeginSql);
        assert.strictEqual(runCalls[1].sql, expectedDeleteSql);
        assert.strictEqual(runCalls[2].sql, expectedInsertSql);
        assert.strictEqual(runCalls[3].sql, expectedCommitSql);
        assert.strictEqual(runCalls[4].sql, expectedRollbackSql);
        
        assert.strictEqual(errorLogCalls.length, 1);
        assert.strictEqual(errorLogCalls[0][1], 'Error committing president role');
    });

    await t.test('Preservation: Missing student', async () => {
        let runCalls = [];
        let errorLogCalls = [];

        Logger.prototype.error = function (...args) {
            errorLogCalls.push(args);
        };

        db.get = function(sql, params, cb) {
            cb(null, null); // row is undefined
        };

        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            cb(null);
        };

        const req = { body: { student_id: 47, role_type: 'president' }, requestId: 'req-missing' };
        const res = createTrackedResponse();
        await finalHandler(req, res, () => {});
        const result = await res.promise;
        res.cleanup();

        assert.strictEqual(result.statusCode, 400);
        assert.deepStrictEqual(JSON.parse(result.body), { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
        
        assert.strictEqual(runCalls.length, 0, 'No transaction starts');
        assert.strictEqual(errorLogCalls.length, 0);
    });

    const runSql = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    const getSql = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    await t.test('Isolation proof: shared connection writes are not rolled back by a failed president transaction', async () => {
        let originalDbRunRef = db.run;
        let originalDbGetRef = db.get;

        try {
            await runSql("DELETE FROM roles");
            await runSql("DELETE FROM students");
            await runSql("CREATE TABLE IF NOT EXISTS unrelated_writes (id INTEGER PRIMARY KEY, msg TEXT)");
            await runSql("DELETE FROM unrelated_writes");
            await runSql("INSERT INTO students (id, name, gender) VALUES (1, 'A B', 'M'), (2, 'C D', 'F')");
            await runSql("INSERT INTO roles (student_id, role_type) VALUES (1, 'president')");

            await runSql("CREATE TRIGGER IF NOT EXISTS fail_president_update BEFORE INSERT ON roles BEGIN SELECT RAISE(ABORT, 'forced president failure'); END;");

            let resolvePause;
            const pausePromise = new Promise(r => resolvePause = r);
            let transactionPausedResolver;
            const transactionPausedPromise = new Promise(r => transactionPausedResolver = r);

            db.get = function(sql, params, cb) {
                originalDbGetRef.call(db, sql, params, cb);
            };

            function attachInterceptor(dbObj) {
                const origRun = dbObj.run;
                dbObj.run = function(sql, params, runCb) {
                    const actualCb = typeof params === 'function' ? params : runCb;
                    const actualParams = typeof params === 'function' ? [] : params;

                    if (typeof sql === 'string' && sql.includes('DELETE FROM roles WHERE role_type = ?')) {
                        transactionPausedResolver();
                        pausePromise.then(() => {
                            origRun.call(this, sql, actualParams, actualCb);
                        });
                    } else {
                        origRun.call(this, sql, actualParams, actualCb);
                    }
                };
                return origRun;
            }

            const restoreDbRun = attachInterceptor(db);

            if (originalDbCreateIsolatedConnection) {
                db.createIsolatedConnection = function(cb) {
                    originalDbCreateIsolatedConnection.call(db, (err, isolatedDb) => {
                        if (err) return cb(err);
                        attachInterceptor(isolatedDb);
                        cb(null, isolatedDb);
                    });
                };
            }

            const req = { body: { student_id: 2, role_type: 'president' }, requestId: 'req-isolation' };
            const invokeHandlerPromise = (async () => {
                const res = createTrackedResponse();
                await finalHandler(req, res, () => {});
                const result = await res.promise;
                res.cleanup();
                return result;
            })();

            await transactionPausedPromise;

            const unrelatedWritePromise = new Promise((resolve, reject) => {
                originalDbRunRef.call(db, "INSERT INTO unrelated_writes (msg) VALUES ('unrelated')", (err) => err ? reject(err) : resolve());
            });

            resolvePause();

            const resObj = await invokeHandlerPromise;
            await unrelatedWritePromise;

            assert.strictEqual(resObj.statusCode, 500);
            assert.deepStrictEqual(JSON.parse(resObj.body), { error: 'Rol atanırken hata oluştu' });

            const postFailRoles = await getSql("SELECT * FROM roles WHERE role_type = 'president'");
            assert.strictEqual(postFailRoles.length, 1);
            assert.strictEqual(postFailRoles[0].student_id, 1);

            const unrelatedWrites = await getSql("SELECT * FROM unrelated_writes");
            assert.strictEqual(unrelatedWrites.length, 1, 'Unrelated write must be preserved');
            assert.strictEqual(unrelatedWrites[0].msg, 'unrelated');
        } finally {
            db.run = originalDbRunRef;
            db.get = originalDbGetRef;
            if (originalDbCreateIsolatedConnection) {
                db.createIsolatedConnection = originalDbCreateIsolatedConnection;
            }
            try { await runSql("DROP TRIGGER IF EXISTS fail_president_update;"); } catch (err) {}
        }
    });

});
