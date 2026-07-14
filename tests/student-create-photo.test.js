const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-student-photo-test-')
);
const testDbPath = path.join(
    tempDir,
    `test-${crypto.randomBytes(4).toString('hex')}.db`
);

process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

test('Student Create Photo Web Path Tests', async (t) => {
    const stack = app._router.stack;
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/students' && layer.route.methods.post);
    if (!routeLayer) {
        throw new Error("POST /api/students route not found");
    }
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbRun;
    let deletedFiles = [];
    let fileCleanupSpy;
    let existsSyncSpy;

    t.beforeEach(() => {
        deletedFiles = [];
        originalDbRun = db.run;
        
        const fs = require('node:fs');
        existsSyncSpy = t.mock.method(fs, 'existsSync', () => true);
        fileCleanupSpy = t.mock.method(fs, 'unlinkSync', (filePath) => {
            deletedFiles.push(filePath);
        });
    });

    t.afterEach(() => {
        db.run = originalDbRun;
        existsSyncSpy.mock.restore();
        fileCleanupSpy.mock.restore();
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

    await t.test('1. A generated filename becomes /uploads/<filename>', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: '1720000000000-example.jpg', path: 'backend/uploads/1720000000000-example.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(dbStoredPhoto, '/uploads/1720000000000-example.jpg', 'Database stored value');
            assert.equal(data.photo, '/uploads/1720000000000-example.jpg', 'API response value');
            done();
        });

        handler(req, res);
    });

    await t.test('2. The value contains no backend/uploads', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: 'somefile.jpg', path: '/absolute/path/to/backend/uploads/somefile.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.ok(!dbStoredPhoto.includes('backend/uploads'), 'DB value has backend/uploads');
            assert.ok(!data.photo.includes('backend/uploads'), 'API value has backend/uploads');
            done();
        });

        handler(req, res);
    });

    await t.test('3. The value is not an absolute filesystem path', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: 'file.jpg', path: '/var/www/uploads/file.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(dbStoredPhoto.startsWith('/var/'), false);
            assert.equal(dbStoredPhoto, '/uploads/file.jpg');
            done();
        });

        handler(req, res);
    });

    await t.test('4. The value contains no backslashes', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: '..\\config.json', path: 'C:\\backend\\uploads\\..\\config.json', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.ok(!dbStoredPhoto.includes('\\'));
            assert.equal(dbStoredPhoto, '/uploads/config.json');
            done();
        });

        handler(req, res);
    });

    await t.test('5. Directory components cannot escape into the stored web path', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: '../config.json', path: 'backend/uploads/../config.json', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(dbStoredPhoto, '/uploads/config.json');
            assert.equal(data.photo, '/uploads/config.json');
            done();
        });

        handler(req, res);
    });

    await t.test('6. No-photo behavior remains null', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' }
        };

        const res = createMockRes((status, data) => {
            assert.equal(dbStoredPhoto, null);
            assert.equal(data.photo, null);
            done();
        });

        handler(req, res);
    });

    await t.test('7. The student-create route uses the public web path for both database persistence and the successful response', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: 'xyz.jpg', path: 'backend/uploads/xyz.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(dbStoredPhoto, '/uploads/xyz.jpg');
            assert.equal(data.photo, '/uploads/xyz.jpg');
            done();
        });

        handler(req, res);
    });

    await t.test('8. Validation failure cleans up only the current uploaded filesystem file', (t, done) => {
        let dbCalled = false;
        db.run = function(sql, params, cb) {
            dbCalled = true;
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: '', gender: 'M' },
            file: { filename: 'fail.jpg', path: '/absolute/path/to/backend/uploads/fail.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(dbCalled, false, 'DB should not be called');
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });

        handler(req, res);
    });

    await t.test('9. Insert failure cleans up only the current uploaded filesystem file', (t, done) => {
        db.run = function(sql, params, cb) {
            cb.call(null, new Error('DB Error'));
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: 'fail2.jpg', path: '/absolute/path/to/backend/uploads/fail2.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 500);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });

        handler(req, res);
    });

    await t.test('10. Nested Windows-style filename is sanitized correctly', (t, done) => {
        let dbStoredPhoto;
        db.run = function(sql, params, cb) {
            dbStoredPhoto = params[1];
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test Student', gender: 'M' },
            file: { filename: 'folder\\subfolder\\photo.jpg', path: 'backend/uploads/folder\\subfolder\\photo.jpg', mimetype: 'image/jpeg', size: 1000 }
        };

        const res = createMockRes((status, data) => {
            assert.ok(!dbStoredPhoto.includes('\\'));
            assert.equal(dbStoredPhoto, '/uploads/photo.jpg');
            done();
        });

        handler(req, res);
    });

    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    validMimes.forEach((mime, idx) => {
        t.test(`11.${idx + 1} valid ${mime} is accepted and stores /uploads/<filename> and does not delete uploaded file`, (t, done) => {
            let dbStoredPhoto;
            db.run = function(sql, params, cb) {
                dbStoredPhoto = params[1];
                cb.call({ lastID: 1 }, null);
            };

            const req = {
                body: { name: 'Test', gender: 'M' },
                file: { filename: 'file.ext', path: '/abs/path/file.ext', mimetype: mime, size: 1000 }
            };

            const res = createMockRes((status, data) => {
                assert.equal(status, 200);
                assert.equal(dbStoredPhoto, '/uploads/file.ext');
                assert.equal(data.photo, '/uploads/file.ext');
                assert.equal(deletedFiles.length, 0, 'successful persistence does not delete the uploaded file');
                done();
            });

            handler(req, res);
        });
    });

    const invalidMimes = [
        { desc: '12. a PDF MIME type returns 400', mime: 'application/pdf' },
        { desc: '13. a text MIME type returns 400', mime: 'text/plain' }
    ];

    invalidMimes.forEach((c) => {
        t.test(c.desc + ' and performs no database insert and deletes exactly req.file.path', (t, done) => {
            let dbCalled = false;
            db.run = function(sql, params, cb) {
                dbCalled = true;
                cb.call({ lastID: 1 }, null);
            };

            const req = {
                body: { name: 'Test', gender: 'M' },
                file: { filename: 'bad.ext', path: '/abs/path/bad.ext', mimetype: c.mime, size: 1000 }
            };

            const res = createMockRes((status, data) => {
                assert.equal(status, 400);
                assert.equal(data.error, 'Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP)');
                assert.equal(dbCalled, false);
                assert.equal(deletedFiles.length, 1);
                assert.equal(deletedFiles[0], '/abs/path/bad.ext');
                done();
            });

            handler(req, res);
        });
    });

    await t.test('14. a file exactly 5 MB is accepted', (t, done) => {
        let dbCalled = false;
        db.run = function(sql, params, cb) {
            dbCalled = true;
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test', gender: 'M' },
            file: { filename: 'file.jpg', path: '/abs/path/file.jpg', mimetype: 'image/jpeg', size: 5 * 1024 * 1024 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(dbCalled, true);
            assert.equal(deletedFiles.length, 0);
            done();
        });

        handler(req, res);
    });

    await t.test('15. a file one byte larger than 5 MB returns 400, no db insert, deletes req.file.path', (t, done) => {
        let dbCalled = false;
        db.run = function(sql, params, cb) {
            dbCalled = true;
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: 'Test', gender: 'M' },
            file: { filename: 'file.jpg', path: '/abs/path/file.jpg', mimetype: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(data.error, 'Resim dosyası çok büyük. Maksimum 5MB olmalıdır.');
            assert.equal(dbCalled, false);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], '/abs/path/file.jpg');
            done();
        });

        handler(req, res);
    });

    await t.test('16. invalid student input still takes precedence over invalid MIME and deletes the upload', (t, done) => {
        let dbCalled = false;
        db.run = function(sql, params, cb) {
            dbCalled = true;
            cb.call({ lastID: 1 }, null);
        };

        const req = {
            body: { name: '', gender: 'M' }, // Invalid input
            file: { filename: 'file.pdf', path: '/abs/path/file.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 } // Invalid mime AND size
        };

        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(data.error, 'Öğrenci adı gereklidir'); // Original student input validation error
            assert.equal(dbCalled, false);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], '/abs/path/file.pdf');
            done();
        });

        handler(req, res);
    });
});

test('Student Update Photo Web Path Tests', async (t) => {
    const stack = app._router.stack;
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/students/:id/photo' && layer.route.methods.put);
    if (!routeLayer) throw new Error("PUT /api/students/:id/photo route not found");
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbGet;
    let originalDbRun;
    let deletedFiles = [];
    let fileCleanupSpy;
    let existsSyncSpy;

    t.beforeEach(() => {
        deletedFiles = [];
        originalDbGet = db.get;
        originalDbRun = db.run;
        
        const fs = require('node:fs');
        existsSyncSpy = t.mock.method(fs, 'existsSync', () => true);
        fileCleanupSpy = t.mock.method(fs, 'unlinkSync', (filePath) => {
            deletedFiles.push(filePath);
        });
    });

    t.afterEach(() => {
        db.get = originalDbGet;
        db.run = originalDbRun;
        existsSyncSpy.mock.restore();
        fileCleanupSpy.mock.restore();
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
        file: { filename: 'file.jpg', path: 'backend/uploads/file.jpg', mimetype: 'image/jpeg', size: 1000, ...overrides.file },
        ...overrides
    });

    await t.test('1-3, 7. Normal generated filename, response exact path, no req.file.path, no backslashes', (t, done) => {
        let storedPhoto;
        db.get = (sql, params, cb) => cb(null, { photo: 'old.jpg' });
        db.run = function(sql, params, cb) {
            storedPhoto = params[0];
            cb.call({ changes: 1 }, null);
        };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(storedPhoto, '/uploads/file.jpg');
            assert.equal(data.photo, '/uploads/file.jpg');
            assert.ok(!storedPhoto.includes('backend'));
            assert.ok(!storedPhoto.includes('\\'));
            done();
        });
        handler(req, res);
    });

    await t.test('4-6. Sanitization of ../, ..\\, and folder\\subfolder\\', (t, done) => {
        let storedPhoto;
        db.get = (sql, params, cb) => cb(null, { photo: 'old.jpg' });
        db.run = function(sql, params, cb) {
            storedPhoto = params[0];
            cb.call({ changes: 1 }, null);
        };
        const cases = [
            { filename: '../config.json', expected: '/uploads/config.json' },
            { filename: '..\\config.json', expected: '/uploads/config.json' },
            { filename: 'folder\\subfolder\\photo.jpg', expected: '/uploads/photo.jpg' }
        ];

        let i = 0;
        const nextCase = () => {
            if (i >= cases.length) return done();
            const current = cases[i++];
            const req = defaultReq({ file: { filename: current.filename, path: `backend/uploads/${current.filename}`, mimetype: 'image/jpeg', size: 100 } });
            const res = createMockRes((status, data) => {
                assert.equal(storedPhoto, current.expected);
                nextCase();
            });
            handler(req, res);
        };
        nextCase();
    });

    const invalidIds = [
        'abc', '1abc', 'abc1', '1.5', '1e2', '+1', '-1', '0', '00', '01', '1 ', ' 1', '', '   ', '9007199254740992'
    ];

    for (const invalidId of invalidIds) {
        await t.test(`8a. invalid ID "${invalidId}" with req.file returns 400, no db, and deletes req.file.path`, (t, done) => {
            let dbCalled = false;
            db.get = () => { dbCalled = true; };
            db.run = () => { dbCalled = true; };

            const req = defaultReq({ params: { id: invalidId } });
            const res = createMockRes((status, data) => {
                assert.equal(status, 400);
                assert.equal(data.error, 'Geçersiz öğrenci ID');
                assert.equal(dbCalled, false);
                assert.equal(deletedFiles.length, 1);
                assert.equal(deletedFiles[0], req.file.path);
                done();
            });
            handler(req, res);
        });
    }

    await t.test('8b. malformed ID without req.file returns 400, no db, and no file deletion', (t, done) => {
        let dbCalled = false;
        db.get = () => { dbCalled = true; };
        db.run = () => { dbCalled = true; };

        const req = defaultReq({ params: { id: 'abc' }, file: undefined });
        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(data.error, 'Geçersiz öğrenci ID');
            assert.equal(dbCalled, false);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    const validIds = [
        { raw: '1', numeric: 1 },
        { raw: '47', numeric: 47 }
    ];

    for (const validId of validIds) {
        await t.test(`8c. valid ID "${validId.raw}" converts to numeric ${validId.numeric} and is passed to db methods`, (t, done) => {
            let getQueryParam = null;
            let runQueryParam = null;
            db.get = (sql, params, cb) => {
                getQueryParam = params[0];
                cb(null, { photo: '/uploads/old-photo.jpg' });
            };
            db.run = function(sql, params, cb) {
                runQueryParam = params[1]; // UPDATE ... WHERE id = ? -> params[1] is the ID
                cb.call({ changes: 1 }, null);
            };

            const req = defaultReq({ params: { id: validId.raw } });
            const res = createMockRes((status, data) => {
                assert.equal(status, 200);
                assert.strictEqual(getQueryParam, validId.numeric);
                assert.strictEqual(runQueryParam, validId.numeric);
                done();
            });
            handler(req, res);
        });
    }

    await t.test('9. invalid MIME type deletes only req.file.path', (t, done) => {
        const req = defaultReq({ file: { filename: 'test.pdf', path: 'backend/uploads/test.pdf', mimetype: 'application/pdf', size: 100 } });
        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('10. oversized upload deletes only req.file.path', (t, done) => {
        const req = defaultReq({ file: { filename: 'big.jpg', path: 'backend/uploads/big.jpg', mimetype: 'image/jpeg', size: 10000000 } });
        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('11. lookup failure deletes only req.file.path', (t, done) => {
        db.get = (sql, params, cb) => cb(new Error('DB Error'));
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 500);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('12. missing student deletes only req.file.path', (t, done) => {
        db.get = (sql, params, cb) => cb(null, undefined); // row is undefined
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 404);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('13. update failure deletes only req.file.path, not previous photo', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/old.jpg' });
        db.run = function(sql, params, cb) { cb(new Error('Update Error')); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 500);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('14. zero-row update deletes only req.file.path', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/old.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 0 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 404);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

    await t.test('15. /uploads/old-photo.jpg deletes exactly the corresponding file inside backend/uploads', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/old-photo.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const pathObj = require('node:path');
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], pathObj.join(__dirname, '../backend/uploads/old-photo.jpg'));
            done();
        });
        handler(req, res);
    });

    await t.test('16. the newly uploaded req.file.path is not deleted after success', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/old-photo.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.ok(!deletedFiles.includes(req.file.path), 'New photo path should not be in deletedFiles');
            done();
        });
        handler(req, res);
    });

    await t.test('17. assets/default_boy.png is not deleted', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: 'assets/default_boy.png' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('18. assets/default_girl.png is not deleted', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: 'assets/default_girl.png' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('19. ../../etc/passwd is not passed to safeDeleteFile', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '../../etc/passwd' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('20. an absolute filesystem path is not passed to safeDeleteFile', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/var/www/uploads/old.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            // It starts with /uploads/ so it triggers deletion? No, starts with /var.
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('21. backend/uploads/legacy.jpg is not deleted as part of this non-legacy task', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: 'backend/uploads/legacy.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('22. a nested public value such as /uploads/folder/old.jpg cannot escape or create a nested deletion target', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/folder/old.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('23. /uploads/ performs no deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('24. /uploads/../outside.jpg performs no deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/../outside.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('25. /uploads/..\\outside.jpg performs no deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/..\\outside.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('26. /uploads/. performs no deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/.' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('27. /uploads/.. performs no deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/..' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });
});

test('Student Delete Photo Cleanup Tests', async (t) => {
    const stack = app._router.stack;
    const routeLayer = stack.find(layer => layer.route && layer.route.path === '/api/students/:id' && layer.route.methods.delete);
    if (!routeLayer) throw new Error("DELETE /api/students/:id route not found");
    const middlewares = routeLayer.route.stack;
    const handler = middlewares[middlewares.length - 1].handle;

    let originalDbGet;
    let originalDbRun;
    let deletedFiles = [];
    let fileCleanupSpy;
    let existsSyncSpy;
    const pathObj = require('node:path');

    t.beforeEach(() => {
        deletedFiles = [];
        originalDbGet = db.get;
        originalDbRun = db.run;
        
        const fs = require('node:fs');
        existsSyncSpy = t.mock.method(fs, 'existsSync', () => true);
        fileCleanupSpy = t.mock.method(fs, 'unlinkSync', (filePath) => {
            deletedFiles.push(filePath);
        });
    });

    t.afterEach(() => {
        db.get = originalDbGet;
        db.run = originalDbRun;
        existsSyncSpy.mock.restore();
        fileCleanupSpy.mock.restore();
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

    const invalidIds = [
        'abc', '1abc', 'abc1', '1.5', '1e2', '+1', '-1', '0', '00', '01', '1 ', ' 1', '', '   ', '9007199254740992'
    ];

    for (const invalidId of invalidIds) {
        await t.test(`1. invalid ID "${invalidId}" returns 400 and performs no db query or file deletion`, (t, done) => {
            let queried = false;
            db.get = () => { queried = true; };
            db.run = () => { queried = true; };
            const req = defaultReq({ params: { id: invalidId } });
            const res = createMockRes((status, data) => {
                assert.equal(status, 400);
                assert.equal(data.error, 'Geçersiz öğrenci ID');
                assert.equal(queried, false);
                assert.equal(deletedFiles.length, 0);
                done();
            });
            handler(req, res);
        });
    }

    const validIds = [
        { raw: '1', numeric: 1 },
        { raw: '47', numeric: 47 }
    ];

    for (const validId of validIds) {
        await t.test(`1a. valid ID "${validId.raw}" is converted to numeric ${validId.numeric} and queried`, (t, done) => {
            let getQueryParam = null;
            let runQueryParam = null;
            
            db.get = (sql, params, cb) => {
                getQueryParam = params[0];
                cb(null, { photo: '/uploads/student-photo.jpg' });
            };
            db.run = function(sql, params, cb) {
                runQueryParam = params[0];
                cb.call({ changes: 1 }, null);
            };

            const req = defaultReq({ params: { id: validId.raw } });
            const res = createMockRes((status, data) => {
                assert.equal(status, 200);
                assert.strictEqual(getQueryParam, validId.numeric);
                assert.strictEqual(runQueryParam, validId.numeric);
                done();
            });
            handler(req, res);
        });
    }

    await t.test('2. student lookup failure returns 500 and performs no file deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(new Error('DB Error'));
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 500);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('3. missing student returns 404 and performs no database delete or file deletion', (t, done) => {
        db.get = (sql, params, cb) => cb(null, undefined); // row is undefined
        let deleteCalled = false;
        db.run = () => { deleteCalled = true; };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 404);
            assert.equal(deleteCalled, false);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('4. database delete failure returns 500 and does not delete the photo', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/student-photo.jpg' });
        db.run = function(sql, params, cb) { cb(new Error('Update Error')); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 500);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('5. zero-row database delete returns 404 and does not delete the photo', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/student-photo.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 0 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 404);
            assert.equal(deletedFiles.length, 0);
            done();
        });
        handler(req, res);
    });

    await t.test('6, 7, 8. successful deletion returns existing response, deletes exactly mapped backend path, and happens only after db success', (t, done) => {
        let dbSucceeded = false;
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/student-photo.jpg' });
        db.run = function(sql, params, cb) {
            dbSucceeded = true;
            cb.call({ changes: 1 }, null);
        };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(data.changes, 1);
            assert.equal(data.message, 'Öğrenci silindi');
            assert.equal(dbSucceeded, true);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], pathObj.join(__dirname, '../backend/uploads/student-photo.jpg'));
            done();
        });
        handler(req, res);
    });

    const malformedCases = [
        { desc: '9. null photo causes no file deletion', val: null },
        { desc: '10. assets/default_boy.png causes no file deletion', val: 'assets/default_boy.png' },
        { desc: '11. assets/default_girl.png causes no file deletion', val: 'assets/default_girl.png' },
        { desc: '12. /uploads/folder/photo.jpg causes no file deletion', val: '/uploads/folder/photo.jpg' },
        { desc: '13. /uploads/../outside.jpg causes no file deletion', val: '/uploads/../outside.jpg' },
        { desc: '14. /uploads/..\\outside.jpg causes no file deletion', val: '/uploads/..\\outside.jpg' },
        { desc: '15. /uploads/ causes no file deletion', val: '/uploads/' },
        { desc: '15. /uploads/. causes no file deletion', val: '/uploads/.' },
        { desc: '15. /uploads/.. causes no file deletion', val: '/uploads/..' },
        { desc: '16. backend/uploads/legacy.jpg causes no file deletion', val: 'backend/uploads/legacy.jpg' },
        { desc: '16. absolute paths cause no file deletion', val: '/var/www/uploads/legacy.jpg' },
        { desc: '16. external paths cause no file deletion', val: '../../etc/passwd' }
    ];

    for (const c of malformedCases) {
        await t.test(c.desc, (t, done) => {
            db.get = (sql, params, cb) => cb(null, { photo: c.val });
            db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
            const req = defaultReq();
            const res = createMockRes((status, data) => {
                assert.equal(status, 200);
                assert.equal(deletedFiles.length, 0);
                done();
            });
            handler(req, res);
        });
    }

    await t.test('17. filesystem cleanup failure must not reverse or falsely report database deletion failure', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/student-photo.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        
        fileCleanupSpy.mock.restore();
        const fs = require('node:fs');
        const errSpy = t.mock.method(fs, 'unlinkSync', () => { throw new Error('EACCES'); });
        
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(data.changes, 1);
            assert.equal(data.message, 'Öğrenci silindi');
            errSpy.mock.restore();
            done();
        });
        handler(req, res);
    });
});

test('Isolation self-check', () => {
    assert.ok(testDbPath.startsWith(tempDir));
    assert.ok(tempDir.startsWith(os.tmpdir()));
    assert.notEqual(testDbPath, path.join(__dirname, 'dummy.db'));
    assert.ok(!testDbPath.startsWith(path.join(__dirname, '..', 'tests')));
    assert.ok(testDbPath.endsWith('.db'));
    assert.notEqual(path.basename(testDbPath), 'dummy.db');
});

async function closeCleanAndRestore({ closeDatabase, removeFiles, removeDirectory, restoreState }) {
    let firstError = null;

    try {
        try {
            await closeDatabase();
        } catch (err) {
            firstError = err;
        }

        try {
            removeFiles();
        } catch (err) {
            if (!firstError) firstError = err;
        }

        try {
            removeDirectory();
        } catch (err) {
            if (!firstError) firstError = err;
        }
    } finally {
        restoreState();
    }

    if (firstError) {
        throw firstError;
    }
}

test('Teardown restoration helper behaviors', async (t) => {
    await t.test('Executes operations exactly once and in correct order', async () => {
        const events = [];
        let closeDbCount = 0;
        let removeFilesCount = 0;
        let removeDirectoryCount = 0;
        let restoreStateCount = 0;

        await closeCleanAndRestore({
            closeDatabase: async () => {
                events.push('closeDatabase');
                closeDbCount++;
            },
            removeFiles: () => {
                events.push('removeFiles');
                removeFilesCount++;
            },
            removeDirectory: () => {
                events.push('removeDirectory');
                removeDirectoryCount++;
            },
            restoreState: () => {
                events.push('restoreState');
                restoreStateCount++;
            }
        });

        assert.equal(closeDbCount, 1, 'closeDatabase executes exactly once');
        assert.equal(removeFilesCount, 1, 'removeFiles executes exactly once');
        assert.equal(removeDirectoryCount, 1, 'removeDirectory executes exactly once');
        assert.equal(restoreStateCount, 1, 'restoreState executes exactly once');
        assert.deepEqual(events, ['closeDatabase', 'removeFiles', 'removeDirectory', 'restoreState'], 'executes exactly in order');
    });

    await t.test('Restoration executes and throws original file cleanup error', async () => {
        const events = [];
        let closeDbCount = 0;
        let removeDirectoryCount = 0;
        let restoreStateCount = 0;

        const originalError = new Error('forced cleanup failure');
        let caughtError = null;

        try {
            await closeCleanAndRestore({
                closeDatabase: async () => {
                    events.push('closeDatabase');
                    closeDbCount++;
                },
                removeFiles: () => {
                    events.push('removeFilesThrow');
                    throw originalError;
                },
                removeDirectory: () => {
                    events.push('removeDirectory');
                    removeDirectoryCount++;
                },
                restoreState: () => {
                    events.push('restoreState');
                    restoreStateCount++;
                }
            });
        } catch (err) {
            caughtError = err;
        }

        assert.strictEqual(caughtError, originalError, 'original error is rethrown');
        assert.equal(closeDbCount, 1, 'closeDatabase already executed exactly once');
        assert.equal(removeDirectoryCount, 1, 'removeDirectory still executes exactly once');
        assert.equal(restoreStateCount, 1, 'restoreState still executes exactly once');
        assert.deepEqual(events, ['closeDatabase', 'removeFilesThrow', 'removeDirectory', 'restoreState']);
    });

    await t.test('Restoration executes and throws original db close error', async () => {
        const events = [];
        let removeFilesCount = 0;
        let removeDirectoryCount = 0;
        let restoreStateCount = 0;

        const originalError = new Error('forced db failure');
        let caughtError = null;

        try {
            await closeCleanAndRestore({
                closeDatabase: async () => {
                    events.push('closeDatabaseThrow');
                    throw originalError;
                },
                removeFiles: () => {
                    events.push('removeFilesThrow');
                    removeFilesCount++;
                    throw new Error('secondary file failure');
                },
                removeDirectory: () => {
                    events.push('removeDirectory');
                    removeDirectoryCount++;
                },
                restoreState: () => {
                    events.push('restoreState');
                    restoreStateCount++;
                }
            });
        } catch (err) {
            caughtError = err;
        }

        assert.strictEqual(caughtError, originalError, 'original db error is rethrown');
        assert.equal(removeFilesCount, 1, 'removeFiles still executes exactly once');
        assert.equal(removeDirectoryCount, 1, 'removeDirectory still executes exactly once');
        assert.equal(restoreStateCount, 1, 'restoreState still executes exactly once');
        assert.deepEqual(events, ['closeDatabaseThrow', 'removeFilesThrow', 'removeDirectory', 'restoreState']);
    });
});

after(async () => {
    await closeCleanAndRestore({
        closeDatabase: () => new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) return reject(err);
                resolve();
            });
        }),
        removeFiles: () => {
            let fileError = null;
            for (const suffix of ['', '-journal', '-wal', '-shm']) {
                try {
                    fs.unlinkSync(testDbPath + suffix);
                } catch (err) {
                    if (err.code !== 'ENOENT' && !fileError) fileError = err;
                }
            }
            if (fileError) throw fileError;
        },
        removeDirectory: () => {
            try {
                fs.rmdirSync(tempDir);
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }
        },
        restoreState: () => {
            global.setInterval = originalSetInterval;
            if (originalDbPath === undefined) {
                delete process.env.CLASSROOM_DB_PATH;
            } else {
                process.env.CLASSROOM_DB_PATH = originalDbPath;
            }
        }
    });
});
