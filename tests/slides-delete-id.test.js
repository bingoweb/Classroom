const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-delete-id-test-'));
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

test('Slides Delete Route ID Validation', async (t) => {
    let deleteHandler;
    let originalDbGet, originalDbRun, originalFsExistsSync, originalFsUnlinkSync;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.delete && r.route.path === '/api/slides/:id');
        assert.strictEqual(routes.length, 1, 'Exactly one matching DELETE route must exist');
        deleteHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsExistsSync = fs.existsSync;
        originalFsUnlinkSync = fs.unlinkSync;
    });

    t.afterEach(() => {
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
    });

    t.after(async () => {
        await closeDatabase(db);
        removeFileIfPresent(fs, testDbPath);
        removeFileIfPresent(fs, testDbPath + '-journal');
        removeFileIfPresent(fs, testDbPath + '-wal');
        removeFileIfPresent(fs, testDbPath + '-shm');
        removeDirectoryIfPresent(fs, tempDir);

        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    function createMockRes(onComplete) {
        let called = 0;
        return {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                called++;
                if (called > 1) {
                    throw new Error('Response sent more than once');
                }
                this.body = data;
                onComplete({ statusCode: this.statusCode || 200, body: this.body, count: called });
            }
        };
    }

    await t.test('1. Mandatory malformed-string tests', async (t) => {
        const invalidStrings = [
            'abc', '47abc', 'abc47', '47.5', '47e2', '+47', '-47', '0', '00', '047',
            '47 ', ' 47', '', '   ', '9007199254740992'
        ];

        for (const val of invalidStrings) {
            await new Promise((resolve) => {
                let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
                db.get = () => { getCalled++; };
                db.run = () => { runCalled++; };
                fs.existsSync = () => { existsCalled++; };
                fs.unlinkSync = () => { unlinkCalled++; };

                const req = { params: { id: val } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
                    assert.strictEqual(getCalled, 0);
                    assert.strictEqual(runCalled, 0);
                    assert.strictEqual(existsCalled, 0);
                    assert.strictEqual(unlinkCalled, 0);
                    resolve();
                });
                deleteHandler(req, res);
            });
        }
    });

    await t.test('2. Mandatory invalid-type tests', async (t) => {
        const invalidTypes = [
            undefined, null, 1, 47, true, false, {}, [], new Number(47)
        ];

        for (const val of invalidTypes) {
            await new Promise((resolve) => {
                let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
                db.get = () => { getCalled++; };
                db.run = () => { runCalled++; };
                fs.existsSync = () => { existsCalled++; };
                fs.unlinkSync = () => { unlinkCalled++; };

                const req = { params: { id: val } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 400);
                    assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
                    assert.strictEqual(getCalled, 0);
                    assert.strictEqual(runCalled, 0);
                    assert.strictEqual(existsCalled, 0);
                    assert.strictEqual(unlinkCalled, 0);
                    resolve();
                });
                deleteHandler(req, res);
            });
        }
    });

    await t.test('3. Mandatory canonical-ID tests', async (t) => {
        const canonicals = [
            { raw: '1', numeric: 1 },
            { raw: '47', numeric: 47 },
            { raw: '9007199254740991', numeric: 9007199254740991 }
        ];

        for (const item of canonicals) {
            await new Promise((resolve) => {
                let getSql, getParams;
                let runCalled = 0, existsCalled = 0, unlinkCalled = 0;

                db.get = (sql, params, cb) => {
                    getSql = sql;
                    getParams = params;
                    cb(null, undefined); // row not found
                };
                db.run = () => { runCalled++; };
                fs.existsSync = () => { existsCalled++; };
                fs.unlinkSync = () => { unlinkCalled++; };

                const req = { params: { id: item.raw } };
                const res = createMockRes((resObj) => {
                    assert.strictEqual(resObj.statusCode, 404);
                    assert.deepEqual(resObj.body, { error: 'Slayt bulunamadı' });
                    assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
                    assert.deepEqual(getParams, [item.numeric]);
                    assert.strictEqual(typeof getParams[0], 'number');
                    assert.strictEqual(runCalled, 0);
                    assert.strictEqual(existsCalled, 0);
                    assert.strictEqual(unlinkCalled, 0);
                    resolve();
                });
                deleteHandler(req, res);
            });
        }
    });

    await t.test('4. Mandatory lookup-error test', async () => {
        await new Promise((resolve) => {
            let getSql, getParams;
            let runCalled = 0, existsCalled = 0, unlinkCalled = 0;

            db.get = (sql, params, cb) => {
                getSql = sql;
                getParams = params;
                cb(new Error('slide lookup failed'));
            };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: '47' } };
            const res = createMockRes((resObj) => {
                assert.strictEqual(resObj.statusCode, 500);
                assert.deepEqual(resObj.body, { error: 'slide lookup failed' });
                assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
                assert.deepEqual(getParams, [47]);
                assert.strictEqual(runCalled, 0);
                assert.strictEqual(existsCalled, 0);
                assert.strictEqual(unlinkCalled, 0);
                resolve();
            });
            deleteHandler(req, res);
        });
    });

    await t.test('5. Mandatory successful-deletion test', async () => {
        await new Promise((resolve) => {
            let getSql, getParams;
            let runCalls = [];
            let existsCalled = 0, unlinkCalled = 0;

            db.get = (sql, params, cb) => {
                getSql = sql;
                getParams = params;
                cb(null, { media_path: null });
            };

            db.run = function(sql, params, cb) {
                runCalls.push({ sql, params });
                if (runCalls.length === 1) {
                    this.changes = 1;
                    cb.call(this, null);
                } else if (runCalls.length === 2) {
                    cb(null);
                }
            };

            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: '47' }, requestId: 'test-req-id' };
            const res = createMockRes((resObj) => {
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
                
                assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
                assert.deepEqual(getParams, [47]);
                
                assert.strictEqual(runCalls.length, 2);
                assert.strictEqual(runCalls[0].sql, "DELETE FROM slides WHERE id = ?");
                assert.deepEqual(runCalls[0].params, [47]);
                assert.strictEqual(typeof runCalls[0].params[0], 'number');
                
                assert.strictEqual(runCalls[1].sql, "UPDATE slides SET display_order = display_order - 1 WHERE display_order > (SELECT display_order FROM (SELECT display_order FROM slides WHERE id = ?))");
                assert.deepEqual(runCalls[1].params, [47]);
                assert.strictEqual(typeof runCalls[1].params[0], 'number');

                assert.strictEqual(existsCalled, 0);
                assert.strictEqual(unlinkCalled, 0);
                resolve();
            });
            deleteHandler(req, res);
        });
    });

    await t.test('6. Mandatory delete-error test', async () => {
        await new Promise((resolve) => {
            let getParams, runSql, runParams;
            let runCallsCount = 0;
            let existsCalled = 0, unlinkCalled = 0;

            db.get = (sql, params, cb) => {
                getParams = params;
                cb(null, { media_path: null });
            };

            db.run = function(sql, params, cb) {
                runCallsCount++;
                runSql = sql;
                runParams = params;
                cb.call(this, new Error('slide delete failed'));
            };

            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: '47' } };
            const res = createMockRes((resObj) => {
                assert.strictEqual(resObj.statusCode, 500);
                assert.deepEqual(resObj.body, { error: 'slide delete failed' });
                assert.deepEqual(getParams, [47]);
                assert.strictEqual(runCallsCount, 1);
                assert.deepEqual(runParams, [47]);
                assert.strictEqual(existsCalled, 0);
                assert.strictEqual(unlinkCalled, 0);
                resolve();
            });
            deleteHandler(req, res);
        });
    });

    await t.test('7. Mandatory valid media-cleanup preservation test', async () => {
        await new Promise((resolve) => {
            let existsCallPath = null;
            let unlinkCallPath = null;
            let getParams;
            let runCallsCount = 0;

            db.get = (sql, params, cb) => {
                getParams = params;
                cb(null, { media_path: 'uploads/example.jpg' });
            };

            db.run = function(sql, params, cb) {
                runCallsCount++;
                if (runCallsCount === 1) {
                    this.changes = 1;
                    cb.call(this, null);
                } else {
                    cb(null);
                }
            };

            fs.existsSync = (p) => {
                existsCallPath = p;
                return true;
            };

            fs.unlinkSync = (p) => {
                unlinkCallPath = p;
            };

            const req = { params: { id: '47' }, requestId: 'test-req-id' };
            const res = createMockRes((resObj) => {
                assert.strictEqual(resObj.statusCode, 200);
                assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
                assert.deepEqual(getParams, [47]);
                
                assert.ok(existsCallPath !== null);
                assert.ok(unlinkCallPath !== null);
                assert.strictEqual(existsCallPath, unlinkCallPath);
                
                // The production code constructs path with path.join(__dirname, mediaPath)
                // where __dirname is in backend/ since the handler runs there.
                // In our test, the route handler executes inside backend/server.js scope.
                const expectedPathFragment = path.join('backend', 'uploads', 'example.jpg');
                const isExpected = existsCallPath.includes(path.normalize('backend/uploads/example.jpg')) || existsCallPath.includes('backend' + path.sep + 'uploads' + path.sep + 'example.jpg');
                // Just making sure it produced a path correctly:
                assert.ok(existsCallPath.endsWith(path.join('uploads', 'example.jpg')));
                
                resolve();
            });
            deleteHandler(req, res);
        });
    });

});
