const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('CORS Policy Security Tests', async (t) => {
    // 1. Setup isolated environment
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-cors-test-'));
    const dbPath = path.join(tempDir, 'test.db');
    const originalDbPath = process.env.CLASSROOM_DB_PATH;
    process.env.CLASSROOM_DB_PATH = dbPath;

    const originalSetInterval = global.setInterval;
    global.setInterval = () => {};

    let server;
    let app;
    let db;
    let serverUrl;

    try {
        // We require the app dynamically so it uses the isolated env var
        const backendPath = path.join(__dirname, '..', 'backend');
        const dbModule = require(path.join(backendPath, 'database'));
        db = dbModule.db || dbModule; 
        // Some modules export { db } or db directly, wait, Classroom usually exports the db directly from database.js but let's check carefully. Let's just require server.js which gives the app.
        
        // Let's first make sure we close the db properly.
        // We will mock db or clear cache if needed. Wait, in test files they usually require `../backend/server`.
        app = require(path.join(backendPath, 'server'));

        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const port = server.address().port;
        serverUrl = `http://localhost:${port}`;

        // Helper to make requests
        const makeRequest = (method, endpoint, headers = {}) => {
            return new Promise((resolve, reject) => {
                const req = http.request(serverUrl + endpoint, {
                    method: method,
                    headers: {
                        'Connection': 'close',
                        ...headers
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data
                        });
                    });
                });
                req.on('error', reject);
                req.end();
            });
        };

        const checkNoCorsHeaders = (headers) => {
            assert.strictEqual(headers['access-control-allow-origin'], undefined, 'Must not have access-control-allow-origin');
            assert.strictEqual(headers['access-control-allow-credentials'], undefined, 'Must not have access-control-allow-credentials');
            assert.strictEqual(headers['access-control-allow-methods'], undefined, 'Must not have access-control-allow-methods');
            assert.strictEqual(headers['access-control-allow-headers'], undefined, 'Must not have access-control-allow-headers');
        };

        await t.test('A. Same-origin-compatible API behaviour remains intact', async () => {
            const res = await makeRequest('GET', '/api/students');
            assert.strictEqual(res.statusCode, 200, 'Expected successful status');
            
            // Validate JSON
            JSON.parse(res.body);

            // Assert no CORS header
            checkNoCorsHeaders(res.headers);
        });

        await t.test('B. A hostile cross-origin GET receives no browser permission', async () => {
            const res = await makeRequest('GET', '/api/students', {
                'Origin': 'https://attacker.example'
            });
            // The underlying route returns normal response
            JSON.parse(res.body);

            // But must not have cors headers
            checkNoCorsHeaders(res.headers);
        });

        await t.test('C. A cross-origin preflight receives no permission', async () => {
            const res = await makeRequest('OPTIONS', '/api/settings', {
                'Origin': 'https://attacker.example',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
            });

            checkNoCorsHeaders(res.headers);
        });

        await t.test('D. Null-origin requests are not authorized', async () => {
            const res = await makeRequest('GET', '/api/students', {
                'Origin': 'null'
            });

            assert.strictEqual(res.headers['access-control-allow-origin'], undefined, 'Must not have access-control-allow-origin for null origin');
        });

        await t.test('E. Middleware registration stays clean', async () => {
            const serverSource = fs.readFileSync(path.join(backendPath, 'server.js'), 'utf8');
            
            // unrestricted CORS middleware is no longer registered
            assert.ok(!serverSource.includes('app.use(cors())'), 'cors() should not be registered globally');
            assert.ok(!serverSource.includes("require('cors')"), 'cors package should not be required');

            // JSON middleware is not duplicated (only exactly one app.use(express.json()))
            const jsonMatches = serverSource.match(/app\.use\(express\.json\(\)\)/g);
            assert.strictEqual(jsonMatches.length, 1, 'express.json() should be registered exactly once');

            // existing API routes remain registered
            assert.ok(serverSource.includes("app.get('/api/students', "), 'API routes must remain registered');
            assert.ok(serverSource.includes("app.get('/api/settings', "), 'API routes must remain registered');
        });

    } finally {
        global.setInterval = originalSetInterval;
        // Teardown
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        // We can close DB directly if server exports it, or we can just require database to close it
        try {
            const dbModule = require('../backend/database');
            const dbInstance = dbModule.db || dbModule;
            if (dbInstance && typeof dbInstance.close === 'function') {
                await new Promise((resolve, reject) => {
                    dbInstance.close((err) => {
                        if (err && err.message !== 'SQLITE_MISUSE: Database handle is closed') {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        } catch (e) {
            // Ignore db close errors if it's already closed
        }

        // Restore env
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }

        // Clean up files
        const cleanupFiles = [dbPath, dbPath + '-journal', dbPath + '-wal', dbPath + '-shm'];
        for (const file of cleanupFiles) {
            if (fs.existsSync(file)) {
                try { fs.unlinkSync(file); } catch (e) {}
            }
        }
        
        if (fs.existsSync(tempDir)) {
            try { fs.rmdirSync(tempDir); } catch (e) {}
        }
    }
});
