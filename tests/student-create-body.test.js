const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-student-create-body-test-')
);
const testDbPath = path.join(tempDir, 'test.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

test('Student Create Body Structural Tests', async (t) => {
    await db.scheduleMigrationPromise;

    const matchingRoutes = app._router.stack.filter(
        layer =>
            layer.route &&
            layer.route.path === '/api/students' &&
            layer.route.methods.post
    );

    assert.strictEqual(
        matchingRoutes.length,
        1,
        'Exactly one matching POST /api/students route must exist'
    );

    const routeLayer = matchingRoutes[0];
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun;
    let originalDbGet;
    let originalDbAll;
    let originalDbPrepare;
    
    // filesystem mocks
    let originalUnlinkSync;
    let originalExistsSync;
    let unlinkedFiles = [];

    t.beforeEach(() => {
        originalDbRun = db.run;
        originalDbGet = db.get;
        originalDbAll = db.all;
        originalDbPrepare = db.prepare;

        originalUnlinkSync = fs.unlinkSync;
        originalExistsSync = fs.existsSync;
        unlinkedFiles = [];
        fs.existsSync = (filePath) => {
            // allow test file paths to exist so unlinkSync is called
            if (filePath.includes('/controlled/')) return true;
            return originalExistsSync(filePath);
        };
        fs.unlinkSync = (filePath) => {
            if (filePath.includes('/controlled/')) {
                unlinkedFiles.push(filePath);
                return;
            }
            return originalUnlinkSync(filePath);
        };
    });

    t.afterEach(() => {
        db.run = originalDbRun;
        db.get = originalDbGet;
        db.all = originalDbAll;
        db.prepare = originalDbPrepare;

        fs.unlinkSync = originalUnlinkSync;
        fs.existsSync = originalExistsSync;
    });

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

    t.after(async () => {
        try {
            await closeDatabase(db);
        } finally {
            try {
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
        }
    });

    function createMockRes() {
        const res = {
            statusCode: 200,
            responseCount: 0,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                this.responseCount++;
                if (this.responseCount > 1) {
                    throw new Error('Multiple responses sent');
                }
                this.body = data;
                return this;
            }
        };
        return res;
    }

    const primitiveBodies = [undefined, null, [], 'student', 42, true, false];

    for (const testedBody of primitiveBodies) {
        const testName = Array.isArray(testedBody) ? '[]' : String(testedBody);
        await t.test(`8. primitive body ${testName} is rejected with 400 and no db run`, () => {
            let dbRunCalled = false;
            db.run = () => { dbRunCalled = true; };

            const req = { body: testedBody };
            const res = createMockRes();

            assert.doesNotThrow(() => {
                handler(req, res);
            });

            assert.strictEqual(res.statusCode, 400);
            assert.deepStrictEqual(res.body, { error: 'Öğrenci adı gereklidir' });
            assert.strictEqual(res.responseCount, 1);
            assert.strictEqual(dbRunCalled, false);
            assert.strictEqual(unlinkedFiles.length, 0);
        });
    }

    for (const testedBody of [undefined, null]) {
        await t.test(`9. cleanup file when body is ${String(testedBody)}`, () => {
            let dbRunCalled = false;
            db.run = () => { dbRunCalled = true; };

            const req = {
                body: testedBody,
                file: {
                    path: '/controlled/test-upload.jpg',
                    filename: 'test-upload.jpg',
                    mimetype: 'image/jpeg',
                    size: 1000
                }
            };
            const res = createMockRes();

            assert.doesNotThrow(() => {
                handler(req, res);
            });

            assert.strictEqual(res.statusCode, 400);
            assert.deepStrictEqual(res.body, { error: 'Öğrenci adı gereklidir' });
            assert.strictEqual(res.responseCount, 1);
            assert.strictEqual(dbRunCalled, false);
            
            assert.strictEqual(unlinkedFiles.length, 1);
            assert.strictEqual(unlinkedFiles[0], '/controlled/test-upload.jpg');
        });
    }

    await t.test(`10. Empty object {} continues to field validation`, () => {
        let dbRunCalled = false;
        db.run = () => { dbRunCalled = true; };

        const req = { body: {} };
        const res = createMockRes();

        assert.doesNotThrow(() => {
            handler(req, res);
        });

        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'Öğrenci adı gereklidir' });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(dbRunCalled, false);
        assert.strictEqual(unlinkedFiles.length, 0);
    });

    await t.test(`11. Structurally valid body with missing name causes file cleanup`, () => {
        let dbRunCalled = false;
        db.run = () => { dbRunCalled = true; };

        const req = {
            body: {
                name: '',
                gender: 'M'
            },
            file: {
                path: '/controlled/validation-failure.jpg',
                filename: 'validation-failure.jpg',
                mimetype: 'image/jpeg',
                size: 1000
            }
        };
        const res = createMockRes();

        assert.doesNotThrow(() => {
            handler(req, res);
        });

        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'Öğrenci adı gereklidir' });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(dbRunCalled, false);
        
        assert.strictEqual(unlinkedFiles.length, 1);
        assert.strictEqual(unlinkedFiles[0], '/controlled/validation-failure.jpg');
    });

    await t.test(`12. Successful student creation`, () => {
        let runSql, runParams;
        let dbRunCallCount = 0;
        
        db.run = function(sql, params, callback) {
            dbRunCallCount++;
            runSql = sql;
            runParams = params;
            // Mock this.lastID
            const context = { lastID: 100 };
            callback.call(context, null);
        };

        const req = {
            body: {
                name: '  Ayşe Yılmaz  ',
                gender: 'F'
            }
        };
        const res = createMockRes();

        assert.doesNotThrow(() => {
            handler(req, res);
        });

        assert.strictEqual(runSql, 'INSERT INTO students (name, photo, gender) VALUES (?, ?, ?)');
        assert.deepStrictEqual(runParams, ['Ayşe Yılmaz', null, 'F']);
        
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, {
            id: 100,
            name: 'Ayşe Yılmaz',
            photo: null,
            gender: 'F'
        });
        assert.strictEqual(res.responseCount, 1);
        assert.strictEqual(dbRunCallCount, 1);
        assert.strictEqual(unlinkedFiles.length, 0);
    });
});
