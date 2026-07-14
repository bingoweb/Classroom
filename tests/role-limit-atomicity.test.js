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
    return new Promise((resolve) => {
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
                if (this.responseCount > 1) {
                    assert.fail('json() called more than once');
                }
                this.body = data;
                resolve(this);
                return this;
            }
        };

        handler(req, res);
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

    await t.test('Required vice-president race', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const st1 = await runDb("INSERT INTO students (name) VALUES (?)", ['A']);
        const st2 = await runDb("INSERT INTO students (name) VALUES (?)", ['B']);
        const st3 = await runDb("INSERT INTO students (name) VALUES (?)", ['C']);

        // Seed exactly one existing vice_president
        await runDb("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [st1.lastID, 'vice_president']);

        // Invoke two concurrent requests
        const req1 = invokeHandler({ body: { student_id: st2.lastID.toString(), role_type: 'vice_president' } });
        const req2 = invokeHandler({ body: { student_id: st3.lastID.toString(), role_type: 'vice_president' } });
        
        const results = await Promise.all([req1, req2]);
        
        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'En fazla 2 başkan yardımcısı olabilir' });

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'vice_president'");
        assert.strictEqual(countRow.count, 2);
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

        // Invoke two concurrent requests for two different eligible students
        const req1 = invokeHandler({ body: { student_id: students[3].toString(), role_type: 'duty' } });
        const req2 = invokeHandler({ body: { student_id: students[4].toString(), role_type: 'duty' } });
        
        const results = await Promise.all([req1, req2]);
        
        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'En fazla 4 nöbetçi atanabilir' });

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty'");
        assert.strictEqual(countRow.count, 4);
    });

    await t.test('Required duplicate race', async () => {
        await runDb("DELETE FROM roles", []);
        await runDb("DELETE FROM students", []);

        const st = await runDb("INSERT INTO students (name) VALUES (?)", ['Target']);

        const req1 = invokeHandler({ body: { student_id: st.lastID.toString(), role_type: 'duty' } });
        const req2 = invokeHandler({ body: { student_id: st.lastID.toString(), role_type: 'duty' } });
        
        const results = await Promise.all([req1, req2]);
        
        const successes = results.filter(r => r.statusCode === 200);
        const failures = results.filter(r => r.statusCode === 400);

        assert.strictEqual(successes.length, 1);
        assert.strictEqual(failures.length, 1);
        
        assert.deepEqual(failures[0].body, { error: 'Bu öğrenci zaten nöbetçi' });

        const countRow = await getDb("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty' AND student_id = ?", [st.lastID]);
        assert.strictEqual(countRow.count, 1);
    });
});
