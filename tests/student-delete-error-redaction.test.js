const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

// DB isolation
const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'classroom-student-delete-error-redaction-')
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
const { Logger, COMPONENTS } = require('../backend/logger.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) return reject(err);
            resolve();
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

function createTrackedResponse() {
    let resolvePromise;
    let rejectPromise;

    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const timeout = setTimeout(() => {
        rejectPromise(new Error('Expected exactly one response, received 0'));
    }, 50);

    const res = {
        statusCode: 200,
        responseCount: 0,
        body: null,
        promise,
        resolveTimeout: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(data) {
            this.responseCount++;

            if (this.responseCount > 1) {
                clearTimeout(timeout);
                if (this.resolveTimeout) clearTimeout(this.resolveTimeout);
                rejectPromise(new Error('Multiple responses sent'));
                return this;
            }

            this.body = data;
            clearTimeout(timeout);

            this.resolveTimeout = setTimeout(() => {
                resolvePromise({
                    statusCode: this.statusCode,
                    body: this.body,
                    responseCount: this.responseCount
                });
            }, 5);

            return this;
        }
    };

    return res;
}

test('Student Delete Error Redaction Tests', async (t) => {
    t.after(async () => {
        try {
            await closeDatabase(db);
    
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
    });

    if (db.scheduleMigrationPromise) {
        await db.scheduleMigrationPromise;
    }

    await t.test('Helper regression: Multiple responses sent', async () => {
        const res = createTrackedResponse();
        res.json({});
        res.json({});
        await assert.rejects(res.promise, /Multiple responses sent/);
    });

    await t.test('Helper regression: Expected exactly one response, received 0', async () => {
        const res = createTrackedResponse();
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
    });

    // Route discovery
    const deleteRoutes = [];
    app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path === '/api/students/:id' && layer.route.methods.delete) {
            deleteRoutes.push(layer);
        }
    });

    let targetHandler;
    await t.test('Exactly one matching DELETE route exists', () => {
        assert.strictEqual(deleteRoutes.length, 1);
        const route = deleteRoutes[0].route;
        assert.strictEqual(route.stack.length, 4);
        assert.strictEqual(route.stack[0].name, 'requireAdminSession');
        assert.strictEqual(route.stack[1].name, 'requireCsrfToken');
        assert.strictEqual(typeof route.stack[2].handle, 'function');
        assert.notStrictEqual(route.stack[2].handle, route.stack[3].handle);
        assert.strictEqual(typeof route.stack[3].handle, 'function');
        targetHandler = route.stack[3].handle;
    });

    await t.test('1. Invalid-ID preservation', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;

        try {
            db.get = () => { getCalls++; };
            db.run = () => { runCalls++; };
            Logger.prototype.error = () => { logCalls++; };

            const invalidIds = ['abc', '47abc', '47.5', '047', '0', '-47', '9007199254740992'];
            for (const id of invalidIds) {
                const req = { params: { id } };
                const res = createTrackedResponse();
                await targetHandler(req, res);
                const result = await res.promise;
                
                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(result.body, { error: 'Geçersiz öğrenci ID' });
                assert.strictEqual(result.responseCount, 1);
            }

            const otherInvalidIds = [undefined, null, 47, true, {}, []];
            for (const id of otherInvalidIds) {
                const req = { params: { id } };
                const res = createTrackedResponse();
                await targetHandler(req, res);
                const result = await res.promise;
                
                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(result.body, { error: 'Geçersiz öğrenci ID' });
                assert.strictEqual(result.responseCount, 1);
            }
            
            assert.strictEqual(getCalls, 0);
            assert.strictEqual(runCalls, 0);
            assert.strictEqual(logCalls, 0);
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
        }
    });

    await t.test('2. Missing-student preservation', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;
        let capturedSql;
        let capturedParams;

        try {
            db.get = (sql, params, cb) => {
                getCalls++;
                capturedSql = sql;
                capturedParams = params;
                cb(null, undefined); // No row
            };
            db.run = () => { runCalls++; };
            Logger.prototype.error = () => { logCalls++; };

            const req = { params: { id: '47' }, requestId: 'student-delete-not-found-request' };
            const res = createTrackedResponse();
            await targetHandler(req, res);
            const result = await res.promise;

            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 0);
            assert.strictEqual(logCalls, 0);
            assert.strictEqual(capturedSql, "SELECT photo FROM students WHERE id = ?");
            assert.deepStrictEqual(capturedParams, [47]);
            assert.strictEqual(typeof capturedParams[0], 'number');

            assert.strictEqual(result.statusCode, 404);
            assert.deepStrictEqual(result.body, { error: 'Öğrenci bulunamadı' });
            assert.strictEqual(result.responseCount, 1);
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
        }
    });

    await t.test('3. Pre-read database error', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;
        let capturedSql;
        let capturedParams;
        let capturedLogArgs;

        try {
            const secretMarker = 'SENSITIVE_STUDENT_DELETE_SELECT_DETAIL_' + crypto.randomBytes(4).toString('hex');
            const testError = new Error(secretMarker);

            db.get = (sql, params, cb) => {
                getCalls++;
                capturedSql = sql;
                capturedParams = params;
                cb(testError);
            };
            db.run = () => { runCalls++; };
            Logger.prototype.error = (comp, msg, err, meta) => {
                logCalls++;
                capturedLogArgs = { comp, msg, err, meta };
            };

            const req = { params: { id: '47' }, requestId: 'student-delete-select-error-request' };
            const res = createTrackedResponse();
            await targetHandler(req, res);
            const result = await res.promise;

            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 0);
            assert.strictEqual(capturedSql, "SELECT photo FROM students WHERE id = ?");
            assert.deepStrictEqual(capturedParams, [47]);

            assert.strictEqual(result.statusCode, 500);
            assert.deepStrictEqual(result.body, { error: 'Öğrenci silinirken hata oluştu' });
            assert.strictEqual(result.responseCount, 1);
            
            const serialized = JSON.stringify(result.body);
            assert.ok(!serialized.includes(secretMarker));

            assert.strictEqual(logCalls, 1);
            assert.strictEqual(capturedLogArgs.comp, COMPONENTS.API);
            assert.strictEqual(capturedLogArgs.msg, 'Error fetching student for deletion');
            assert.strictEqual(capturedLogArgs.err, testError);
            
            assert.strictEqual(capturedLogArgs.meta.endpoint, '/api/students/:id');
            assert.strictEqual(capturedLogArgs.meta.requestId, 'student-delete-select-error-request');
            assert.strictEqual(capturedLogArgs.meta.studentId, 47);
            assert.strictEqual(capturedLogArgs.meta.query, capturedSql);
            assert.strictEqual(capturedLogArgs.meta.params, capturedParams);
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
        }
    });

    await t.test('4. Delete database error', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        const originalFsUnlink = fs.unlinkSync;
        
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;
        let unlinkCalls = 0;
        let getSql, getParams, runSql, runParams, capturedLogArgs;

        try {
            const secretMarker = 'SENSITIVE_STUDENT_DELETE_RUN_DETAIL_' + crypto.randomBytes(4).toString('hex');
            const deleteError = new Error(secretMarker);
            deleteError.code = 'SQLITE_CONSTRAINT';

            db.get = (sql, params, cb) => {
                getCalls++;
                getSql = sql;
                getParams = params;
                cb(null, { photo: '/uploads/student-photo.jpg' });
            };
            db.run = (sql, params, cb) => {
                runCalls++;
                runSql = sql;
                runParams = params;
                cb.call(this, deleteError);
            };
            Logger.prototype.error = (comp, msg, err, meta) => {
                logCalls++;
                capturedLogArgs = { comp, msg, err, meta };
            };
            fs.unlinkSync = () => { unlinkCalls++; };

            const req = { params: { id: '47' }, requestId: 'student-delete-run-error-request' };
            const res = createTrackedResponse();
            await targetHandler(req, res);
            const result = await res.promise;

            assert.strictEqual(getCalls, 1);
            assert.strictEqual(getSql, "SELECT photo FROM students WHERE id = ?");
            assert.deepStrictEqual(getParams, [47]);

            assert.strictEqual(runCalls, 1);
            assert.strictEqual(runSql, "DELETE FROM students WHERE id = ?");
            assert.deepStrictEqual(runParams, [47]);
            assert.strictEqual(typeof runParams[0], 'number');

            assert.strictEqual(result.statusCode, 500);
            assert.deepStrictEqual(result.body, { error: 'Öğrenci silinirken hata oluştu' });
            assert.strictEqual(result.responseCount, 1);
            
            const serialized = JSON.stringify(result.body);
            assert.ok(!serialized.includes(secretMarker));
            assert.ok(!serialized.includes('SQLITE_CONSTRAINT'));

            assert.strictEqual(logCalls, 1);
            assert.strictEqual(capturedLogArgs.comp, COMPONENTS.API);
            assert.strictEqual(capturedLogArgs.msg, 'Error deleting student');
            assert.strictEqual(capturedLogArgs.err, deleteError);
            
            assert.strictEqual(capturedLogArgs.meta.endpoint, '/api/students/:id');
            assert.strictEqual(capturedLogArgs.meta.requestId, 'student-delete-run-error-request');
            assert.strictEqual(capturedLogArgs.meta.studentId, 47);
            assert.strictEqual(capturedLogArgs.meta.query, runSql);
            assert.strictEqual(capturedLogArgs.meta.params, runParams);
            assert.strictEqual(capturedLogArgs.meta.errorCode, 'SQLITE_CONSTRAINT');
            assert.strictEqual(capturedLogArgs.meta.errorMessage, deleteError.message);

            assert.strictEqual(unlinkCalls, 0);
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
            fs.unlinkSync = originalFsUnlink;
        }
    });

    await t.test('5. Zero-change 404 preservation', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        const originalFsUnlink = fs.unlinkSync;
        
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;
        let unlinkCalls = 0;
        let getSql, getParams, runSql, runParams;

        try {
            db.get = (sql, params, cb) => {
                getCalls++;
                getSql = sql;
                getParams = params;
                cb(null, { photo: '/uploads/student-photo.jpg' });
            };
            db.run = (sql, params, cb) => {
                runCalls++;
                runSql = sql;
                runParams = params;
                cb.call({ changes: 0 }, null);
            };
            Logger.prototype.error = () => { logCalls++; };
            fs.unlinkSync = () => { unlinkCalls++; };

            const req = { params: { id: '47' }, requestId: 'student-delete-zero-change-request' };
            const res = createTrackedResponse();
            await targetHandler(req, res);
            const result = await res.promise;

            assert.strictEqual(getSql, "SELECT photo FROM students WHERE id = ?");
            assert.deepStrictEqual(getParams, [47]);
            assert.strictEqual(runSql, "DELETE FROM students WHERE id = ?");
            assert.deepStrictEqual(runParams, [47]);

            assert.strictEqual(result.statusCode, 404);
            assert.deepStrictEqual(result.body, { error: 'Öğrenci bulunamadı' });
            assert.strictEqual(result.responseCount, 1);
            
            assert.strictEqual(logCalls, 0);
            assert.strictEqual(unlinkCalls, 0);
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
            fs.unlinkSync = originalFsUnlink;
        }
    });

    await t.test('6. Successful deletion and managed-photo cleanup', async (t2) => {
        const originalDbGet = db.get;
        const originalDbRun = db.run;
        const originalLoggerError = Logger.prototype.error;
        const originalFsExistsSync = fs.existsSync;
        const originalFsUnlinkSync = fs.unlinkSync;
        
        let getCalls = 0;
        let runCalls = 0;
        let logCalls = 0;
        let unlinkCalls = 0;
        let unlinkedPath = null;
        let getSql, getParams, runSql, runParams;

        try {
            const expectedPhotoPath = path.resolve(
                __dirname,
                '../backend/uploads/student-photo.jpg'
            );

            db.get = (sql, params, cb) => {
                getCalls++;
                getSql = sql;
                getParams = params;
                cb(null, { photo: '/uploads/student-photo.jpg' });
            };
            db.run = (sql, params, cb) => {
                runCalls++;
                runSql = sql;
                runParams = params;
                cb.call({ changes: 1 }, null);
            };
            Logger.prototype.error = () => { logCalls++; };
            fs.existsSync = (p) => {
                return p === expectedPhotoPath;
            };
            fs.unlinkSync = (p) => {
                unlinkCalls++;
                unlinkedPath = p;
            };

            const req = { params: { id: '47' }, requestId: 'student-delete-success-request' };
            const res = createTrackedResponse();
            await targetHandler(req, res);
            const result = await res.promise;

            assert.strictEqual(getSql, "SELECT photo FROM students WHERE id = ?");
            assert.deepStrictEqual(getParams, [47]);
            assert.strictEqual(runSql, "DELETE FROM students WHERE id = ?");
            assert.deepStrictEqual(runParams, [47]);
            assert.strictEqual(getCalls, 1);
            assert.strictEqual(runCalls, 1);

            assert.strictEqual(result.statusCode, 200);
            assert.deepStrictEqual(result.body, { message: 'Öğrenci silindi', changes: 1 });
            assert.strictEqual(result.responseCount, 1);
            
            assert.strictEqual(logCalls, 0);
            assert.strictEqual(unlinkCalls, 1);
            assert.strictEqual(unlinkedPath, expectedPhotoPath);
            assert.ok(unlinkedPath.includes(path.normalize('backend/uploads')));
        } finally {
            db.get = originalDbGet;
            db.run = originalDbRun;
            Logger.prototype.error = originalLoggerError;
            fs.existsSync = originalFsExistsSync;
            fs.unlinkSync = originalFsUnlinkSync;
        }
    });
});
