const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-attendance-test-'));
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

test('Attendance Bulk Validation Tests', async (t) => {
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
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/attendance' && layer.route.methods.post);
    if (!routeLayer) throw new Error("POST /api/attendance route not found");
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun, originalDbPrepare;

    t.beforeEach(() => {
        originalDbRun = db.run;
        originalDbPrepare = db.prepare;
    });

    t.afterEach(() => {
        db.run = originalDbRun;
        db.prepare = originalDbPrepare;
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

    // A. Existing top-level validation
    const topLevelInvalid = [
        { date: '', attendanceList: [] },
        { attendanceList: [] },
        { date: '2026-07-13', attendanceList: null },
        { date: '2026-07-13', attendanceList: {} }
    ];

    await t.test('A. Existing top-level validation', async (t) => {
        for (const reqBody of topLevelInvalid) {
            await t.test(`rejects ${JSON.stringify(reqBody)} before db operations`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body: reqBody };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Tarih ve yoklama listesi gereklidir' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // B. Non-object entries
    const nonObjectEntries = [
        null, undefined, true, false, 'invalid', 47, []
    ];

    await t.test('B. Non-object entries', async (t) => {
        for (let i = 0; i < nonObjectEntries.length; i++) {
            await t.test(`rejects non-object entry at index ${i}`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body: { date: '2026-07-13', attendanceList: [nonObjectEntries[i]] } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // C. Invalid student IDs
    const invalidIds = [
        'abc', '1abc', '1.5', '1e2', '+1', '-1', '0', '00', '01', '1 ', ' 1', '', '   ', '9007199254740992',
        0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity,
        true, {}, [], new Number(1)
    ];

    await t.test('C. Invalid student IDs', async (t) => {
        for (let i = 0; i < invalidIds.length; i++) {
            await t.test(`rejects invalid student ID format at index ${i}`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = {
                    body: {
                        date: '2026-07-13',
                        attendanceList: [
                            { student_id: invalidIds[i], status: 'present' }
                        ]
                    }
                };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // D. Invalid statuses
    const invalidStatuses = [
        undefined, null, '', ' ', 'Present', 'ABSENT', 'late', true, 0, {}, []
    ];

    await t.test('D. Invalid statuses', async (t) => {
        for (let i = 0; i < invalidStatuses.length; i++) {
            await t.test(`rejects invalid status format at index ${i}`, (t, done) => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = {
                    body: {
                        date: '2026-07-13',
                        attendanceList: [
                            { student_id: 1, status: invalidStatuses[i] }
                        ]
                    }
                };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                    assert.strictEqual(dbCalls, 0);
                    done();
                });
                handler(req, res);
            });
        }
    });

    // E. Mixed valid and invalid request
    await t.test('E. Mixed valid and invalid request', (t, done) => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.prepare = () => { dbCalls++; };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: '1', status: 'present' },
                    { student_id: '47', status: 'late' } // invalid status
                ]
            }
        };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // F. Duplicate normalized IDs
    await t.test('F. Duplicate normalized IDs', (t, done) => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.prepare = () => { dbCalls++; };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: '47', status: 'present' },
                    { student_id: 47, status: 'absent' }
                ]
            }
        };
        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
            assert.strictEqual(dbCalls, 0);
            done();
        });
        handler(req, res);
    });

    // G. Valid canonical string IDs
    await t.test('G. Valid canonical string IDs', (t, done) => {
        const operations = [];
        let statementFinalized = 0;

        db.run = function(sql, params, cb) {
            operations.push({ type: 'run', sql, params });
            cb.call(this, null);
        };

        db.prepare = function(sql) {
            operations.push({ type: 'prepare', sql });
            return {
                run: function(params, cb) {
                    operations.push({ type: 'stmt.run', params });
                    cb(null);
                },
                finalize: function() {
                    statementFinalized++;
                }
            };
        };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: '1', status: 'present' },
                    { student_id: '47', status: 'absent' },
                    { student_id: '9007199254740991', status: 'present' }
                ]
            }
        };

        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(resObj.body, { message: 'Yoklama başarıyla kaydedildi', count: 3 });

            assert.strictEqual(operations[0].type, 'run');
            assert.ok(operations[0].sql.includes('DELETE FROM attendance WHERE date = ?'));
            assert.deepEqual(operations[0].params, ['2026-07-13']);

            assert.strictEqual(operations[1].type, 'prepare');
            assert.ok(operations[1].sql.includes('INSERT INTO attendance'));

            assert.strictEqual(operations[2].type, 'stmt.run');
            assert.deepEqual(operations[2].params, [1, '2026-07-13', 'present']);
            assert.strictEqual(typeof operations[2].params[0], 'number');

            assert.strictEqual(operations[3].type, 'stmt.run');
            assert.deepEqual(operations[3].params, [47, '2026-07-13', 'absent']);
            assert.strictEqual(typeof operations[3].params[0], 'number');

            assert.strictEqual(operations[4].type, 'stmt.run');
            assert.deepEqual(operations[4].params, [9007199254740991, '2026-07-13', 'present']);
            assert.strictEqual(typeof operations[4].params[0], 'number');

            assert.strictEqual(statementFinalized, 1);
            done();
        });
        handler(req, res);
    });

    // H. Valid numeric IDs
    await t.test('H. Valid numeric IDs', (t, done) => {
        const operations = [];

        db.run = function(sql, params, cb) { cb.call(this, null); };

        db.prepare = function(sql) {
            return {
                run: function(params, cb) {
                    operations.push(params);
                    cb(null);
                },
                finalize: function() {}
            };
        };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'present' },
                    { student_id: Number.MAX_SAFE_INTEGER, status: 'absent' }
                ]
            }
        };

        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(operations[0], [1, '2026-07-13', 'present']);
            assert.strictEqual(typeof operations[0][0], 'number');
            assert.deepEqual(operations[1], [Number.MAX_SAFE_INTEGER, '2026-07-13', 'absent']);
            assert.strictEqual(typeof operations[1][0], 'number');
            done();
        });
        handler(req, res);
    });

    // I. Empty list
    await t.test('I. Empty list', (t, done) => {
        let runCalls = 0;
        let prepareCalls = 0;

        db.run = function(sql, params, cb) {
            runCalls++;
            cb.call(this, null);
        };

        db.prepare = function(sql) {
            prepareCalls++;
            return {
                run: function(params, cb) { cb(null); },
                finalize: function() {}
            };
        };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: []
            }
        };

        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 200);
            assert.deepEqual(resObj.body, { message: 'Yoklama kaydedildi', count: 0 });
            assert.strictEqual(runCalls, 1);
            assert.strictEqual(prepareCalls, 0);
            done();
        });
        handler(req, res);
    });

    // J. Delete failure preservation
    await t.test('J. Delete failure preservation', (t, done) => {
        let prepareCalls = 0;

        db.run = function(sql, params, cb) {
            cb.call(this, new Error('DB Delete failed'));
        };

        db.prepare = function(sql) {
            prepareCalls++;
            return {
                run: function(params, cb) { cb(null); },
                finalize: function() {}
            };
        };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [{ student_id: 1, status: 'present' }]
            }
        };

        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Yoklama kaydedilirken hata oluştu' });
            assert.strictEqual(prepareCalls, 0);
            done();
        });
        handler(req, res);
    });

    // K. Insert failure preservation
    await t.test('K. Insert failure preservation', (t, done) => {
        let finalizeCalls = 0;

        db.run = function(sql, params, cb) { cb.call(this, null); };

        db.prepare = function(sql) {
            return {
                run: function(params, cb) {
                    if (params[0] === 47) {
                        cb(new Error('Insert failed'));
                    } else {
                        cb(null);
                    }
                },
                finalize: function() {
                    finalizeCalls++;
                }
            };
        };

        const req = {
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'present' },
                    { student_id: 47, status: 'absent' }, // This will fail
                    { student_id: 3, status: 'present' }
                ]
            }
        };

        const res = createMockRes((resObj) => {
            assert.strictEqual(resObj.statusCode, 500);
            assert.deepEqual(resObj.body, { error: 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu' });
            assert.strictEqual(finalizeCalls, 1);
            done();
        });
        handler(req, res);
    });
});
