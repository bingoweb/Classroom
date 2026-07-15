const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

test('Student Import Error Redaction', async () => {
    const originalDbPath = process.env.CLASSROOM_DB_PATH;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-import-test-'));
    const tempDbPath = path.join(tempDir, 'test.db');
    process.env.CLASSROOM_DB_PATH = tempDbPath;

    const originalSetInterval = global.setInterval;
    global.setInterval = () => {};

    const XLSX = require('xlsx');
    const app = require('../backend/server.js');
    const db = require('../backend/database.js');
    const { Logger } = require('../backend/logger.js');

    const originalReadFile = XLSX.readFile;
    const originalLoggerError = Logger.prototype.error;

    let loggerErrorCalled = false;
    let loggedErrorObj = null;

    try {
        const routes = app._router.stack
            .filter(layer => layer.route && layer.route.path === '/api/students/import' && layer.route.methods.post);
        assert.strictEqual(routes.length, 1, 'Should find exactly one POST /api/students/import route');
        
        const importRoute = routes[0].route;
        const handler = importRoute.stack[importRoute.stack.length - 1].handle;

        const secretMarker = 'SENSITIVE_XLSX_PARSER_DETAIL_7f41c2';
        
        XLSX.readFile = () => {
            throw new Error(secretMarker);
        };

        Logger.prototype.error = function(component, message, err, meta) {
            loggerErrorCalled = true;
            loggedErrorObj = err;
            return originalLoggerError.call(this, component, message, err, meta);
        };

        const uploadedFilePath = path.join(tempDir, 'fake-upload.xlsx');
        fs.writeFileSync(uploadedFilePath, 'dummy data');

        const req = {
            file: {
                path: uploadedFilePath,
                originalname: 'ogrenciler.xlsx'
            }
        };

        let responseCount = 0;
        let finalStatus = 200;
        let finalBody = null;

        const res = {
            status(code) {
                finalStatus = code;
                return this;
            },
            json(body) {
                responseCount++;
                if (responseCount > 1) {
                    throw new Error('Multiple responses sent');
                }
                finalBody = body;
                return this;
            }
        };

        await handler(req, res);

        assert.strictEqual(responseCount, 1, 'Exactly one response should be sent');
        assert.strictEqual(finalStatus, 500, 'Status should be 500');
        assert.deepStrictEqual(finalBody, { error: 'Excel dosyası işlenirken hata oluştu' }, 'Response body exactly matches redacted message');
        
        const serializedBody = JSON.stringify(finalBody);
        assert.ok(!serializedBody.includes(secretMarker), 'Serialized response must not contain secret marker');

        assert.ok(!fs.existsSync(uploadedFilePath), 'Uploaded temporary file must be deleted');
        
        assert.ok(loggerErrorCalled, 'Logger error path must be called');
        assert.ok(loggedErrorObj && loggedErrorObj.message && loggedErrorObj.message.includes(secretMarker), 'Real error message containing secret marker must be passed to logger');

    } finally {
        XLSX.readFile = originalReadFile;
        Logger.prototype.error = originalLoggerError;
        
        global.setInterval = originalSetInterval;
        
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }

        await closeDatabase(db);

        const cleanupFiles = [
            'test.db',
            'test.db-journal',
            'test.db-wal',
            'test.db-shm',
            'fake-upload.xlsx'
        ];

        for (const file of cleanupFiles) {
            try {
                fs.unlinkSync(path.join(tempDir, file));
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
        }

        try {
            fs.rmdirSync(tempDir);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
});
