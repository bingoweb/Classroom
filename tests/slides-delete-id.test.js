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

    function invokeHandler(req, handlerToUse = deleteHandler) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;

            const fail = (err) => {
                if (settled) return;
                settled = true;
                reject(err);
            };

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
            };

            try {
                handlerToUse(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('0. Helper self-regression double response', async () => {
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

    await t.test('1. Mandatory malformed-string tests', async () => {
        const invalidStrings = [
            'abc', '47abc', 'abc47', '47.5', '47e2', '+47', '-47', '0', '00', '047',
            '47 ', ' 47', '', '   ', '9007199254740992'
        ];

        for (const val of invalidStrings) {
            let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
            db.get = () => { getCalled++; };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: val } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('2. Mandatory invalid-type tests', async () => {
        const invalidTypes = [
            undefined, null, 1, 47, true, false, {}, [], new Number(47)
        ];

        for (const val of invalidTypes) {
            let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
            db.get = () => { getCalled++; };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: val } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('3. Mandatory canonical-ID tests', async () => {
        const canonicals = [
            { raw: '1', numeric: 1 },
            { raw: '47', numeric: 47 },
            { raw: '9007199254740991', numeric: 9007199254740991 }
        ];

        for (const item of canonicals) {
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
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 404);
            assert.deepEqual(resObj.body, { error: 'Slayt bulunamadı' });
            assert.strictEqual(getSql, "SELECT media_path, display_order FROM slides WHERE id = ?");
            assert.deepEqual(getParams, [item.numeric]);
            assert.strictEqual(typeof getParams[0], 'number');
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('4. Mandatory lookup-error test', async () => {
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
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'slide lookup failed' });
        assert.strictEqual(getSql, "SELECT media_path, display_order FROM slides WHERE id = ?");
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(runCalled, 0);
        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
    });

    await t.test('5. Mandatory successful-deletion mock regression', async () => {
        let getSql, getParams;
        let runCalls = [];
        let existsCalled = 0, unlinkCalled = 0;
        let responseTime = 0;
        let compactionTime = 0;

        db.get = (sql, params, cb) => {
            getSql = sql;
            getParams = params;
            cb(null, { media_path: null, display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            runCalls.push({ sql, params });
            if (runCalls.length === 1) {
                this.changes = 1;
                cb.call(this, null);
            } else if (runCalls.length === 2) {
                setTimeout(() => {
                    compactionTime = Date.now();
                    this.changes = 5; // Should be ignored in response
                    cb.call(this, null);
                }, 10);
            }
        };

        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' }, requestId: 'test-req-id' };

        const startTime = Date.now();
        const resObj = await invokeHandler(req);
        responseTime = Date.now();

        assert.ok(responseTime >= compactionTime, 'Response should not be sent before compaction completes');

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });

        assert.strictEqual(getSql, "SELECT media_path, display_order FROM slides WHERE id = ?");
        assert.deepEqual(getParams, [47]);

        assert.strictEqual(runCalls.length, 2);
        assert.strictEqual(runCalls[0].sql, "DELETE FROM slides WHERE id = ?");
        assert.deepEqual(runCalls[0].params, [47]);
        assert.strictEqual(typeof runCalls[0].params[0], 'number');

        assert.strictEqual(runCalls[1].sql, "UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?");
        assert.deepEqual(runCalls[1].params, [2]);
        assert.strictEqual(typeof runCalls[1].params[0], 'number');

        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
    });

    await t.test('6. Mandatory delete-error test', async () => {
        let getParams, runSql, runParams;
        let runCallsCount = 0;
        let existsCalled = 0, unlinkCalled = 0;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, { media_path: null, display_order: 2 });
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
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'slide delete failed' });
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(runCallsCount, 1);
        assert.deepEqual(runParams, [47]);
        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
    });

    await t.test('7. Mandatory valid media-cleanup preservation test', async () => {
        let existsCallPath = null;
        let unlinkCallPath = null;
        let getParams;
        let runCallsCount = 0;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, { media_path: 'uploads/example.jpg', display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            runCallsCount++;
            if (runCallsCount === 1) {
                this.changes = 1;
                cb.call(this, null);
            } else {
                cb.call(this, null);
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
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.deepEqual(getParams, [47]);

        assert.ok(existsCallPath !== null);
        assert.ok(unlinkCallPath !== null);
        assert.strictEqual(existsCallPath, unlinkCallPath);

        const expectedPathFragment = path.join('backend', 'uploads', 'example.jpg');
        assert.ok(existsCallPath.endsWith(path.join('uploads', 'example.jpg')));
    });

    await t.test('8. Compaction-error mock regression', async () => {
        let runCallsCount = 0;

        db.get = (sql, params, cb) => {
            cb(null, { media_path: null, display_order: 2 });
        };

        db.run = function(sql, params, cb) {
            runCallsCount++;
            if (runCallsCount === 1) {
                this.changes = 1;
                cb.call(this, null);
            } else {
                cb.call(this, new Error('compaction failed'));
            }
        };

        const req = { params: { id: '47' }, requestId: 'test-req-id' };
        const resObj = await invokeHandler(req);

        // It should log the error but still send 200 since deletion succeeded
        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });
        assert.strictEqual(runCallsCount, 2);
    });

    await t.test('9. Mandatory real-database compaction regression', async () => {
        // 1. Clear the slides table.
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM slides", (err) => err ? reject(err) : resolve());
        });

        // 2. Insert three valid slide records
        // 3. Orders: 1, 2, 3
        const insertSlide = (order, title) => new Promise((resolve, reject) => {
            db.run("INSERT INTO slides (title, display_order, content_type, media_type, media_path) VALUES (?, ?, 'text', 'none', '')", [title, order], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        const id1 = await insertSlide(1, 'First');
        const id2 = await insertSlide(2, 'Second');
        const id3 = await insertSlide(3, 'Third');

        // 5. Invoke the real production DELETE handler with the ID of the middle slide
        const req = { params: { id: id2.toString() } };
        const resObj = await invokeHandler(req);

        // 6. Await the handler's response.
        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla silindi', changes: 1 });

        // 7. Query the real slides table afterward.
        const remainingSlides = await new Promise((resolve, reject) => {
            db.all("SELECT id, display_order FROM slides ORDER BY display_order ASC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // 8. Prove that:
        // - the deleted middle slide no longer exists
        assert.ok(!remainingSlides.find(s => s.id === id2), 'Middle slide should not exist');

        // - exactly two slides remain
        assert.strictEqual(remainingSlides.length, 2, 'Exactly two slides remain');

        // - the first slide still has display_order = 1
        assert.strictEqual(remainingSlides[0].id, id1);
        assert.strictEqual(remainingSlides[0].display_order, 1);

        // - the third slide still has its original ID
        // - the third slide now has display_order = 2
        assert.strictEqual(remainingSlides[1].id, id3);
        assert.strictEqual(remainingSlides[1].display_order, 2);

        // - no remaining slide has display_order = 3
        assert.ok(!remainingSlides.find(s => s.display_order === 3), 'No slide should have display_order 3');
    });

});
