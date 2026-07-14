const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-media-test-'));
const testDbPath = path.join(tempDir, 'test.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server');
const db = require('../backend/database');

const slidesDir = path.join(__dirname, '..', 'backend', 'uploads', 'slides');

test('Slides Media Path Tests', async (t) => {
    await db.scheduleMigrationPromise;

    function findHandler(method, pathStr) {
        const matchingRoutes = app._router.stack.filter(
            layer => layer.route && layer.route.path === pathStr && layer.route.methods[method]
        );
        assert.strictEqual(matchingRoutes.length, 1, `Exactly one ${method.toUpperCase()} ${pathStr} route must exist`);
        const middlewares = matchingRoutes[0].route.stack;
        return middlewares[middlewares.length - 1].handle;
    }

    const postHandler = findHandler('post', '/api/slides');
    const putHandler = findHandler('put', '/api/slides/:id');
    const getActiveHandler = findHandler('get', '/api/slides/active');
    const getAllHandler = findHandler('get', '/api/slides');
    const getOneHandler = findHandler('get', '/api/slides/:id');
    const deleteHandler = findHandler('delete', '/api/slides/:id');

    let originalDbGet, originalDbRun, originalDbAll;
    let originalExistsSync, originalUnlinkSync;
    
    t.beforeEach(() => {
        originalDbGet = db.get;
        originalDbRun = db.run;
        originalDbAll = db.all;
        originalExistsSync = fs.existsSync;
        originalUnlinkSync = fs.unlinkSync;
    });

    t.afterEach(() => {
        db.get = originalDbGet;
        db.run = originalDbRun;
        db.all = originalDbAll;
        fs.existsSync = originalExistsSync;
        fs.unlinkSync = originalUnlinkSync;
    });

    t.after(async () => {
        await new Promise((res) => db.close(res));
        try { fs.unlinkSync(testDbPath); } catch (e) {}
        try { fs.unlinkSync(testDbPath + '-journal'); } catch (e) {}
        try { fs.unlinkSync(testDbPath + '-wal'); } catch (e) {}
        try { fs.unlinkSync(testDbPath + '-shm'); } catch (e) {}
        try { fs.rmdirSync(tempDir); } catch (e) {}
        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) { delete process.env.CLASSROOM_DB_PATH; } 
        else { process.env.CLASSROOM_DB_PATH = originalDbPath; }
    });

    function createMockRes(done) {
        const res = {
            statusCode: 200,
            responseCount: 0,
            body: null,
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) {
                this.responseCount++;
                this.body = data;
                if (done) done();
                return this;
            }
        };
        return res;
    }

    await t.test('B. Create storage tests', async (subT) => {
        const validTestCases = [
            { desc: 'Linux-style absolute', path: '/absolute/backend/uploads/slides/171234-example.png', filename: '171234-example.png' },
            { desc: 'Windows-style absolute', path: 'C:\\Classroom\\backend\\uploads\\slides\\171234-example.png', filename: '171234-example.png' }
        ];

        for (const tc of validTestCases) {
            await subT.test(`Valid req.file: ${tc.desc}`, (subsubT, done) => {
                const req = {
                    body: { content_type: 'image' },
                    file: { path: tc.path, filename: tc.filename, mimetype: 'image/png', originalname: 'example.png' }
                };
                const res = createMockRes(() => {
                    assert.strictEqual(res.statusCode, 200);
                    assert.strictEqual(res.responseCount, 1);
                    done();
                });

                let insertParams = null;
                db.get = (sql, params, cb) => cb(null, { display_order: 1 });
                db.run = (sql, params, cb) => {
                    const callback = typeof params === 'function' ? params : cb;
                    if (sql.startsWith('INSERT')) {
                        insertParams = typeof params === 'function' ? [] : params;
                        callback.call({ lastID: 1 }, null);
                    }
                };
                fs.unlinkSync = () => { assert.fail('No success-path unlink should occur'); };

                postHandler(req, res);

                const storedMedia = insertParams[3];
                assert.strictEqual(storedMedia, '/uploads/slides/171234-example.png');
                for (const p of insertParams) {
                    if (typeof p === 'string') assert.ok(!p.includes(tc.path), 'Absolute path must be absent');
                }
            });
        }

        await subT.test('Unsafe filename', (subsubT, done) => {
            const req = {
                body: { content_type: 'image' },
                file: { path: '/tmp/test.png', filename: '../test.png', mimetype: 'image/png', originalname: 'test.png' },
                requestId: 'req1'
            };
            const res = createMockRes(() => {
                assert.strictEqual(res.statusCode, 400);
                assert.deepEqual(res.body, { error: 'Geçersiz dosya adı' });
                assert.strictEqual(res.responseCount, 1);
                done();
            });

            db.get = () => assert.fail('No db lookup');
            db.run = () => assert.fail('No db write');

            let unlinkedPath = null;
            fs.unlinkSync = (p) => { unlinkedPath = p; };

            postHandler(req, res);
            assert.strictEqual(unlinkedPath, '/tmp/test.png');
        });
    });

    await t.test('C. Update storage and old-file cleanup tests', async (subT) => {
        const replacementCases = [
            { oldMedia: '/uploads/slides/old.png' },
            { oldMedia: 'uploads/slides/old.png' },
            { oldMedia: '/home/user/Classroom/backend/uploads/slides/old.png' },
            { oldMedia: 'C:\\Classroom\\backend\\uploads\\slides\\old.png' }
        ];

        for (let i = 0; i < replacementCases.length; i++) {
            const tc = replacementCases[i];
            await subT.test(`Replacement upload with old media: ${tc.oldMedia}`, (subsubT, done) => {
                const req = {
                    params: { id: '1' },
                    body: { title: 'Updated' },
                    file: { path: '/tmp/new.png', filename: 'new.png', mimetype: 'image/png', originalname: 'new.png' }
                };
                const res = createMockRes(() => {
                    assert.strictEqual(res.statusCode, 200);
                    assert.strictEqual(res.responseCount, 1);
                    assert.strictEqual(unlinkedPath, path.resolve(slidesDir, 'old.png'));
                    done();
                });

                let updateParams = null;
                let unlinkedPath = null;

                db.get = (sql, params, cb) => cb(null, { id: 1, media_path: tc.oldMedia });
                db.run = (sql, params, cb) => {
                    const callback = typeof params === 'function' ? params : cb;
                    if (sql.startsWith('UPDATE')) {
                        updateParams = typeof params === 'function' ? [] : params;
                        assert.strictEqual(unlinkedPath, null, 'Old media cleanup occurs only after database update callback succeeds');
                        callback.call({ changes: 1 }, null);
                    }
                };
                fs.existsSync = () => true;
                fs.unlinkSync = (p) => { unlinkedPath = p; };

                putHandler(req, res);
                const newMedia = updateParams[1];
                assert.strictEqual(newMedia, '/uploads/slides/new.png');
            });
        }

        await subT.test('Update failure removes newly uploaded file through req.file.path', (subsubT, done) => {
            const req = {
                params: { id: '1' },
                body: { title: 'Updated' },
                file: { path: '/tmp/new.png', filename: 'new.png', mimetype: 'image/png', originalname: 'new.png' }
            };
            const res = createMockRes(() => {
                assert.strictEqual(res.statusCode, 500);
                assert.strictEqual(res.responseCount, 1);
                assert.strictEqual(unlinkedPath, '/tmp/new.png');
                done();
            });

            let unlinkedPath = null;
            db.get = (sql, params, cb) => cb(null, { id: 1, media_path: '/uploads/slides/old.png' });
            db.run = (sql, params, cb) => {
                const callback = typeof params === 'function' ? params : cb;
                callback(new Error('Update error'));
            };
            fs.unlinkSync = (p) => { unlinkedPath = p; };

            putHandler(req, res);
        });
    });

    await t.test('D. GET output matrix', async (subT) => {
        const matrix = [
            { input: '/uploads/slides/test.png', expected: '/uploads/slides/test.png' },
            { input: 'uploads/slides/test.png', expected: '/uploads/slides/test.png' },
            { input: '/home/user/Classroom/backend/uploads/slides/test.png', expected: '/uploads/slides/test.png' },
            { input: 'C:\\Classroom\\backend\\uploads\\slides\\test.png', expected: '/uploads/slides/test.png' },
            { input: 'C:/Classroom/backend/uploads/slides/test.png', expected: '/uploads/slides/test.png' },
            { input: null, expected: null },
            { input: 'https://example.com/photo.png', expected: 'https://example.com/photo.png' },
            { input: 'data:image/png;base64,xxx', expected: 'data:image/png;base64,xxx' },
        ];

        for (const route of ['active', 'all', 'single']) {
            await subT.test(`GET ${route}`, (subsubT, done) => {
                const req = { params: { id: '1' } };
                const res = createMockRes(() => {
                    const data = route === 'single' ? res.body : res.body[0];
                    for (let i = 0; i < matrix.length; i++) {
                        const tc = matrix[i];
                        const resData = route === 'single' ? res.body : res.body[i];
                        assert.strictEqual(resData.media_path, tc.expected);
                    }
                    done();
                });

                if (route === 'single') {
                    let currentTcIndex = 0;
                    function runNext() {
                        if (currentTcIndex >= matrix.length) return done();
                        const tc = matrix[currentTcIndex];
                        const singleRes = createMockRes(() => {
                            assert.strictEqual(singleRes.body.media_path, tc.expected);
                            currentTcIndex++;
                            runNext();
                        });
                        db.get = (sql, params, cb) => cb(null, { id: 1, media_path: tc.input });
                        getOneHandler(req, singleRes);
                    }
                    runNext();
                    return;
                } else {
                    const rows = matrix.map(tc => ({ id: 1, media_path: tc.input }));
                    db.all = (sql, params, cb) => cb(null, rows);
                    if (route === 'active') getActiveHandler(req, res);
                    else getAllHandler(req, res);
                }
            });
        }
    });

    await t.test('E. Delete cleanup matrix', async (subT) => {
        const cleanupCases = [
            { media: '/uploads/slides/test.png', deleted: true, expectedPath: path.resolve(slidesDir, 'test.png') },
            { media: '/home/Classroom/backend/uploads/slides/test.png', deleted: true, expectedPath: path.resolve(slidesDir, 'test.png') },
            { media: 'C:\\Classroom\\backend\\uploads\\slides\\test.png', deleted: true, expectedPath: path.resolve(slidesDir, 'test.png') },
            { media: 'https://example.com/photo.png', deleted: false },
            { media: 'data:image/png;base64,xxx', deleted: false },
            { media: '/uploads/other/photo.png', deleted: false },
            { media: '/uploads/slides/../secret.png', deleted: false },
            { media: 'C:\\outside\\secret.png', deleted: false }
        ];

        for (const tc of cleanupCases) {
            await subT.test(`Delete with media: ${tc.media}`, (subsubT, done) => {
                const req = { params: { id: '1' } };
                const res = createMockRes(() => {
                    assert.strictEqual(res.statusCode, 200);
                    assert.strictEqual(res.responseCount, 1);
                    if (tc.deleted) {
                        assert.strictEqual(unlinkedPath, tc.expectedPath);
                    } else {
                        assert.strictEqual(unlinkedPath, null);
                        assert.strictEqual(existsCheckedPath, null);
                    }
                    done();
                });

                let unlinkedPath = null;
                let existsCheckedPath = null;

                let commitRun = false;
                db.get = (sql, params, cb) => cb(null, { id: 1, media_path: tc.media });
                db.run = (sql, params, cb) => {
                    const callback = typeof params === 'function' ? params : cb;
                    if (sql === 'COMMIT') {
                        commitRun = true;
                        callback.call({ changes: 0 }, null);
                    } else {
                        callback.call({ changes: 1 }, null);
                    }
                };

                fs.existsSync = (p) => { existsCheckedPath = p; return true; };
                fs.unlinkSync = (p) => {
                    assert.ok(commitRun, 'Cleanup occurs after COMMIT');
                    unlinkedPath = p;
                };

                deleteHandler(req, res);
            });
        }
    });
});
