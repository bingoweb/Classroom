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
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/roles' && layer.route.methods.post);
    if (!routeLayer) throw new Error("POST /api/roles route not found");
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

    function createMockRes(onEnd) {
        return {
            statusCode: 200,
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) {
                this.body = data;
                if (onEnd) onEnd(this);
                return this;
            }
        };
    }

    // A. Malformed string IDs
    const malformedStrings = [
        "abc", "1abc", "abc1", "1.5", "1e2", "+1", "-1", "0", "00", "01",
        "1 ", " 1", "", "   ", "9007199254740992"
    ];

    await t.test('A. Malformed string IDs', async (t) => {
        for (const invalidValue of malformedStrings) {
            await t.test(`invalid ID "${invalidValue}" returns 400 and performs no db operations`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const req = { body: { student_id: invalidValue, role_type: 'president' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // B. Invalid numeric IDs
    const invalidNumbers = [
        0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity
    ];

    await t.test('B. Invalid numeric IDs', async (t) => {
        for (const invalidValue of invalidNumbers) {
            await t.test(`invalid ID ${invalidValue} returns 400 and performs no db operations`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const req = { body: { student_id: invalidValue, role_type: 'president' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
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
            await t.test(`invalid type ${typeName} at index ${i} returns 400 and performs no db operations`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.get = () => { dbCalls++; };

                const req = { body: { student_id: invalidValue, role_type: 'president' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçerli bir öğrenci seçilmelidir' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
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
            await t.test(`canonical ID "${item.val}" is passed as numeric ${item.num}`, (t, done) => {
                let runCallParams = null;
                db.run = function(sql, params, cb) {
                    runCallParams = params;
                    this.lastID = 100;
                    cb.call(this, null);
                };

                const req = { body: { student_id: item.val, role_type: 'star' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 200);
                    assert.deepEqual(resObj.body, { id: 100, message: 'Rol başarıyla atandı' });
                    assert.strictEqual(typeof runCallParams[0], 'number');
                    assert.strictEqual(runCallParams[0], item.num);
                    assert.strictEqual(runCallParams[1], 'star');
                    done();
                });
                handler(req, res);
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
            await t.test(`positive numeric ID ${item.val} is passed exactly as numeric ${item.num}`, (t, done) => {
                let runCallParams = null;
                db.run = function(sql, params, cb) {
                    runCallParams = params;
                    this.lastID = 200;
                    cb.call(this, null);
                };

                const req = { body: { student_id: item.val, role_type: 'star' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 200);
                    assert.deepEqual(resObj.body, { id: 200, message: 'Rol başarıyla atandı' });
                    assert.strictEqual(typeof runCallParams[0], 'number');
                    assert.strictEqual(runCallParams[0], item.num);
                    assert.strictEqual(runCallParams[1], 'star');
                    done();
                });
                handler(req, res);
            });
        }
    });

    // F. President database ordering with valid ID
    await t.test('F. President database ordering with valid ID', (t, done) => {
        const operations = [];
        db.get = function(sql, params, cb) {
            operations.push({ sql, params });
            cb(null, { id: 47 });
        };
        db.run = function(sql, params, cb) {
            operations.push({ sql, params });
            this.lastID = 300;
            cb.call(this, null);
        };

        const req = { body: { student_id: '47', role_type: 'president' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(resObj.body, { id: 300, message: 'Rol başarıyla atandı' });
            assert.strictEqual(operations.length, 3);
            assert.strictEqual(operations[0].sql, 'SELECT id FROM students WHERE id = ?');
            assert.deepEqual(operations[0].params, [47]);
            assert.strictEqual(typeof operations[0].params[0], 'number');
            assert.ok(operations[1].sql.includes('DELETE FROM roles'));
            assert.deepEqual(operations[1].params, ['president']);
            assert.ok(operations[2].sql.includes('INSERT INTO roles'));
            assert.deepEqual(operations[2].params, [47, 'president']);
            assert.strictEqual(typeof operations[2].params[0], 'number');
            done();
        });
        handler(req, res);
    });

    // G. Vice-president duplicate comparison
    await t.test('G. Vice-president duplicate comparison', (t, done) => {
        db.all = function(sql, params, cb) {
            cb(null, [{ student_id: 47 }]);
        };
        let runCalls = 0;
        db.run = function() { runCalls++; };

        const req = { body: { student_id: '47', role_type: 'vice_president' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Bu öğrenci zaten başkan yardımcısı' });
            assert.strictEqual(runCalls, 0);
            done();
        });
        handler(req, res);
    });

    // H. Invalid role type preservation
    await t.test('H. Invalid role type preservation', (t, done) => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.all = () => { dbCalls++; };
        db.get = () => { dbCalls++; };

        const req = { body: { student_id: '47', role_type: 'invalid_role' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz rol tipi' });
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // I. Missing student preserves president
    await t.test('I. Missing student preserves president', (t, done) => {
        let getSql, getParams;
        db.get = function(sql, params, cb) {
            getSql = sql;
            getParams = params;
            cb(null, undefined);
        };
        let dbCalls = 0;
        db.run = () => { dbCalls++; };

        const req = { body: { student_id: '999999', role_type: 'president' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
            assert.strictEqual(getSql, 'SELECT id FROM students WHERE id = ?');
            assert.deepEqual(getParams, [999999]);
            assert.strictEqual(typeof getParams[0], 'number');
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // J. Student lookup failure preserves president
    await t.test('J. Student lookup failure preserves president', (t, done) => {
        db.get = function(sql, params, cb) {
            cb(new Error('DB Get failed'));
        };
        let dbCalls = 0;
        db.run = () => { dbCalls++; };

        const req = { body: { student_id: '47', role_type: 'president' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Rol atanırken hata oluştu' });
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // K. Real database regression test
    await t.test('K. Real database regression test', async (t) => {
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

        const studentRes = await runDb("INSERT INTO students (name) VALUES (?)", ['Existing President']);
        const realStudentId = studentRes.lastID;

        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [realStudentId, 'president']);

        const presidentsBefore = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
        assert.strictEqual(presidentsBefore.length, 1);

        const originalPresident = presidentsBefore[0];
        assert.strictEqual(originalPresident.student_id, realStudentId);
        assert.strictEqual(originalPresident.role_type, 'president');

        const fakeStudentId = realStudentId + 1000;

        await new Promise((resolve) => {
            const req = { body: { student_id: fakeStudentId.toString(), role_type: 'president' } };
            const res = createMockRes((resObj) => {
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                resolve();
            });
            handler(req, res);
        });

        const presidentsAfter = await allDb("SELECT id, student_id, role_type FROM roles WHERE role_type = ? ORDER BY id", ['president']);
        assert.strictEqual(presidentsAfter.length, 1);
        assert.strictEqual(presidentsAfter[0].id, originalPresident.id);
        assert.strictEqual(presidentsAfter[0].student_id, originalPresident.student_id);
        assert.strictEqual(presidentsAfter[0].role_type, 'president');
    });
});
