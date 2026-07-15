const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const http = require('node:http');

test('JSON middleware is registered exactly once and handles requests', async () => {
    const originalDbPath = process.env.CLASSROOM_DB_PATH;
    const originalSetInterval = global.setInterval;

    // Isolate
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-json-test-'));
    const testDbPath = path.join(tmpDir, 'test.db');
    process.env.CLASSROOM_DB_PATH = testDbPath;
    
    const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
    process.env.CLASSROOM_ADMIN_PASSWORD = 'test_password';

    // Prevent intervals
    global.setInterval = () => { return { unref: () => {} }; };

    let db;
    let app;
    let server;
    let originalDbRun;
    
    try {
        app = require('../backend/server.js');
        
        // Wait for migration
        db = require('../backend/database.js');
        if (db.scheduleMigrationPromise) {
            await db.scheduleMigrationPromise;
        }

        // Middleware Assertions
        const jsonMiddlewares = app._router.stack.filter(layer => 
            layer.name === 'jsonParser'
        );
        
        assert.strictEqual(jsonMiddlewares.length, 1, 'Exactly one JSON parser middleware should be registered');
        
        const jsonParserIndex = app._router.stack.findIndex(layer => layer.name === 'jsonParser');
        const firstRouteIndex = app._router.stack.findIndex(layer => layer.route || layer.name === 'router');
        
        // Assert jsonParser is before any routes
        // Wait, app._router.stack contains routes directly, or 'router' for express.Router() mount points.
        // Let's just make sure jsonParserIndex is found and it is less than firstRouteIndex if firstRouteIndex exists.
        assert.ok(jsonParserIndex !== -1, 'jsonParser layer should exist');
        if (firstRouteIndex !== -1) {
            assert.ok(jsonParserIndex < firstRouteIndex, 'JSON parser should be registered before any API routes');
        }

        // Real HTTP JSON parsing assertion
        originalDbRun = db.run;
        let dbRunCallCount = 0;
        let capturedSql = '';
        let capturedParams = [];

        db.run = function(sql, params, callback) {
            dbRunCallCount++;
            capturedSql = sql;
            capturedParams = params;
            // stub it successfully
            if (callback) callback.call({ changes: 1 }, null);
        };

        server = http.createServer(app);
        
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;

        const loginData = JSON.stringify({ password: 'test_password' });
        const loginOptions = {
            hostname: '127.0.0.1',
            port: port,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData),
                'Connection': 'close'
            }
        };

        const loginResData = await new Promise((resolve, reject) => {
            const req = http.request(loginOptions, (res) => {
                let setCookieHeader = res.headers['set-cookie'];
                let cookie = setCookieHeader ? setCookieHeader[0].split(';')[0] : null;
                res.on('data', () => {});
                res.on('end', () => {
                    resolve({ status: res.statusCode, cookie });
                });
            });
            req.on('error', reject);
            req.write(loginData);
            req.end();
        });

        assert.strictEqual(loginResData.status, 200, 'Login failed');

        const sessionResData = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: '/api/admin/session',
                method: 'GET',
                headers: { 'Cookie': loginResData.cookie, 'Connection': 'close' }
            }, (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    resolve({ status: res.statusCode, csrfToken: res.headers['x-csrf-token'] });
                });
            });
            req.on('error', reject);
            req.end();
        });
        
        assert.strictEqual(sessionResData.status, 200, 'Session fetch failed');
        assert.ok(sessionResData.csrfToken, 'CSRF token missing');

        const requestData = JSON.stringify({
            key: ' middleware_test_key ',
            value: 'middleware-test-value'
        });

        const reqOptions = {
            hostname: '127.0.0.1',
            port: port,
            path: '/api/settings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'Cookie': loginResData.cookie,
                'X-CSRF-Token': sessionResData.csrfToken,
                'Connection': 'close'
            }
        };

        const resData = await new Promise((resolve, reject) => {
            const req = http.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ status: res.statusCode, body: data });
                });
            });
            req.on('error', reject);
            req.write(requestData);
            req.end();
        });

        assert.strictEqual(resData.status, 200);
        assert.deepStrictEqual(JSON.parse(resData.body), { message: 'Ayarlar güncellendi' });
        assert.strictEqual(dbRunCallCount, 1);
        
        assert.strictEqual(
            capturedSql,
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        );
        assert.deepStrictEqual(
            capturedParams,
            ['middleware_test_key', 'middleware-test-value']
        );

    } finally {
        let firstError = null;

        if (originalDbRun && db) {
            db.run = originalDbRun;
        }

        if (server) {
            try {
                await new Promise((resolve, reject) => {
                    server.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } catch (err) {
                firstError = firstError || err;
            }
        }

        try {
            if (db && db.close) {
                await new Promise((resolve, reject) => {
                    db.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } catch (err) {
            firstError = firstError || err;
        }

        try {
            fs.unlinkSync(testDbPath);
        } catch (err) {
            if (err.code !== 'ENOENT') firstError = firstError || err;
        }
        try {
            fs.unlinkSync(testDbPath + '-journal');
        } catch (err) {
            if (err.code !== 'ENOENT') firstError = firstError || err;
        }
        try {
            fs.unlinkSync(testDbPath + '-wal');
        } catch (err) {
            if (err.code !== 'ENOENT') firstError = firstError || err;
        }
        try {
            fs.unlinkSync(testDbPath + '-shm');
        } catch (err) {
            if (err.code !== 'ENOENT') firstError = firstError || err;
        }

        try {
            fs.rmdirSync(tmpDir);
        } catch (err) {
            if (err.code !== 'ENOENT') firstError = firstError || err;
        }

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

        if (firstError) {
            throw firstError;
        }
    }
});
