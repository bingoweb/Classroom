const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-attendance-update-test-'));
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

test('Attendance Update Tests', async (t) => {
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
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/attendance/:id' && layer.route.methods.put);
    if (!routeLayer) throw new Error("PUT /api/attendance/:id route not found");
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun;

    t.beforeEach(() => {
        originalDbRun = db.run;
    });

    t.afterEach(() => {
        db.run = originalDbRun;
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

                const req = { params: { id: invalidValue }, body: { status: 'present' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçersiz yoklama ID' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // B. Invalid route-parameter types
    const invalidTypes = [
        undefined, null, 1, 47, true, false, {}, [], new Number(1)
    ];

    await t.test('B. Invalid route-parameter types', async (t) => {
        for (let i = 0; i < invalidTypes.length; i++) {
            const invalidValue = invalidTypes[i];
            const typeName = Object.prototype.toString.call(invalidValue);
            await t.test(`invalid type ${typeName} at index ${i} returns 400 and performs no db operations`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };

                const req = { params: { id: invalidValue }, body: { status: 'present' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçersiz yoklama ID' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // C. ID validation takes precedence
    await t.test('C. ID validation takes precedence', (t, done) => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };

        const req = { params: { id: '47abc' }, body: { status: 'late' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz yoklama ID' });
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // D. Invalid statuses
    const invalidStatuses = [
        undefined, null, '', ' ', 'Present', 'ABSENT', 'late', true, 0, {}, []
    ];

    await t.test('D. Invalid statuses', async (t) => {
        for (let i = 0; i < invalidStatuses.length; i++) {
            await t.test(`invalid status format at index ${i}`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };

                const req = { params: { id: '47' }, body: { status: invalidStatuses[i] } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçerli bir durum gereklidir (present/absent)' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // E. Canonical IDs and normalized SQL parameters
    const canonicalStrings = [
        { val: "1", num: 1 },
        { val: "47", num: 47 },
        { val: "9007199254740991", num: 9007199254740991 }
    ];

    await t.test('E. Canonical IDs and normalized SQL parameters', async (t) => {
        for (const item of canonicalStrings) {
            await t.test(`canonical ID "${item.val}" is passed as numeric ${item.num}`, (t, done) => {
                let runCalls = 0;
                let runCallParams = null;
                let runSql = null;
                db.run = function(sql, params, cb) {
                    runCalls++;
                    runSql = sql;
                    runCallParams = params;
                    this.changes = 1;
                    cb.call(this, null);
                };

                const req = { params: { id: item.val }, body: { status: 'present' } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 200);
                    assert.deepEqual(resObj.body, { message: 'Yoklama güncellendi', changes: 1 });
                    assert.strictEqual(runCalls, 1);
                    assert.strictEqual(runSql, 'UPDATE attendance SET status = ? WHERE id = ?');
                    assert.deepEqual(runCallParams, ['present', item.num]);
                    assert.strictEqual(typeof runCallParams[1], 'number');
                    done();
                });
                handler(req, res);
            });
        }
    });

    // F. Successful update
    await t.test('F. Successful update', (t, done) => {
        db.run = function(sql, params, cb) {
            this.changes = 1;
            cb.call(this, null);
        };

        const req = { params: { id: '47' }, body: { status: 'absent' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(resObj.body, { message: 'Yoklama güncellendi', changes: 1 });
            done();
        });
        handler(req, res);
    });

    // G. Missing attendance record
    await t.test('G. Missing attendance record', (t, done) => {
        db.run = function(sql, params, cb) {
            this.changes = 0;
            cb.call(this, null);
        };

        const req = { params: { id: '47' }, body: { status: 'absent' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 404);
            assert.deepEqual(resObj.body, { error: 'Yoklama kaydı bulunamadı' });
            done();
        });
        handler(req, res);
    });

    // H. Database failure
    await t.test('H. Database failure', (t, done) => {
        let runCallParams = null;
        db.run = function(sql, params, cb) {
            runCallParams = params;
            cb.call(this, new Error('DB Delete failed'));
        };

        const req = { params: { id: '47' }, body: { status: 'absent' } };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Yoklama güncellenirken hata oluştu' });
            assert.strictEqual(typeof runCallParams[1], 'number');
            assert.strictEqual(runCallParams[1], 47);
            done();
        });
        handler(req, res);
    });
});
