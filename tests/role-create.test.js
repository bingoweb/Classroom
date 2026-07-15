const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-create-test-'));
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

test('Role Create ID Validation Tests', async (t) => {
    t.after(async () => {
        try {
            await closeDatabase(db);
            const filesToRemove = [
                testDbPath,
                testDbPath + '-journal',
                testDbPath + '-wal',
                testDbPath + '-shm'
            ];
            for (const file of filesToRemove) {
                removeFileIfPresent(fs, file);
            }
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

    await db.scheduleMigrationPromise;

    const stack = app._router.stack;
    const matchingRoutes = stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/roles' &&
            layer.route.methods.post
    );

    assert.strictEqual(
        matchingRoutes.length,
        1,
        'Exactly one matching POST /api/roles route must exist'
    );
    const routeLayer = matchingRoutes[0];
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun, originalDbAll, originalDbGet;

    t.beforeEach(() => {
        originalDbRun = db.run;
        originalDbAll = db.all;
        originalDbGet = db.get;
    });

    t.afterEach(() => {
        db.run = originalDbRun;
        db.all = originalDbAll;
        db.get = originalDbGet;
    });

    function createPromiseHelper(testHandler) {
        return function invokeTestHandler(req) {
            return new Promise((resolve, reject) => {
                let responded = false;
                let timeoutId;

                const res = {
                    statusCode: 200,
                    status: function(code) {
                        this.statusCode = code;
                        return this;
                    },
                    json: function(data) {
                        if (responded) {
                            clearTimeout(timeoutId);
                            throw new Error('Multiple responses detected');
                        }
                        responded = true;
                        clearTimeout(timeoutId);
                        this.body = data;
                        setImmediate(() => {
                            resolve({ statusCode: this.statusCode, body: this.body });
                        });
                        return this;
                    }
                };

                const next = (err) => {
                    if (responded) return;
                    responded = true;
                    clearTimeout(timeoutId);
                    setImmediate(() => {
                        reject(err || new Error('next() called without error'));
                    });
                };

                timeoutId = setTimeout(() => {
                    if (!responded) {
                        responded = true;
                        reject(new Error('Response timeout exceeded'));
                    }
                }, 100);

                try {
                    testHandler(req, res, next);
                } catch (err) {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
        };
    }

    const invokeHandler = createPromiseHelper(handler);

    await t.test('Helper: zero responses are detected', async () => {
        const invokeZero = createPromiseHelper(() => {});
        await assert.rejects(invokeZero({}), /Response timeout exceeded/);
    });

    await t.test('Helper: two synchronous responses are detected', async () => {
        const invokeDouble = createPromiseHelper((req, res) => {
            res.json({ first: true });
            res.json({ second: true });
        });
        await assert.rejects(invokeDouble({}), /Multiple responses detected/);
    });

    // 0. Structural body validation
    const structuralBodies = [
        undefined, null, [], 'role', 42, true, false
    ];

    await t.test('0. Structural body validation', async (t) => {
        for (let i = 0; i < structuralBodies.length; i++) {
            const body = structuralBodies[i];
            const typeName = Object.prototype.toString.call(body);
            await t.test(`structurally invalid body ${typeName} at index ${i} returns 400 and performs no db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const resObj = await invokeHandler({ body });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    await t.test('0. Missing field validation', async () => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.all = () => { dbCalls++; };
        db.get = () => { dbCalls++; };

        const resObj = await invokeHandler({ body: {} });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
        assert.strictEqual(dbCalls, 0);
    });

    // A. Malformed string IDs
    const malformedStrings = [
        "abc", "1abc", "abc1", "1.5", "1e2", "+1", "-1", "0", "00", "01",
        "1 ", " 1", "", "   ", "9007199254740992"
    ];

    await t.test('A. Malformed string IDs', async (t) => {
        for (const invalidValue of malformedStrings) {
            await t.test(`invalid ID "${invalidValue}" returns 400 and performs no db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { student_id: invalidValue, role_type: 'president' } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // B. Invalid numeric IDs
    const invalidNumbers = [
        0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity
    ];

    await t.test('B. Invalid numeric IDs', async (t) => {
        for (const invalidValue of invalidNumbers) {
            await t.test(`invalid ID ${invalidValue} returns 400 and performs no db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { student_id: invalidValue, role_type: 'president' } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // C. Invalid types
    const invalidTypes = [
        undefined, null, true, false, {}, [], new Number(1)
    ];

    await t.test('C. Invalid types', async (t) => {
        for (let i = 0; i < invalidTypes.length; i++) {
            const invalidValue = invalidTypes[i];
            const typeName = Object.prototype.toString.call(invalidValue);
            await t.test(`invalid type ${typeName} at index ${i} returns 400 and performs no db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { student_id: invalidValue, role_type: 'president' } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // D. Canonical string IDs
    const canonicalStrings = [
        { val: "1", num: 1 },
        { val: "47", num: 47 },
        { val: "9007199254740991", num: 9007199254740991 }
    ];

    await t.test('D. Canonical string IDs', async (t) => {
        for (const item of canonicalStrings) {
            await t.test(`canonical ID "${item.val}" is passed as numeric ${item.num}`, async () => {
                let runCallParams = null;
                db.run = function(sql, params, cb) {
                    runCallParams = params;
                    this.lastID = 100;
                    cb.call(this, null);
                };

                const resObj = await invokeHandler({ body: { student_id: item.val, role_type: 'star' } });
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { id: 100, message: 'Rol başarıyla atandı' });
                assert.strictEqual(typeof runCallParams[0], 'number');
                assert.strictEqual(runCallParams[0], item.num);
                assert.strictEqual(runCallParams[1], 'star');
            });
        }
    });

    // E. Positive numeric IDs
    const validNumbers = [
        { val: 1, num: 1 },
        { val: 47, num: 47 },
        { val: Number.MAX_SAFE_INTEGER, num: Number.MAX_SAFE_INTEGER }
    ];

    await t.test('E. Positive numeric IDs', async (t) => {
        for (const item of validNumbers) {
            await t.test(`positive numeric ID ${item.val} is passed exactly as numeric ${item.num}`, async () => {
                let runCallParams = null;
                db.run = function(sql, params, cb) {
                    runCallParams = params;
                    this.lastID = 200;
                    cb.call(this, null);
                };

                const resObj = await invokeHandler({ body: { student_id: item.val, role_type: 'star' } });
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { id: 200, message: 'Rol başarıyla atandı' });
                assert.strictEqual(typeof runCallParams[0], 'number');
                assert.strictEqual(runCallParams[0], item.num);
                assert.strictEqual(runCallParams[1], 'star');
            });
        }
    });

    // F. President database ordering with valid ID
    await t.test('F. President database ordering with valid ID', async () => {
        const operations = [];
        let commitCallbackCompleted = false;

        db.get = function(sql, params, cb) {
            operations.push({ sql, params });
            cb(null, { id: 47 });
        };
        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            operations.push({ sql, params });
            this.lastID = 300;
            if (sql === 'COMMIT') {
                setTimeout(() => {
                    commitCallbackCompleted = true;
                    cb.call(this, null);
                }, 5);
            } else {
                cb.call(this, null);
            }
        };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });

        assert.strictEqual(commitCallbackCompleted, true, 'Response must wait for asynchronous commit callback');
        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { id: 300, message: 'Rol başarıyla atandı' });

        assert.strictEqual(operations.length, 5);
        assert.strictEqual(operations[0].sql, 'SELECT id FROM students WHERE id = ?');
        assert.deepEqual(operations[0].params, [47]);
        assert.strictEqual(typeof operations[0].params[0], 'number');

        assert.strictEqual(operations[1].sql, 'BEGIN IMMEDIATE TRANSACTION');

        assert.strictEqual(operations[2].sql, 'DELETE FROM roles WHERE role_type = ?');
        assert.deepEqual(operations[2].params, ['president']);

        assert.strictEqual(operations[3].sql, 'INSERT INTO roles (student_id, role_type) VALUES (?, ?)');
        assert.deepEqual(operations[3].params, [47, 'president']);
        assert.strictEqual(typeof operations[3].params[0], 'number');

        assert.strictEqual(operations[4].sql, 'COMMIT');

        const rollbacks = operations.filter(o => o.sql === 'ROLLBACK');
        assert.strictEqual(rollbacks.length, 0);
    });

    // H. Invalid role type preservation
    await t.test('H. Invalid role type preservation', async () => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.all = () => { dbCalls++; };
        db.get = () => { dbCalls++; };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'invalid_role' } });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Geçersiz rol tipi' });
        assert.strictEqual(dbCalls, 0);
    });

    // I. Missing student preserves president
    await t.test('I. Missing student preserves president', async () => {
        let getSql, getParams;
        db.get = function(sql, params, cb) {
            getSql = sql;
            getParams = params;
            cb(null, undefined);
        };
        let dbCalls = 0;
        db.run = () => { dbCalls++; };

        const resObj = await invokeHandler({ body: { student_id: '999999', role_type: 'president' } });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
        assert.strictEqual(getSql, 'SELECT id FROM students WHERE id = ?');
        assert.deepEqual(getParams, [999999]);
        assert.strictEqual(typeof getParams[0], 'number');
        assert.strictEqual(dbCalls, 0);
    });

    // J. Student lookup failure preserves president
    await t.test('J. Student lookup failure preserves president', async () => {
        db.get = function(sql, params, cb) {
            cb(new Error('DB Get failed'));
        };
        let dbCalls = 0;
        db.run = () => { dbCalls++; };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });
        assert.strictEqual(dbCalls, 0);
    });

    // Mocked failure regressions

    // A. Begin failure
    await t.test('Mocked Begin failure', async () => {
        let runCalls = [];
        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };
        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql === 'BEGIN IMMEDIATE TRANSACTION') {
                cb(new Error('begin failed'));
            } else {
                cb(null);
            }
        };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });

        assert.strictEqual(runCalls.length, 1);
        assert.strictEqual(runCalls[0], 'BEGIN IMMEDIATE TRANSACTION');
    });

    // B. Delete failure
    await t.test('Mocked Delete failure', async () => {
        let runCalls = [];
        let rollbackCallbackCompleted = false;

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };
        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql.startsWith('DELETE')) {
                cb(new Error('delete failed'));
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });
        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });

        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0], 'BEGIN IMMEDIATE TRANSACTION');
        assert.ok(runCalls[1].startsWith('DELETE FROM roles'));
        assert.strictEqual(runCalls[2], 'ROLLBACK');
    });

    // C. Insert failure
    await t.test('Mocked Insert failure', async () => {
        let runCalls = [];
        let rollbackCallbackCompleted = false;

        const originalLogError = Logger.prototype.error;
        const errorLogCalls = [];

        try {
            Logger.prototype.error = function (...args) {
                errorLogCalls.push(args);
            };

            const insertionError = new Error('insert failed');
            insertionError.code = 'SQLITE_CONSTRAINT';

            db.get = function(sql, params, cb) {
                cb(null, { id: 47 });
            };
            db.run = function(sql, params, cb) {
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                runCalls.push(sql);
                if (sql.startsWith('INSERT')) {
                    cb(insertionError);
                } else if (sql === 'ROLLBACK') {
                    setTimeout(() => {
                        rollbackCallbackCompleted = true;
                        cb(null);
                    }, 5);
                } else {
                    cb(null);
                }
            };

            const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });

            assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu: insert failed' });

            assert.strictEqual(runCalls.length, 4);
            assert.strictEqual(runCalls[0], 'BEGIN IMMEDIATE TRANSACTION');
            assert.ok(runCalls[1].startsWith('DELETE FROM roles'));
            assert.ok(runCalls[2].startsWith('INSERT INTO roles'));
            assert.strictEqual(runCalls[3], 'ROLLBACK');

            const insertErrorLogs = errorLogCalls.filter(call => call[1] === 'Error inserting role');
            assert.strictEqual(insertErrorLogs.length, 1, 'Logger.error must be called exactly once for the insertion failure');

            const errorLogArgs = insertErrorLogs[0];
            assert.strictEqual(errorLogArgs[0], COMPONENTS.API);
            assert.strictEqual(errorLogArgs[2], insertionError);
            assert.deepEqual(errorLogArgs[3], {
                studentId: 47,
                roleType: 'president',
                errorMessage: insertionError.message,
                errorCode: insertionError.code
            });

        } finally {
            Logger.prototype.error = originalLogError;
        }
    });

    // D. Commit failure
    await t.test('Mocked Commit failure', async () => {
        let runCalls = [];
        let commitCallbackCompleted = false;
        let rollbackCallbackCompleted = false;

        db.get = function(sql, params, cb) {
            cb(null, { id: 47 });
        };
        db.run = function(sql, params, cb) {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql === 'COMMIT') {
                setTimeout(() => {
                    commitCallbackCompleted = true;
                    cb(new Error('commit failed'));
                }, 5);
            } else if (sql === 'ROLLBACK') {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'president' } });

        assert.strictEqual(commitCallbackCompleted, true, 'Response must wait for asynchronous commit callback');
        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });

        assert.strictEqual(runCalls.length, 5);
        assert.strictEqual(runCalls[0], 'BEGIN IMMEDIATE TRANSACTION');
        assert.ok(runCalls[1].startsWith('DELETE FROM roles'));
        assert.ok(runCalls[2].startsWith('INSERT INTO roles'));
        assert.strictEqual(runCalls[3], 'COMMIT');
        assert.strictEqual(runCalls[4], 'ROLLBACK');
    });

    const runDb = (sql, params) => new Promise((resolve, reject) => {
        originalDbRun.call(db, sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
    const allDb = (sql, params = []) => new Promise((resolve, reject) => {
        originalDbAll.call(db, sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });

    // K. Mandatory real SQLite rollback regression
    await t.test('K. Mandatory real SQLite rollback regression', async () => {
        const student1Res = await runDb("INSERT INTO students (name) VALUES (?)", ['Old President Student']);
        const oldStudentId = student1Res.lastID;

        const student2Res = await runDb("INSERT INTO students (name) VALUES (?)", ['Target Student']);
        const targetStudentId = student2Res.lastID;

        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [oldStudentId, 'president']);

        const presidentsBefore = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
        assert.strictEqual(presidentsBefore.length, 1);

        const originalPresident = presidentsBefore[0];
        assert.strictEqual(originalPresident.student_id, oldStudentId);
        assert.strictEqual(originalPresident.role_type, 'president');

        // Create temporary trigger to force insert failure for the target student
        await runDb(`
            CREATE TEMP TRIGGER fail_target_president_insert
            BEFORE INSERT ON roles
            WHEN NEW.role_type = 'president'
             AND NEW.student_id = ${targetStudentId}
            BEGIN
                SELECT RAISE(ABORT, 'forced president insert failure');
            END;
        `);

        try {
            const resObj = await invokeHandler({ body: { student_id: targetStudentId.toString(), role_type: 'president' } });

            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu: SQLITE_CONSTRAINT: forced president insert failure' });

            const presidentsAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
            assert.strictEqual(presidentsAfter.length, 1, 'after rollback there is exactly one president');
            assert.strictEqual(presidentsAfter[0].id, originalPresident.id, 'original role ID is preserved');
            assert.strictEqual(presidentsAfter[0].student_id, originalPresident.student_id, 'original student ID is preserved');
            assert.strictEqual(presidentsAfter[0].role_type, 'president', 'complete old row is preserved');
        } finally {
            await runDb(`DROP TRIGGER fail_target_president_insert`);
        }
    });

    // L. Mandatory real SQLite successful replacement regression
    await t.test('L. Mandatory real SQLite successful replacement regression', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const student1Res = await runDb("INSERT INTO students (name) VALUES (?)", ['Old President Student L']);
        const oldStudentId = student1Res.lastID;

        const student2Res = await runDb("INSERT INTO students (name) VALUES (?)", ['Target Student L']);
        const targetStudentId = student2Res.lastID;

        const student3Res = await runDb("INSERT INTO students (name) VALUES (?)", ['Unrelated Student L']);
        const unrelatedStudentId = student3Res.lastID;

        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [oldStudentId, 'president']);
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'vice_president']);
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'duty']);
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'star']);

        const unrelatedRolesBefore = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type <> 'president' ORDER BY id", []);

        const resObj = await invokeHandler({ body: { student_id: targetStudentId.toString(), role_type: 'president' } });

        assert.strictEqual(resObj.statusCode, 200);
        assert.strictEqual(resObj.body.message, 'Rol başarıyla atandı');
        const newRoleId = resObj.body.id;
        assert.ok(newRoleId > 0);

        const presidentsAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
        assert.strictEqual(presidentsAfter.length, 1);
        assert.strictEqual(presidentsAfter[0].student_id, targetStudentId);
        assert.strictEqual(presidentsAfter[0].id, newRoleId);

        const unrelatedRolesAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type <> 'president' ORDER BY id", []);
        assert.deepEqual(unrelatedRolesAfter, unrelatedRolesBefore);
    });

    // M. Mandatory real SQLite successful new president regression (no-existing-president)
    await t.test('M. Mandatory real SQLite successful new president regression (no-existing-president)', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const studentRes = await runDb("INSERT INTO students (name) VALUES (?)", ['Target Student M']);
        const targetStudentId = studentRes.lastID;

        const unrelatedStudentRes = await runDb("INSERT INTO students (name) VALUES (?)", ['Unrelated Student M']);
        const unrelatedStudentId = unrelatedStudentRes.lastID;

        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'vice_president']);
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'duty']);
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [unrelatedStudentId, 'star']);

        const initialPresidents = await allDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'president'", []);
        assert.strictEqual(initialPresidents[0].count, 0);

        const unrelatedRolesBefore = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type <> 'president' ORDER BY id", []);
        assert.ok(unrelatedRolesBefore.length > 0);
        assert.strictEqual(unrelatedRolesBefore.length, 3);

        const resObj = await invokeHandler({ body: { student_id: targetStudentId.toString(), role_type: 'president' } });

        assert.strictEqual(resObj.statusCode, 200);
        assert.ok(resObj.body !== null && typeof resObj.body === 'object' && !Array.isArray(resObj.body));
        assert.deepEqual(Object.keys(resObj.body).sort(), ['id', 'message']);
        assert.strictEqual(resObj.body.message, 'Rol başarıyla atandı');
        assert.strictEqual(Number.isSafeInteger(resObj.body.id), true);
        assert.ok(resObj.body.id > 0);

        const insertedRoleId = resObj.body.id;

        assert.deepEqual(resObj.body, {
            id: insertedRoleId,
            message: 'Rol başarıyla atandı'
        });

        const presidentsAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
        assert.strictEqual(presidentsAfter.length, 1);
        assert.strictEqual(presidentsAfter[0].student_id, targetStudentId);
        assert.strictEqual(presidentsAfter[0].id, insertedRoleId);

        const unrelatedRolesAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type <> 'president' ORDER BY id", []);
        assert.deepEqual(unrelatedRolesAfter, unrelatedRolesBefore);
    });

    // N. Duplicate star assignment
    await t.test('N. Duplicate star assignment', async () => {
        let runCalls = [];
        db.run = function(sql, params, cb) {
            runCalls.push({ sql, params });
            this.changes = 0;
            cb.call(this, null);
        };
        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'star' } });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Bu öğrenci zaten haftanın yıldızı' });

        assert.strictEqual(runCalls.length, 1);
        assert.ok(runCalls[0].sql.includes('INSERT INTO roles'));
        assert.ok(runCalls[0].sql.includes('WHERE NOT EXISTS'));
        assert.deepEqual(runCalls[0].params, [47, 'star', 47, 'star']);
    });

        const boundedRoles = [
        { role: 'vice_president', max: 2, msgLimit: 'En fazla 2 başkan yardımcısı olabilir', msgDup: 'Bu öğrenci zaten başkan yardımcısı' },
        { role: 'duty', max: 4, msgLimit: 'En fazla 4 nöbetçi atanabilir', msgDup: 'Bu öğrenci zaten nöbetçi' }
    ];

    for (const br of boundedRoles) {
        await t.test(`Mocked ${br.role} atomic behaviors`, async (subT) => {
            await subT.test('1. Successful atomic INSERT', async () => {
                let runCallParams = null;
                let getCalls = 0;
                db.get = () => getCalls++;
                db.run = function(sql, params, cb) {
                    runCallParams = { sql, params };
                    this.changes = 1;
                    this.lastID = 100;
                    cb.call(this, null);
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(getCalls, 0);
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { id: 100, message: 'Rol başarıyla atandı' });
                assert.ok(runCallParams.sql.includes('INSERT INTO roles (student_id, role_type)'));
                assert.ok(runCallParams.sql.includes('SELECT ?, ?'));
                assert.ok(runCallParams.sql.includes('WHERE EXISTS'));
                assert.ok(runCallParams.sql.includes('AND NOT EXISTS'));
                assert.ok(runCallParams.sql.includes('SELECT COUNT(*)'));
                assert.deepEqual(runCallParams.params, [47, br.role, 47, 47, br.role, br.role, br.max]);
            });

            await subT.test('2. Limit rejection', async () => {
                let runCalls = 0;
                db.run = function(sql, params, cb) {
                    runCalls++;
                    this.changes = 0;
                    cb.call(this, null);
                };
                db.get = function(sql, params, cb) {
                    if (sql.includes('COUNT(*)')) {
                        cb(null, { count: br.max });
                    } else {
                        assert.fail('Should not reach next classification query');
                    }
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(runCalls, 1);
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: br.msgLimit });
            });

            await subT.test('3. Duplicate rejection below the limit', async () => {
                db.run = function(sql, params, cb) {
                    this.changes = 0;
                    cb.call(this, null);
                };
                db.get = function(sql, params, cb) {
                    if (sql.includes('COUNT(*)')) {
                        cb(null, { count: br.max - 1 });
                    } else if (sql.includes('AND role_type = ?')) {
                        cb(null, { 1: 1 });
                    } else {
                        assert.fail('Should not reach next classification query');
                    }
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: br.msgDup });
            });

            await subT.test('4. Missing student below the limit', async () => {
                db.run = function(sql, params, cb) {
                    this.changes = 0;
                    cb.call(this, null);
                };
                db.get = function(sql, params, cb) {
                    if (sql.includes('COUNT(*)')) {
                        cb(null, { count: br.max - 1 });
                    } else if (sql.includes('AND role_type = ?')) {
                        cb(null, undefined);
                    } else if (sql.includes('FROM students')) {
                        cb(null, undefined);
                    }
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
            });

            await subT.test('5. Atomic INSERT database error', async () => {
                let getCalls = 0;
                db.run = function(sql, params, cb) {
                    cb(new Error('Atomic DB Error'));
                };
                db.get = function(sql, params, cb) {
                    getCalls++;
                    cb(null, {});
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(getCalls, 0);
                assert.strictEqual(resObj.statusCode, 500);
                assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu: Atomic DB Error' });
            });

            await subT.test('6. Classification query error', async () => {
                db.run = function(sql, params, cb) {
                    this.changes = 0;
                    cb.call(this, null);
                };
                db.get = function(sql, params, cb) {
                    cb(new Error('Classification error'));
                };
                const resObj = await invokeHandler({ body: { student_id: '47', role_type: br.role } });
                assert.strictEqual(resObj.statusCode, 500);
                assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu: Classification error' });
            });
        });
    }

    // S. Guarded non-president insert fails
    await t.test('S. Guarded non-president insert fails', async () => {
        let runCalls = [];
        db.run = function(sql, params, cb) {
            runCalls.push({ sql, params });
            cb(new Error('insert failed'));
        };
        const resObj = await invokeHandler({ body: { student_id: '47', role_type: 'star' } });
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });
        assert.ok(!JSON.stringify(resObj.body).includes('insert failed'));
        assert.strictEqual(runCalls.length, 1);
    });

    // T. Real SQLite regression duplicate constraints
    await t.test('T. Real SQLite regression duplicate constraints', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const studentRes = await runDb("INSERT INTO students (name) VALUES (?)", ['Test Duplicate']);
        const studentId = studentRes.lastID;

        // Star duplicate
        const star1 = await invokeHandler({ body: { student_id: studentId, role_type: 'star' } });
        assert.strictEqual(star1.statusCode, 200);

        const starRows1 = await allDb("SELECT * FROM roles WHERE role_type = 'star'", []);
        assert.strictEqual(starRows1.length, 1);

        const star2 = await invokeHandler({ body: { student_id: studentId, role_type: 'star' } });
        assert.strictEqual(star2.statusCode, 400);
        assert.deepEqual(star2.body, { error: 'Bu öğrenci zaten haftanın yıldızı' });

        const starRows2 = await allDb("SELECT * FROM roles WHERE role_type = 'star'", []);
        assert.strictEqual(starRows2.length, 1);

        // Duty duplicate
        const duty1 = await invokeHandler({ body: { student_id: studentId, role_type: 'duty' } });
        assert.strictEqual(duty1.statusCode, 200);

        const dutyRows1 = await allDb("SELECT * FROM roles WHERE role_type = 'duty'", []);
        assert.strictEqual(dutyRows1.length, 1);

        const duty2 = await invokeHandler({ body: { student_id: studentId, role_type: 'duty' } });
        assert.strictEqual(duty2.statusCode, 400);
        assert.deepEqual(duty2.body, { error: 'Bu öğrenci zaten nöbetçi' });

        const dutyRows2 = await allDb("SELECT * FROM roles WHERE role_type = 'duty'", []);
        assert.strictEqual(dutyRows2.length, 1);
    });

});
