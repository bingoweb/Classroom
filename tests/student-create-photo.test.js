const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.CLASSROOM_DB_PATH = path.join(__dirname, 'dummy.db');

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
            file: { filename: '1720000000000-example.jpg', path: 'backend/uploads/1720000000000-example.jpg' }
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
            file: { filename: 'somefile.jpg', path: '/absolute/path/to/backend/uploads/somefile.jpg' }
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
            file: { filename: 'file.jpg', path: '/var/www/uploads/file.jpg' }
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
            file: { filename: '..\\config.json', path: 'C:\\backend\\uploads\\..\\config.json' }
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
            file: { filename: '../config.json', path: 'backend/uploads/../config.json' }
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
            file: { filename: 'xyz.jpg', path: 'backend/uploads/xyz.jpg' }
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
            file: { filename: 'fail.jpg', path: '/absolute/path/to/backend/uploads/fail.jpg' }
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
            file: { filename: 'fail2.jpg', path: '/absolute/path/to/backend/uploads/fail2.jpg' }
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
            file: { filename: 'folder\\subfolder\\photo.jpg', path: 'backend/uploads/folder\\subfolder\\photo.jpg' }
        };

        const res = createMockRes((status, data) => {
            assert.ok(!dbStoredPhoto.includes('\\'));
            assert.equal(dbStoredPhoto, '/uploads/photo.jpg');
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

    await t.test('8. invalid student ID deletes only req.file.path', (t, done) => {
        const req = defaultReq({ params: { id: 'abc' } });
        const res = createMockRes((status, data) => {
            assert.equal(status, 400);
            assert.equal(deletedFiles.length, 1);
            assert.equal(deletedFiles[0], req.file.path);
            done();
        });
        handler(req, res);
    });

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

    await t.test('15-18. successful update deletes old photo (resolved path) but protects default avatars and keeps new file', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: '/uploads/old-photo.jpg' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 1);
            assert.ok(deletedFiles[0].includes('old-photo.jpg'), 'Old photo deleted');
            assert.notEqual(deletedFiles[0], req.file.path, 'New photo not deleted');
            done();
        });
        handler(req, res);
    });

    await t.test('17. default avatars remain protected', (t, done) => {
        db.get = (sql, params, cb) => cb(null, { photo: 'assets/default_boy.png' });
        db.run = function(sql, params, cb) { cb.call({ changes: 1 }, null); };
        const req = defaultReq();
        const res = createMockRes((status, data) => {
            assert.equal(status, 200);
            assert.equal(deletedFiles.length, 0, 'No files should be deleted (default avatar is protected, new file kept)');
            done();
        });
        handler(req, res);
    });
});
