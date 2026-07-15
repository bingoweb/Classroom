const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

test('Admin Session Error Redaction Test', async (t) => {
    // 1 & 2: Unique DB
    const originalDbPath = process.env.CLASSROOM_DB_PATH;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-error-redaction-test-'));
    const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
    process.env.CLASSROOM_DB_PATH = testDbPath;

    // 3: Distinctive password
    const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
    const distinctivePassword = 'DISTINCTIVE_SECRET_PASSWORD_' + Date.now();
    process.env.CLASSROOM_ADMIN_PASSWORD = distinctivePassword;

    // We also need to restore global.setInterval if the server overrides it or uses it
    const originalSetInterval = global.setInterval;
    global.setInterval = () => {};

    // 4: Force admin session creation to throw
    const originalRandomBytes = crypto.randomBytes;
    let originalConsoleError = console.error;
    let originalConsoleLog = console.log;
    let originalConsoleWarn = console.warn;
    let originalConsoleInfo = console.info;

    // We will capture output
    let capturedOutput = '';
    const captureStream = (msg, ...args) => {
        capturedOutput += [msg, ...args].join(' ') + '\n';
    };

    console.error = captureStream;
    console.log = captureStream;
    console.warn = captureStream;
    console.info = captureStream;

    let randomBytesCalls = 0;
    crypto.randomBytes = function(size, cb) {
        randomBytesCalls++;
        // Allow the first call for CSRF secret generation to succeed
        if (randomBytesCalls === 1) {
            if (cb) {
                return originalRandomBytes(size, cb);
            }
            return originalRandomBytes(size);
        }
        if (!cb) {
            throw new Error('Forced crypto.randomBytes error for testing');
        }
        throw new Error('Forced crypto.randomBytes error for testing');
    };

    let server;
    let db;
    
    try {
        // Require after mocks
        const app = require('../backend/server.js');
        db = require('../backend/database.js');

        await db.scheduleMigrationPromise;

        // 5: Start the application
        const serverUrl = await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                resolve(`http://127.0.0.1:${server.address().port}`);
            });
        });

        // 7: Submit a valid JSON login request
        const res = await new Promise((resolve, reject) => {
            const req = http.request(serverUrl + '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({ statusCode: response.statusCode, body: data ? JSON.parse(data) : null });
                });
            });
            req.on('error', reject);
            req.write(JSON.stringify({ password: distinctivePassword }));
            req.end();
        });

        // Restore consoles before assertions so we can see assertion failures
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.info = originalConsoleInfo;

        // 8: Verify safe Turkish JSON 500 response
        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'Sunucu hatası oluştu' });

        // 9: Verify distinctive password does not appear in captured output
        assert.ok(!capturedOutput.includes(distinctivePassword), 'The distinctive password was found in the captured logs!');

    } finally {
        // 12: Restore everything
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.info = originalConsoleInfo;

        crypto.randomBytes = originalRandomBytes;

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        
        if (db) {
            await new Promise(resolve => db.close(resolve));
        }

        // 11: Cleanup files
        const tryUnlink = (p) => { try { fs.unlinkSync(p); } catch (e) {} };
        tryUnlink(testDbPath);
        tryUnlink(testDbPath + '-journal');
        tryUnlink(testDbPath + '-wal');
        tryUnlink(testDbPath + '-shm');
        try { fs.rmdirSync(tempDir); } catch(e) {}

        global.setInterval = originalSetInterval;

        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }

        if (originalPassword === undefined) {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        } else {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalPassword;
        }
    }
});
