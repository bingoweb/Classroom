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
const { Logger, COMPONENTS } = require('../backend/logger.js');

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

    const matchingRoutes = app._router.stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/attendance' &&
            layer.route.methods.post
    );
    assert.strictEqual(matchingRoutes.length, 1, 'Exactly one matching POST /api/attendance route must exist');
    const routeLayer = matchingRoutes[0];
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

    // 0. Structural body validation
    const structuralBodies = [
        undefined, null, [], 'attendance', 42, true, false
    ];

    await t.test('0. Structural body validation', async (subT) => {
        for (let i = 0; i < structuralBodies.length; i++) {
            const body = structuralBodies[i];
            const typeName = Object.prototype.toString.call(body);
            await subT.test(`structurally invalid body ${typeName} at index ${i} returns 400 and performs no db operations`, async () => {
                let dbCalls = 0;
                db.run = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const resObj = await invokeHandler({ body });
                assert.strictEqual(resObj.statusCode, 400);
                assert.deepEqual(resObj.body, { error: 'Tarih ve yoklama listesi gereklidir' });
                assert.strictEqual(resObj.count, 1);
                assert.strictEqual(dbCalls, 0);
            });
        }
    });

    await t.test('0. Missing field validation', async () => {
        let dbCalls = 0;
        db.run = () => { dbCalls++; };
        db.prepare = () => { dbCalls++; };

        const resObj = await invokeHandler({ body: {} });
        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Tarih ve yoklama listesi gereklidir' });
        assert.strictEqual(resObj.count, 1);
        assert.strictEqual(dbCalls, 0);
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
        let commitCallbackCompleted = false;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql === "COMMIT") {
                setTimeout(() => {
                    commitCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
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

        assert.strictEqual(commitCallbackCompleted, true, 'Response must wait for asynchronous commit callback');
        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Yoklama başarıyla kaydedildi', count: 3 });

        assert.strictEqual(runCalls.length, 6);
        assert.strictEqual(runCalls[0].sql, "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1].sql, "DELETE FROM attendance WHERE date = ?");
        assert.deepEqual(runCalls[1].params, ['2026-07-13']);
        assert.strictEqual(runCalls[2].sql, "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
        assert.deepEqual(runCalls[2].params, [1, '2026-07-13', 'present']);
        assert.strictEqual(runCalls[3].sql, "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
        assert.deepEqual(runCalls[3].params, [47, '2026-07-13', 'absent']);
        assert.strictEqual(runCalls[4].sql, "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
        assert.deepEqual(runCalls[4].params, [9007199254740991, '2026-07-13', 'present']);
        assert.strictEqual(runCalls[5].sql, "COMMIT");
    });

    // H. Mandatory mocked empty-list transaction regression
    await t.test('H. Mocked empty-list transaction regression', async () => {
        let runCalls = [];
        let prepareCalls = 0;
        let commitCallbackCompleted = false;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql === "COMMIT") {
                setTimeout(() => {
                    commitCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        db.prepare = () => {
            prepareCalls++;
            return { run: () => {}, finalize: () => {} };
        };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [] } });

        assert.strictEqual(commitCallbackCompleted, true, 'Response must wait for asynchronous commit callback');
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
        let rollbackCallbackCompleted = false;

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push(sql);
            if (sql.startsWith("DELETE")) {
                cb(new Error("delete failed"));
            } else if (sql === "ROLLBACK") {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        db.prepare = () => { prepareCalls++; return { run: () => {}, finalize: () => {} }; };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: 'present' }] } });

        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
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
        let insertRunCalls = 0;
        let rollbackCallbackCompleted = false;

        const originalLogError = Logger.prototype.error;
        const errorLogCalls = [];

        try {
            Logger.prototype.error = function (...args) {
                errorLogCalls.push(args);
            };

            const insertionError = new Error('insertion failed');

            db.run = (sql, params, cb) => {
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                runCalls.push(sql);
                if (sql.startsWith("INSERT")) {
                    insertRunCalls++;
                    if (insertRunCalls === 2) {
                        cb(insertionError);
                    } else {
                        cb(null);
                    }
                } else if (sql === "ROLLBACK") {
                    setTimeout(() => {
                        rollbackCallbackCompleted = true;
                        cb(null);
                    }, 5);
                } else {
                    cb(null);
                }
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

            assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
            assert.strictEqual(resObj.statusCode, 500);
            assert.strictEqual(resObj.body.error, 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu');
            assert.strictEqual(runCalls.length, 5);
            assert.strictEqual(runCalls[0], "BEGIN IMMEDIATE TRANSACTION");
            assert.strictEqual(runCalls[1], "DELETE FROM attendance WHERE date = ?");
            assert.strictEqual(runCalls[2], "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
            assert.strictEqual(runCalls[3], "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
            assert.strictEqual(runCalls[4], "ROLLBACK");
            assert.strictEqual(insertRunCalls, 2);

            assert.strictEqual(
                errorLogCalls.length,
                1,
                'Logger.error must be called exactly once for the insertion failure'
            );
            const errorLogArgs = errorLogCalls[0];
            assert.strictEqual(errorLogArgs[0], COMPONENTS.API);
            assert.strictEqual(errorLogArgs[1], 'Error inserting attendance');
            assert.strictEqual(errorLogArgs[2], insertionError);
            assert.deepEqual(errorLogArgs[3], {
                studentId: 2,
                date: '2026-07-13',
                status: 'absent'
            });
        } finally {
            Logger.prototype.error = originalLogError;
        }
    });

    // L. Mocked commit-failure regression
    await t.test('L. Mocked commit-failure regression', async () => {
        let runCalls = [];
        let commitCallbackCompleted = false;
        let rollbackCallbackCompleted = false;

        const commitError = new Error('commit failed');

        db.run = (sql, params, cb) => {
            if (typeof params === 'function') {
                cb = params;
                params = [];
            }
            runCalls.push({ sql, params });
            if (sql === "COMMIT") {
                setTimeout(() => {
                    commitCallbackCompleted = true;
                    cb(commitError);
                }, 5);
            } else if (sql === "ROLLBACK") {
                setTimeout(() => {
                    rollbackCallbackCompleted = true;
                    cb(null);
                }, 5);
            } else {
                cb(null);
            }
        };

        const resObj = await invokeHandler({ body: { date: '2026-07-13', attendanceList: [{ student_id: 1, status: 'present' }] } });

        assert.strictEqual(commitCallbackCompleted, true, 'Response must wait for asynchronous commit callback');
        assert.strictEqual(rollbackCallbackCompleted, true, 'Response must wait for asynchronous rollback callback');
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Yoklama kaydedilirken hata oluştu' });

        assert.strictEqual(runCalls.length, 5);
        assert.strictEqual(runCalls[0].sql, "BEGIN IMMEDIATE TRANSACTION");
        assert.strictEqual(runCalls[1].sql, "DELETE FROM attendance WHERE date = ?");
        assert.strictEqual(runCalls[2].sql, "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
        assert.strictEqual(runCalls[3].sql, "COMMIT");
        assert.strictEqual(runCalls[4].sql, "ROLLBACK");

        const commits = runCalls.filter(call => call.sql === "COMMIT");
        const rollbacks = runCalls.filter(call => call.sql === "ROLLBACK");
        assert.strictEqual(commits.length, 1, 'exactly one commit was attempted');
        assert.strictEqual(rollbacks.length, 1, 'exactly one rollback was attempted');
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
