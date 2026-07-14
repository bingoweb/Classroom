const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-atomicity-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function invokeHandler(reqOverrides) {
    return new Promise((resolve, reject) => {
        const stack = app._router.stack;
        const matchingRoutes = stack.filter(
            layer =>
                layer.route &&
                layer.route.path === '/api/roles' &&
                layer.route.methods.post
        );
        assert.strictEqual(matchingRoutes.length, 1);
        const routeLayer = matchingRoutes[0];
        const middlewares = routeLayer.route.stack;
        const handler = middlewares[middlewares.length - 1].handle;

        const req = {
            body: {},
            ...reqOverrides
        };

        let isSettled = false;
        let resolveTimer = null;

        const timeoutTimer = setTimeout(() => {
            if (!isSettled) {
                isSettled = true;
                reject(new Error('Handler did not respond'));
            }
        }, 500);

        const res = {
            statusCode: 200,
            responseCount: 0,
            body: null,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.responseCount++;
                if (isSettled) {
                    return this;
                }
                if (this.responseCount > 1) {
                    isSettled = true;
                    clearTimeout(timeoutTimer);
                    if (resolveTimer) clearImmediate(resolveTimer);
                    reject(new Error('Multiple responses detected'));
                    return this;
                }
                this.body = data;

                resolveTimer = setImmediate(() => {
                    if (!isSettled) {
                        isSettled = true;
                        clearTimeout(timeoutTimer);
                        resolve(this);
                    }
                });
                return this;
            }
        };

        try {
            handler(req, res, (err) => {
                if (!isSettled) {
                    isSettled = true;
                    clearTimeout(timeoutTimer);
                    if (resolveTimer) clearImmediate(resolveTimer);
                    reject(err || new Error('next() called'));
                }
            });
        } catch (err) {
            if (!isSettled) {
                isSettled = true;
                clearTimeout(timeoutTimer);
                if (resolveTimer) clearImmediate(resolveTimer);
                reject(err);
            }
        }
    });
}

function runDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function getDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

test('Role Limit Atomicity Tests', async (t) => {
    t.after(async () => {
        await new Promise((resolve) => db.close(resolve));
        for (const suffix of ['', '-journal', '-wal', '-shm']) {
            try { fs.unlinkSync(testDbPath + suffix); } catch (e) {}
        }
        try { fs.rmdirSync(tempDir); } catch (e) {}
        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    await db.scheduleMigrationPromise;

    await t.test('Helper self-regression: no response is rejected', async () => {
        const originalStack = app._router.stack;
        app._router.stack = [{ route: { path: '/api/roles', methods: { post: true }, stack: [{ handle: (req, res) => {} }] } }];
        await assert.rejects(invokeHandler({}), /Handler did not respond/);
        app._router.stack = originalStack;
    });

    await t.test('Helper self-regression: two synchronous responses is rejected', async () => {
        const originalStack = app._router.stack;
        app._router.stack = [{ route: { path: '/api/roles', methods: { post: true }, stack: [{ handle: (req, res) => { res.json({a:1}); res.json({b:2}); } }] } }];
        await assert.rejects(invokeHandler({}), /Multiple responses detected/);
        app._router.stack = originalStack;
    });

    await t.test('Helper self-regression: one response resolves with responseCount === 1', async () => {
        const originalStack = app._router.stack;
        app._router.stack = [{ route: { path: '/api/roles', methods: { post: true }, stack: [{ handle: (req, res) => { res.json({a:1}); } }] } }];
        const res = await invokeHandler({});
        assert.strictEqual(res.responseCount, 1);
        assert.deepEqual(res.body, {a:1});
        app._router.stack = originalStack;
    });

    await t.test('Required vice-president race', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const st1 = await runDb("INSERT INTO students (name) VALUES (?)", ['A']);
        const st2 = await runDb("INSERT INTO students (name) VALUES (?)", ['B']);
        const st3 = await runDb("INSERT INTO students (name) VALUES (?)", ['C']);

        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [st1.lastID, 'vice_president']);

        const candidate1 = st2.lastID;
        const candidate2 = st3.lastID;

        const req1 = invokeHandler({ body: { student_id: candidate1.toString(), role_type: 'vice_president' } });
        const req2 = invokeHandler({ body: { student_id: candidate2.toString(), role_type: 'vice_president' } });
        
        const results = await Promise.all([req1, req2]);
        
        for (const res of results) {
            assert.strictEqual(res.responseCount, 1);
        }

        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'En fazla 2 başkan yardımcısı olabilir' });

        const successfulCandidate = results[0].statusCode === 200 ? candidate1 : candidate2;
        const failedCandidate = results[0].statusCode === 200 ? candidate2 : candidate1;

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'vice_president'");
        assert.strictEqual(countRow.count, 2);

        const successfulCandidateRows = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'vice_president' AND student_id = ?", [successfulCandidate]);
        assert.strictEqual(successfulCandidateRows.count, 1);

        const failedCandidateRows = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'vice_president' AND student_id = ?", [failedCandidate]);
        assert.strictEqual(failedCandidateRows.count, 0);

        const seededRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'vice_president' AND student_id = ?", [st1.lastID]);
        assert.strictEqual(seededRow.count, 1);
    });

    await t.test('Required duty race', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const students = [];
        for (let i = 0; i < 5; i++) {
            const st = await runDb("INSERT INTO students (name) VALUES (?)", [`Student ${i}`]);
            students.push(st.lastID);
        }

        // Seed exactly three existing duty rows
        for (let i = 0; i < 3; i++) {
            await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [students[i], 'duty']);
        }

        const candidate1 = students[3];
        const candidate2 = students[4];

        const req1 = invokeHandler({ body: { student_id: candidate1.toString(), role_type: 'duty' } });
        const req2 = invokeHandler({ body: { student_id: candidate2.toString(), role_type: 'duty' } });
        
        const results = await Promise.all([req1, req2]);
        
        for (const res of results) {
            assert.strictEqual(res.responseCount, 1);
        }

        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'En fazla 4 nöbetçi atanabilir' });

        const successfulCandidate = results[0].statusCode === 200 ? candidate1 : candidate2;
        const failedCandidate = results[0].statusCode === 200 ? candidate2 : candidate1;

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty'");
        assert.strictEqual(countRow.count, 4);

        const successfulCandidateRows = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty' AND student_id = ?", [successfulCandidate]);
        assert.strictEqual(successfulCandidateRows.count, 1);

        const failedCandidateRows = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty' AND student_id = ?", [failedCandidate]);
        assert.strictEqual(failedCandidateRows.count, 0);

        for (let i = 0; i < 3; i++) {
            const seededRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty' AND student_id = ?", [students[i]]);
            assert.strictEqual(seededRow.count, 1);
        }
    });

    await t.test('Required duplicate race', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const st = await runDb("INSERT INTO students (name) VALUES (?)", ['Target']);

        const req1 = invokeHandler({ body: { student_id: st.lastID.toString(), role_type: 'duty' } });
        const req2 = invokeHandler({ body: { student_id: st.lastID.toString(), role_type: 'duty' } });
        
        const results = await Promise.all([req1, req2]);
        
        for (const res of results) {
            assert.strictEqual(res.responseCount, 1);
        }

        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'Bu öğrenci zaten nöbetçi' });

        assert.ok(Number.isSafeInteger(successes[0].body.id) && successes[0].body.id > 0);
        const successRoleId = successes[0].body.id;

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty' AND student_id = ?", [st.lastID]);
        assert.strictEqual(countRow.count, 1);

        const actualRow = await getDb("SELECT id FROM roles WHERE role_type = 'duty' AND student_id = ?", [st.lastID]);
        assert.strictEqual(actualRow.id, successRoleId);
    });
});
