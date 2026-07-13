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
            if (err) reject(err);
            else resolve();
        });
    });
}

function removeFileIfPresent(fsApi, filePath) {
    try {
        fsApi.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function removeDirectoryIfPresent(fsApi, directoryPath) {
    try {
        fsApi.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

test('Attendance Bulk Validation Tests', async (t) => {
    t.after(async () => {
        try {
            await closeDatabase(db);
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
    });

    await db.scheduleMigrationPromise;

    const stack = app._router.stack;
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/attendance' && layer.route.methods.post);
    assert.ok(routeLayer, "Exactly one matching POST /api/attendance route must exist");
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

    function invokeHandler(req, handlerToUse = handler, timeoutMs = 500) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            const fail = (err) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err);
            };

            timeoutId = setTimeout(() => {
                fail(new Error(`Expected exactly one response, received ${responseCount}`));
            }, timeoutMs);

            const scheduleCompletion = () => {
                if (completionScheduled) return;
                completionScheduled = true;
                setImmediate(() => {
                    if (settled) return;
                    if (responseCount !== 1 || !responseSnapshot) {
                        fail(new Error(`Expected exactly one response, received ${responseCount}`));
                        return;
                    }
                    settled = true;
                    cleanup();
                    resolve({
                        ...responseSnapshot,
                        count: responseCount
                    });
                });
            };

            const res = {
                statusCode: 200,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(data) {
                    responseCount++;
                    if (responseCount > 1) {
                        fail(new Error('Response sent more than once'));
                        return this;
                    }
                    responseSnapshot = {
                        statusCode: this.statusCode || 200,
                        body: data
                    };
                    scheduleCompletion();
                    return this;
                }
            };

            const next = (err) => {
                if (err) fail(err);
                else fail(new Error('next() called without error'));
            };

            try {
                handlerToUse(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('Helper self-regression: two synchronous responses', async () => {
        const doubleHandler = (req, res) => {
            res.status(200).json({ first: true });
            res.status(500).json({ second: true });
        };
        try {
            await invokeHandler({}, doubleHandler);
            assert.fail('Should have rejected due to double response');
        } catch (err) {
            assert.match(err.message, /Response sent more than once/);
        }
    });

    await t.test('Helper self-regression: zero responses', async () => {
        const noResponseHandler = () => {};
        try {
            await invokeHandler({}, noResponseHandler, 20);
            assert.fail('Should have rejected due to zero responses');
        } catch (err) {
            assert.match(err.message, /Expected exactly one response, received 0/);
        }
    });

    // A. Existing top-level validation
    const topLevelInvalid = [
        { date: '', attendanceList: [] },
        { attendanceList: [] },
        { date: '2026-07-13', attendanceList: null },
        { date: '2026-07-13', attendanceList: {} }
    ];

    await t.test('A. Existing top-level validation', async (subT) => {
        for (const reqBody of topLevelInvalid) {
            await subT.test(`rejects ${JSON.stringify(reqBody)} before db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: reqBody });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Tarih ve yoklama listesi gereklidir' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // B. Non-object entries
    const nonObjectEntries = [
        null, undefined, true, false, 'invalid', 47, []
    ];

    await t.test('B. Non-object entries', async (subT) => {
        for (let i = 0; i < nonObjectEntries.length; i++) {
            await subT.test(`rejects non-object entry at index ${i}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [nonObjectEntries[i]] } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // C. Invalid student IDs
    const invalidIds = [
        undefined, null, true, false, {}, [], 'abc', '1abc', 'abc1',
        1.5, '1.5', -1, '-1', 0, '0', '00', '01', '1 ', ' 1', '', '   ',
        9007199254740992, '9007199254740992'
    ];

    await t.test('C. Invalid student IDs', async (subT) => {
        for (const invalidId of invalidIds) {
            await subT.test(`rejects invalid ID: ${invalidId}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: invalidId, status: 'present' }] } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // D. Invalid statuses
    const invalidStatuses = [
        undefined, null, '', '   ', 'PRESENT', 'ABSENT', 'Present', 'late', 1, true
    ];

    await t.test('D. Invalid statuses', async (subT) => {
        for (const invalidStatus of invalidStatuses) {
            await subT.test(`rejects invalid status: ${invalidStatus}`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: invalidStatus }] } });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    // E. Mixed valid and invalid requests
    await t.test('E. Mixed valid and invalid requests fail completely', async () => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.prepare = () => { dbCalls++; };

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'present' },
                    { student_id: 'invalid', status: 'present' }
                ]
            }
        });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
        assert.strictEqual(dbCalls, 0);
    });

    // F. Duplicate normalized IDs
    await t.test('F. Duplicate normalized IDs fail completely', async () => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.prepare = () => { dbCalls++; };

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 47, status: 'present' },
                    { student_id: '47', status: 'absent' }
                ]
            }
        });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Yoklama listesinde geçersiz kayıt var' });
        assert.strictEqual(dbCalls, 0);
    });

    // G. Mandatory mocked successful-transaction regression
    await t.test('G. Mocked successful-transaction regression', async () => {
        let runCalls = [];
        let stmtRunCalls = [];
        let stmtFinalizeCalls = 0;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            cb(null);
        };

        db.prepare = (sql) => {
            return {
                run: (params, cb) => {
                    stmtRunCalls.push({ sql, params });
                    cb(null);
                },
                finalize: () => {
                    stmtFinalizeCalls++;
                }
            };
        };

        const reqBody = {
            date: '2026-07-13',
            attendanceList: [
                { student_id: '1', status: 'present' },
                { student_id: 47, status: 'absent' },
                { student_id: '9007199254740991', status: 'present' }
            ]
        };

        const resObj = await invokeHandler({ body: reqBody });

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Yoklama başarıyla kaydedildi', count: 3 });

        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0].sql, "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1].sql, "DELETE FROM attendance WHERE date = ?");
        assert.deepEqual(runCalls[1].params, ['2026-07-13']);
        assert.strictEqual(runCalls[2].sql, "COMMIT");

        assert.strictEqual(stmtRunCalls.length, 3);
        assert.deepEqual(stmtRunCalls[0].params, [1, '2026-07-13', 'present']);
        assert.strictEqual(typeof stmtRunCalls[0].params[0], 'number');
        assert.deepEqual(stmtRunCalls[1].params, [47, '2026-07-13', 'absent']);
        assert.strictEqual(typeof stmtRunCalls[1].params[0], 'number');
        assert.deepEqual(stmtRunCalls[2].params, [9007199254740991, '2026-07-13', 'present']);
        assert.strictEqual(typeof stmtRunCalls[2].params[0], 'number');

        assert.strictEqual(stmtFinalizeCalls, 1);
    });

    // H. Mandatory mocked empty-list transaction regression
    await t.test('H. Mocked empty-list transaction regression', async () => {
        let runCalls = [];
        let prepareCalls = 0;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            cb(null);
        };

        db.prepare = () => {
            prepareCalls++;
            return { run: () => {}, finalize: () => {} };
        };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [] } });

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Yoklama kaydedildi', count: 0 });

        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0].sql, "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1].sql, "DELETE FROM attendance WHERE date = ?");
        assert.strictEqual(runCalls[2].sql, "COMMIT");
        assert.strictEqual(prepareCalls, 0);
    });

    // I. Mocked begin-failure regression
    await t.test('I. Mocked begin-failure regression', async () => {
        let runCalls = [];
        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql === "BEGIN IMMEDIATE TRANSACTION") {
                cb(new Error("begin failed"));
            } else {
                cb(null);
            }
        };

        let prepareCalls = 0;
        db.prepare = () => { prepareCalls++; };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: 'present' }] } });

        assert.strictEqual(resObj.statusCode, 500);
        assert.strictEqual(runCalls.length, 1);
        assert.strictEqual(runCalls[0], "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(prepareCalls, 0);
    });

    // J. Mocked delete-failure regression
    await t.test('J. Mocked delete-failure regression', async () => {
        let runCalls = [];
        let prepareCalls = 0;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql.startsWith("DELETE")) {
                cb(new Error("delete failed"));
            } else {
                setTimeout(() => cb(null), 5);
            }
        };

        db.prepare = () => { prepareCalls++; return { run: () => {}, finalize: () => {} }; };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: 'present' }] } });

        assert.strictEqual(resObj.statusCode, 500);
        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0], "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1], "DELETE FROM attendance WHERE date = ?");
        assert.strictEqual(runCalls[2], "ROLLBACK");
        assert.strictEqual(prepareCalls, 0);
    });

    // K. Mocked insertion-failure regression
    await t.test('K. Mocked insertion-failure regression', async () => {
        let runCalls = [];
        let stmtRunCalls = 0;
        let stmtFinalizeCalls = 0;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            setTimeout(() => cb(null), 5);
        };

        db.prepare = () => {
            return {
                run: (params, cb) => {
                    stmtRunCalls++;
                    if (stmtRunCalls === 2) {
                        cb(new Error("insertion failed"));
                    } else {
                        cb(null);
                    }
                },
                finalize: () => {
                    stmtFinalizeCalls++;
                }
            };
        };

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'present' },
                    { student_id: 2, status: 'absent' },
                    { student_id: 3, status: 'present' }
                ]
            }
        });

        assert.strictEqual(resObj.statusCode, 500);
        assert.strictEqual(resObj.body.error, 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu');
        assert.strictEqual(runCalls.length, 3);
        assert.strictEqual(runCalls[0], "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1], "DELETE FROM attendance WHERE date = ?");
        assert.strictEqual(runCalls[2], "ROLLBACK");
        assert.strictEqual(stmtRunCalls, 2);
        assert.strictEqual(stmtFinalizeCalls, 1);
    });

    // L. Mocked commit-failure regression
    await t.test('L. Mocked commit-failure regression', async () => {
        let runCalls = [];

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql === "COMMIT") {
                cb(new Error("commit failed"));
            } else {
                setTimeout(() => cb(null), 5);
            }
        };

        db.prepare = () => {
            return {
                run: (params, cb) => cb(null),
                finalize: () => {}
            };
        };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: 'present' }] } });

        assert.strictEqual(resObj.statusCode, 500);
        assert.strictEqual(runCalls.length, 4);
        assert.strictEqual(runCalls[0], "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1], "DELETE FROM attendance WHERE date = ?");
        assert.strictEqual(runCalls[2], "COMMIT");
        assert.strictEqual(runCalls[3], "ROLLBACK");
    });

    // Real database test helpers
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

    // M. Mandatory real-database rollback regression
    await t.test('M. Real-database rollback regression', async () => {
        await runSql("DELETE FROM attendance");
        await runSql("DELETE FROM students");

        await runSql("INSERT INTO students (id, name, gender) VALUES (1, 'A B', 'M')");
        await runSql("INSERT INTO students (id, name, gender) VALUES (2, 'C D', 'F')");

        await runSql("INSERT INTO attendance (student_id, date, status) VALUES (1, '2026-07-13', 'present')");
        await runSql("INSERT INTO attendance (student_id, date, status) VALUES (2, '2026-07-13', 'absent')");

        const beforeRows = await getSql("SELECT * FROM attendance WHERE date = '2026-07-13' ORDER BY student_id");

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'absent' }, // valid
                    { student_id: 999999, status: 'present' } // non-existent ID triggers FK failure
                ]
            }
        });

        assert.strictEqual(resObj.statusCode, 500);

        const afterRows = await getSql("SELECT * FROM attendance WHERE date = '2026-07-13' ORDER BY student_id");
        assert.deepEqual(afterRows, beforeRows);
    });

    // N. Mandatory real-database successful replacement regression
    await t.test('N. Real-database successful replacement regression', async () => {
        await runSql("DELETE FROM attendance");
        await runSql("DELETE FROM students");

        await runSql("INSERT INTO students (id, name, gender) VALUES (1, 'A B', 'M')");
        await runSql("INSERT INTO students (id, name, gender) VALUES (2, 'C D', 'F')");

        await runSql("INSERT INTO attendance (student_id, date, status) VALUES (1, '2026-07-13', 'present')");

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: [
                    { student_id: 1, status: 'absent' },
                    { student_id: 2, status: 'present' }
                ]
            }
        });

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Yoklama başarıyla kaydedildi', count: 2 });

        const afterRows = await getSql("SELECT student_id, status FROM attendance WHERE date = '2026-07-13' ORDER BY student_id");
        assert.deepEqual(afterRows, [
            { student_id: 1, status: 'absent' },
            { student_id: 2, status: 'present' }
        ]);
    });

    // O. Mandatory real-database empty-list regression
    await t.test('O. Real-database empty-list regression', async () => {
        await runSql("DELETE FROM attendance");
        await runSql("DELETE FROM students");

        await runSql("INSERT INTO students (id, name, gender) VALUES (1, 'A B', 'M')");

        await runSql("INSERT INTO attendance (student_id, date, status) VALUES (1, '2026-07-13', 'present')");
        await runSql("INSERT INTO attendance (student_id, date, status) VALUES (1, '2026-07-14', 'present')");

        const resObj = await invokeHandler({
            body: {
                date: '2026-07-13',
                attendanceList: []
            }
        });

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Yoklama kaydedildi', count: 0 });

        const targetDateRows = await getSql("SELECT * FROM attendance WHERE date = '2026-07-13'");
        assert.strictEqual(targetDateRows.length, 0);

        const otherDateRows = await getSql("SELECT * FROM attendance WHERE date = '2026-07-14'");
        assert.strictEqual(otherDateRows.length, 1);
    });

});
