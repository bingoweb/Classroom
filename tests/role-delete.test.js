const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-role-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

test('Role Delete ID Validation Tests', async (t) => {
    t.after(async () => {
        global.setInterval = originalSetInterval;

        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }

        await new Promise(resolve => {
            db.close((err) => {
                resolve();
            });
        });

        const filesToRemove = [
            testDbPath,
            testDbPath + '-journal',
            testDbPath + '-wal',
            testDbPath + '-shm'
        ];

        for (const file of filesToRemove) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {
                // Ignore missing files or unlinking errors during cleanup
            }
        }

        try {
            if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir);
            }
        } catch (e) {
            // Ignore
        }
    });

    const stack = app._router.stack;
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/roles/:id' && layer.route.methods.delete);
    if (!routeLayer) throw new Error("DELETE /api/roles/:id route not found");
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
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) {
                if (onEnd) onEnd(this.statusCode || 200, data);
                return this;
            }
        };
    }

    const defaultReq = (overrides = {}) => ({
        params: { id: '1' },
        ...overrides
    });

    // A. Invalid IDs
    const invalidIds = [
        'abc', '1abc', 'abc1', '1.5', '1e2', '+1', '-1', '0', '00', '01', '1 ', ' 1', '', '   ', '9007199254740992'
    ];

    for (const invalidId of invalidIds) {
        await t.test(`A. invalid ID "${invalidId}" returns 400 and performs no db query`, (t, done) => {
            let dbRunCalled = false;
            db.run = () => { dbRunCalled = true; };

            const req = defaultReq({ params: { id: invalidId } });
            const res = createMockRes((status, data) => {
                assert.strictEqual(status, 400);
                assert.deepEqual(data, { error: 'Geçersiz rol ID' });
                assert.strictEqual(dbRunCalled, false);
                done();
            });
            handler(req, res);
        });
    }

    // B. Valid numeric conversion
    const validIds = [
        { raw: '1', numeric: 1 },
        { raw: '47', numeric: 47 },
        { raw: '9007199254740991', numeric: 9007199254740991 }
    ];

    for (const validId of validIds) {
        await t.test(`B. valid ID "${validId.raw}" is converted to numeric ${validId.numeric} and passed to db.run`, (t, done) => {
            let runQueryParam = null;
            
            db.run = function(sql, params, cb) {
                runQueryParam = params[0];
                cb.call({ changes: 1 }, null);
            };

            const req = defaultReq({ params: { id: validId.raw } });
            const res = createMockRes((status, data) => {
                assert.strictEqual(status, 200);
                assert.strictEqual(runQueryParam, validId.numeric);
                done();
            });
            handler(req, res);
        });
    }

    // C. Successful deletion
    await t.test('C. Successful deletion returns 200 and message', (t, done) => {
        db.run = function(sql, params, cb) {
            cb.call({ changes: 1 }, null);
        };

        const req = defaultReq({ params: { id: '47' } });
        const res = createMockRes((status, data) => {
            assert.strictEqual(status, 200);
            assert.deepEqual(data, { message: 'Rol silindi', changes: 1 });
            done();
        });
        handler(req, res);
    });

    // D. Missing role
    await t.test('D. Missing role returns 404', (t, done) => {
        db.run = function(sql, params, cb) {
            cb.call({ changes: 0 }, null);
        };

        const req = defaultReq({ params: { id: '47' } });
        const res = createMockRes((status, data) => {
            assert.strictEqual(status, 404);
            assert.deepEqual(data, { error: 'Rol bulunamadı' });
            done();
        });
        handler(req, res);
    });

    // E. Database error
    await t.test('E. Database error returns 500', (t, done) => {
        let runQueryParam = null;
        db.run = function(sql, params, cb) {
            runQueryParam = params[0];
            cb(new Error('DB Error'));
        };

        const req = defaultReq({ params: { id: '47' } });
        const res = createMockRes((status, data) => {
            assert.strictEqual(status, 500);
            assert.deepEqual(data, { error: 'Rol silinirken hata oluştu' });
            assert.strictEqual(runQueryParam, 47);
            done();
        });
        handler(req, res);
    });
});
