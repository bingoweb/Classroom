const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.CLASSROOM_DB_PATH = path.join(os.tmpdir(), `dummy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.db`);

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server');
const db = require('../backend/database');

test('Legacy Schedule Write Tests', async (t) => {
    await db.scheduleMigrationPromise;

    const routeLayer = app._router.stack.find(
        (layer) => layer.route && layer.route.path === '/api/schedule' && layer.route.methods.post
    );

    assert.ok(routeLayer, 'POST /api/schedule route not found');
    
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbGet;
    let originalDbRun;
    let originalDbAll;
    let originalDbPrepare;

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalDbAll = db.all;
        originalDbPrepare = db.prepare;
    });

    t.afterEach(() => {
        db.get = originalDbGet;
        db.run = originalDbRun;
        db.all = originalDbAll;
        db.prepare = originalDbPrepare;
    });

    t.after(async () => {
        return new Promise((resolve) => {
            db.close((err) => {
                try { fs.unlinkSync(process.env.CLASSROOM_DB_PATH); } catch (e) {}
                try { fs.unlinkSync(process.env.CLASSROOM_DB_PATH + '-journal'); } catch (e) {}
                try { fs.unlinkSync(process.env.CLASSROOM_DB_PATH + '-wal'); } catch (e) {}
                try { fs.unlinkSync(process.env.CLASSROOM_DB_PATH + '-shm'); } catch (e) {}
                global.setInterval = originalSetInterval;
                resolve();
            });
        });
    });

    function createMockRes() {
        const res = {
            statusCode: 200,
            responseCount: 0,
            body: null,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.responseCount++;
                if (this.responseCount > 1) {
                    throw new Error('Response sent more than once');
                }
                this.body = data;
                return this;
            }
        };
        return res;
    }

    // Structural body validation
    const structuralBodies = [
        undefined, null, [], 'schedule', 42, true, false
    ];

    await t.test('1. Structural body validation', async (subT) => {
        for (let i = 0; i < structuralBodies.length; i++) {
            const body = structuralBodies[i];
            const typeName = Object.prototype.toString.call(body);
            await subT.test(`structurally invalid body ${typeName} at index ${i} returns 400`, (subsubT, done) => {
                let dbCalls = 0;
                db.get = () => { dbCalls++; };
                db.run = () => { dbCalls++; };
                db.all = () => { dbCalls++; };
                db.prepare = () => { dbCalls++; };

                const req = { body };
                const res = createMockRes();

                assert.doesNotThrow(() => {
                    handler(req, res);
                });

                assert.strictEqual(res.statusCode, 400);
                assert.deepEqual(res.body, { error: 'Ders programı isteği geçersiz.' });
                assert.strictEqual(res.responseCount, 1);
                assert.strictEqual(dbCalls, 0);
                
                done();
            });
        }
    });

    await t.test('2. Valid object compatibility: Existing-row update', (subT, done) => {
        let getCalls = 0;
        let runCalls = 0;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            assert.strictEqual(sql, "SELECT id FROM schedule WHERE day = ? AND period = ?");
            assert.deepEqual(params, ['weekday', 2]);
            cb(null, { id: 17 });
        };
        
        db.run = (sql, params, cb) => {
            runCalls++;
            assert.strictEqual(sql, "UPDATE schedule SET course = ? WHERE id = ?");
            assert.deepEqual(params, ['Fen Bilimleri', 17]);
            cb.call({ lastID: 0 }, null);
        };

        const req = {
            body: {
                day: 'weekday',
                period: 2,
                course: 'Fen Bilimleri'
            }
        };
        
        const res = createMockRes();
        
        // Mock res.json to track asynchronous completion
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 200);
            assert.deepEqual(this.body, { message: 'Updated' });
            assert.strictEqual(this.responseCount, 1);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 1);
            done();
        };

        assert.doesNotThrow(() => {
            handler(req, res);
        });
    });

    await t.test('3. Valid object compatibility: Missing-row insert', (subT, done) => {
        let getCalls = 0;
        let runCalls = 0;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            assert.strictEqual(sql, "SELECT id FROM schedule WHERE day = ? AND period = ?");
            assert.deepEqual(params, ['weekday', 2]);
            cb(null, undefined);
        };
        
        db.run = (sql, params, cb) => {
            runCalls++;
            assert.strictEqual(sql, "INSERT INTO schedule (day, period, course) VALUES (?, ?, ?)");
            assert.deepEqual(params, ['weekday', 2, 'Fen Bilimleri']);
            cb.call({ lastID: 47 }, null);
        };

        const req = {
            body: {
                day: 'weekday',
                period: 2,
                course: 'Fen Bilimleri'
            }
        };
        
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 200);
            assert.deepEqual(this.body, { id: 47 });
            assert.strictEqual(this.responseCount, 1);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 1);
            done();
        };

        assert.doesNotThrow(() => {
            handler(req, res);
        });
    });

    await t.test('4. Database-error compatibility: initial db.get failure', (subT, done) => {
        let getCalls = 0;
        let runCalls = 0;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            cb(new Error('GET_ERROR'), null);
        };
        
        db.run = () => {
            runCalls++;
        };

        const req = { body: { day: 'weekday', period: 2, course: 'Fen Bilimleri' } };
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 500);
            assert.deepEqual(this.body, { error: 'GET_ERROR' });
            assert.strictEqual(this.responseCount, 1);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 0);
            done();
        };

        handler(req, res);
    });

    await t.test('5. Database-error compatibility: update db.run failure', (subT, done) => {
        let getCalls = 0;
        let runCalls = 0;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            cb(null, { id: 17 });
        };
        
        db.run = (sql, params, cb) => {
            runCalls++;
            cb(new Error('UPDATE_ERROR'), null);
        };

        const req = { body: { day: 'weekday', period: 2, course: 'Fen Bilimleri' } };
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 500);
            assert.deepEqual(this.body, { error: 'UPDATE_ERROR' });
            assert.strictEqual(this.responseCount, 1);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 1);
            done();
        };

        handler(req, res);
    });

    await t.test('6. Database-error compatibility: insert db.run failure', (subT, done) => {
        let getCalls = 0;
        let runCalls = 0;
        
        db.get = (sql, params, cb) => {
            getCalls++;
            cb(null, undefined);
        };
        
        db.run = (sql, params, cb) => {
            runCalls++;
            cb(new Error('INSERT_ERROR'), null);
        };

        const req = { body: { day: 'weekday', period: 2, course: 'Fen Bilimleri' } };
        const res = createMockRes();
        
        const originalJson = res.json;
        res.json = function(data) {
            originalJson.call(this, data);
            assert.strictEqual(this.statusCode, 500);
            assert.deepEqual(this.body, { error: 'INSERT_ERROR' });
            assert.strictEqual(this.responseCount, 1);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 1);
            done();
        };

        handler(req, res);
    });
});
