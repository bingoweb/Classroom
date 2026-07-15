const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-update-id-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger } = require('../backend/logger.js');

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

test('Slides Update Route ID Validation', async (t) => {
    let updateHandler;
    let originalDbGet, originalDbRun, originalFsExistsSync, originalFsUnlinkSync;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.put && r.route.path === '/api/slides/:id');
        assert.strictEqual(routes.length, 1, 'Exactly one matching PUT route must exist');
        updateHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;
    });

    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalFsExistsSync = fs.existsSync;
        originalFsUnlinkSync = fs.unlinkSync;
        originalLoggerError = Logger.prototype.error;
    });

    t.afterEach(() => {
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
        if (originalFsExistsSync) fs.existsSync = originalFsExistsSync;
        if (originalFsUnlinkSync) fs.unlinkSync = originalFsUnlinkSync;
        if (originalLoggerError) Logger.prototype.error = originalLoggerError;
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

    function invokeHandler(req) {
        return new Promise((resolve, reject) => {
            let responseCount = 0;
            let responseSnapshot = null;
            let settled = false;
            let completionScheduled = false;

            const fail = (err) => {
                if (settled) {
                    return;
                }
                settled = true;
                reject(err);
            };

            const scheduleCompletion = () => {
                if (completionScheduled) {
                    return;
                }
                completionScheduled = true;
                setImmediate(() => {
                    if (settled) {
                        return;
                    }
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
                if (err) {
                    fail(err);
                }
            };

            try {
                updateHandler(req, res, next);
            } catch (err) {
                fail(err);
            }
        });
    }

    await t.test('Helper regression: reject multiple responses', async () => {
        const originalUpdateHandler = updateHandler;
        updateHandler = (req, res, next) => {
            res.status(200).json({ first: true });
            res.status(200).json({ second: true });
        };

        try {
            await invokeHandler({});
            assert.fail('Should have rejected due to multiple responses');
        } catch (err) {
            assert.strictEqual(err.message, 'Response sent more than once');
        } finally {
            updateHandler = originalUpdateHandler;
        }
    });

    await t.test('1. Mandatory malformed-string tests without a file', async () => {
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

            const req = { params: { id: val }, body: {}, file: undefined };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(resObj.count, 1);
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('2. Mandatory invalid-type tests without a file', async () => {
        const invalidTypes = [
            undefined, null, 1, 47, true, false, {}, [], new Number(47)
        ];

        for (const val of invalidTypes) {
            let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
            db.get = () => { getCalled++; };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: val }, body: {}, file: undefined };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(resObj.count, 1);
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('3. Mandatory invalid-ID uploaded-file cleanup test', async () => {
        const invalidStrings = [
            '47abc', '047', '9007199254740992'
        ];

        for (const val of invalidStrings) {
            let getCalled = 0, runCalled = 0, existsCalled = 0, unlinkCalled = 0;
            let unlinkPath = null;
            db.get = () => { getCalled++; };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = (p) => { unlinkCalled++; unlinkPath = p; };

            const req = { params: { id: val }, body: {}, file: { path: `/tmp/rejected-slide-upload-${val}.bin` } };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 400);
            assert.deepEqual(resObj.body, { error: 'Geçersiz slayt ID' });
            assert.strictEqual(resObj.count, 1);
            assert.strictEqual(getCalled, 0);
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 1);
            assert.strictEqual(unlinkPath, req.file.path);
        }
    });

    await t.test('4. Mandatory canonical-ID lookup tests', async () => {
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
                cb(null, undefined);
            };
            db.run = () => { runCalled++; };
            fs.existsSync = () => { existsCalled++; };
            fs.unlinkSync = () => { unlinkCalled++; };

            const req = { params: { id: item.raw }, body: { title: 'Yeni başlık' }, file: undefined };
            const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 404);
            assert.deepEqual(resObj.body, { error: 'Slayt bulunamadı' });
            assert.strictEqual(resObj.count, 1);
            assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
            assert.deepEqual(getParams, [item.numeric]);
            assert.strictEqual(typeof getParams[0], 'number');
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 0);
        }
    });

    await t.test('5. Mandatory missing-slide uploaded-file cleanup test', async () => {
        let getParams;
        let runCalled = 0, existsCalled = 0, unlinkCalled = 0;
        let unlinkPath = null;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, undefined);
        };
        db.run = () => { runCalled++; };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = (p) => { unlinkCalled++; unlinkPath = p; };

        const req = { params: { id: '47' }, body: { title: 'Yeni başlık' }, file: { path: '/tmp/missing-slide-upload.jpg' } };
        const resObj = await invokeHandler(req);

            assert.strictEqual(resObj.statusCode, 404);
            assert.deepEqual(resObj.body, { error: 'Slayt bulunamadı' });
            assert.strictEqual(resObj.count, 1);
            assert.deepEqual(getParams, [47]);
            assert.strictEqual(typeof getParams[0], 'number');
            assert.strictEqual(runCalled, 0);
            assert.strictEqual(existsCalled, 0);
            assert.strictEqual(unlinkCalled, 1);
            assert.strictEqual(unlinkPath, '/tmp/missing-slide-upload.jpg');
    });

    await t.test('6. Mandatory lookup-error test without file', async () => {
        let getSql, getParams;
        let runCalled = 0, existsCalled = 0, unlinkCalled = 0;
        let loggedComponent, loggedMessage, loggedError, loggedContext;
        let loggerCalled = 0;

        const originalError = new Error('SLIDE_LOOKUP_SECRET_DO_NOT_EXPOSE');

        db.get = (sql, params, cb) => {
            getSql = sql;
            getParams = params;
            cb(originalError);
        };
        db.run = () => { runCalled++; };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = () => { unlinkCalled++; };

        Logger.prototype.error = function(component, message, err, context) {
            loggerCalled++;
            loggedComponent = component;
            loggedMessage = message;
            loggedError = err;
            loggedContext = context;
        };

        const req = { params: { id: '47' }, body: {}, file: undefined, requestId: 'test-req-id-123' };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Slayt güncellenirken hata oluştu' });
        assert.strictEqual(resObj.count, 1);
        
        assert.ok(!JSON.stringify(resObj.body).includes('SLIDE_LOOKUP_SECRET_DO_NOT_EXPOSE'));

        assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(typeof getParams[0], 'number');
        assert.strictEqual(runCalled, 0);
        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
        
        assert.strictEqual(loggerCalled, 1);
        assert.strictEqual(loggedComponent, 'API');
        assert.strictEqual(loggedError, originalError);
        assert.strictEqual(loggedContext.endpoint, '/api/slides/:id');
        assert.strictEqual(loggedContext.requestId, 'test-req-id-123');
        assert.strictEqual(loggedContext.slideId, 47);
        assert.strictEqual(loggedContext.query, "SELECT media_path FROM slides WHERE id = ?");
        assert.strictEqual(loggedContext.params, getParams);
    });

    await t.test('6b. Mandatory lookup-error test with file', async () => {
        let getSql, getParams;
        let runCalled = 0, existsCalled = 0, unlinkCalled = 0;
        let unlinkPath = null;
        let loggedError = null;
        let loggerCalled = 0;
        let responseReceivedAfterCleanup = false;

        const originalError = new Error('SLIDE_LOOKUP_SECRET_DO_NOT_EXPOSE_FILE');

        db.get = (sql, params, cb) => {
            getSql = sql;
            getParams = params;
            cb(originalError);
        };
        db.run = () => { runCalled++; };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = (p) => {
            unlinkCalled++;
            unlinkPath = p;
        };

        Logger.prototype.error = function(component, message, err, context) {
            loggerCalled++;
            loggedError = err;
        };

        const req = { params: { id: '47' }, body: {}, file: { path: '/tmp/test-file.jpg' }, requestId: 'test-req-id-456' };
        
        const invokePromise = invokeHandler(req).then(res => {
            responseReceivedAfterCleanup = unlinkCalled > 0;
            return res;
        });
        
        const resObj = await invokePromise;

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Slayt güncellenirken hata oluştu' });
        assert.strictEqual(resObj.count, 1);
        
        assert.ok(!JSON.stringify(resObj.body).includes('SLIDE_LOOKUP_SECRET_DO_NOT_EXPOSE_FILE'));

        assert.strictEqual(runCalled, 0);
        assert.strictEqual(unlinkCalled, 1);
        assert.strictEqual(unlinkPath, '/tmp/test-file.jpg');
        assert.strictEqual(responseReceivedAfterCleanup, true);
        
        assert.strictEqual(loggerCalled, 1);
        assert.strictEqual(loggedError, originalError);
    });

    await t.test('7. Mandatory no-update-fields preservation test', async () => {
        let getParams;
        let runCalled = 0, existsCalled = 0, unlinkCalled = 0;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, { media_path: 'uploads/existing.jpg' });
        };
        db.run = () => { runCalled++; };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' }, body: {}, file: undefined };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 400);
        assert.deepEqual(resObj.body, { error: 'Güncellenecek alan belirtilmedi' });
        assert.strictEqual(resObj.count, 1);
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(typeof getParams[0], 'number');
        assert.strictEqual(runCalled, 0);
        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
    });

    await t.test('8. Mandatory successful text update test', async () => {
        let getSql, getParams;
        let runSql, runParams;
        let existsCalled = 0, unlinkCalled = 0;
        let order = [];

        db.get = (sql, params, cb) => {
            order.push('lookup');
            getSql = sql;
            getParams = params;
            cb(null, { media_path: 'uploads/old.jpg' });
        };
        db.run = function(sql, params, cb) {
            order.push('update');
            runSql = sql;
            runParams = params;
            this.changes = 1;
            cb.call(this, null);
        };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = () => { unlinkCalled++; };

        const req = { params: { id: '47' }, body: { title: 'Yeni başlık' }, file: undefined, requestId: 'test-req-id' };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla güncellendi', changes: 1 });
        assert.strictEqual(resObj.count, 1);

        assert.deepEqual(order, ['lookup', 'update']);

        assert.strictEqual(getSql, "SELECT media_path FROM slides WHERE id = ?");
        assert.deepEqual(getParams, [47]);
        
        assert.strictEqual(runSql, "UPDATE slides SET title = ? WHERE id = ?");
        assert.deepEqual(runParams, ['Yeni başlık', 47]);
        assert.strictEqual(typeof runParams[1], 'number');

        assert.strictEqual(existsCalled, 0);
        assert.strictEqual(unlinkCalled, 0);
    });

    await t.test('9. Mandatory update-error uploaded-file cleanup test', async () => {
        let getParams, runParams;
        let existsCalled = 0, unlinkCalled = 0;
        let unlinkPath = null;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, { media_path: 'uploads/old.jpg' });
        };
        db.run = function(sql, params, cb) {
            runParams = params;
            cb.call(this, new Error('Update failed'));
        };
        fs.existsSync = () => { existsCalled++; };
        fs.unlinkSync = (p) => { unlinkCalled++; unlinkPath = p; };

        const req = { params: { id: '47' }, body: { title: 'Yeni başlık' }, file: { path: '/tmp/failed-slide-update.jpg', filename: 'failed-slide.jpg' }, requestId: 'test-req-id' };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'Slayt güncellenirken hata oluştu' });
        assert.strictEqual(resObj.count, 1);

        assert.deepEqual(getParams, [47]);
        assert.strictEqual(runParams[runParams.length - 1], 47);
        assert.strictEqual(typeof runParams[runParams.length - 1], 'number');

        assert.strictEqual(existsCalled, 0); // Old media cleanup not attempted
        assert.strictEqual(unlinkCalled, 1);
        assert.strictEqual(unlinkPath, '/tmp/failed-slide-update.jpg');
    });

    await t.test('10. Mandatory valid media-replacement preservation test', async () => {
        let getParams, runSql, runParams;
        let existsCalled = 0, unlinkCalled = 0;
        let unlinkPath = null;
        let existsPath = null;

        db.get = (sql, params, cb) => {
            getParams = params;
            cb(null, { media_path: 'uploads/slides/old-slide-media.jpg' });
        };
        db.run = function(sql, params, cb) {
            runSql = sql;
            runParams = params;
            this.changes = 1;
            cb.call(this, null);
        };
        fs.existsSync = (p) => { existsCalled++; existsPath = p; return true; };
        fs.unlinkSync = (p) => { unlinkCalled++; unlinkPath = p; };

        const req = { params: { id: '47' }, body: { title: 'Yeni başlık' }, file: { path: '/tmp/new-slide-media.jpg', filename: 'new-slide.jpg' }, requestId: 'test-req-id' };
        const resObj = await invokeHandler(req);

        assert.strictEqual(resObj.statusCode, 200);
        assert.deepEqual(resObj.body, { message: 'Slayt başarıyla güncellendi', changes: 1 });
        assert.strictEqual(resObj.count, 1);

        assert.deepEqual(getParams, [47]);
        assert.strictEqual(runParams[runParams.length - 1], 47);
        assert.ok(runSql.includes('media_path = ?'));

        // req.file.filename gets normalized to the canonical media URL
        const canonicalNewPath = '/uploads/slides/new-slide.jpg';
        assert.ok(runParams.includes(canonicalNewPath));

        assert.strictEqual(existsCalled, 1);
        assert.strictEqual(unlinkCalled, 1);

        const expectedOldPath = path.join(
            path.dirname(require.resolve('../backend/server.js')),
            'uploads/slides/old-slide-media.jpg'
        );
        assert.strictEqual(existsCalled, 1);
        assert.strictEqual(unlinkCalled, 1);
        assert.strictEqual(existsPath, expectedOldPath);
        assert.strictEqual(unlinkPath, expectedOldPath);
        assert.notStrictEqual(unlinkPath, req.file.path);
    });

    await t.test('11. Source guard against err.message in lookup error path', () => {
        const sourcePath = path.join(__dirname, '../backend/server.js');
        const sourceCode = fs.readFileSync(sourcePath, 'utf8');

        const startIndex = sourceCode.indexOf('// Update slide');
        const endIndex = sourceCode.indexOf('// Delete slide', startIndex);
        
        assert.ok(startIndex !== -1, 'Could not find start marker');
        assert.ok(endIndex !== -1, 'Could not find end marker');

        const routeSource = sourceCode.substring(startIndex, endIndex);

        assert.ok(!routeSource.includes('err.message'), 'err.message must not be used in the slide update route');
    });

});
