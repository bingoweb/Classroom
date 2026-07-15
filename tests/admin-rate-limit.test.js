'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-rate-limit-test-'));
const dbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = dbPath;

const originalAdminPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
process.env.CLASSROOM_ADMIN_PASSWORD = 'test_password';

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

let fakeTime = 1000000000000;
const originalDateNow = Date.now;
Date.now = () => fakeTime;

const app = require('../backend/server');
const dbModule = require('../backend/database');
const db = dbModule.db || dbModule;

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err && err.message !== 'SQLITE_MISUSE: Database handle is closed') {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function removeFileIfPresent(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function removeDirectoryIfPresent(directoryPath) {
    try {
        fs.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function makeRequest(serverUrl, path, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(path, serverUrl);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Connection': 'close',
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

test('Admin Rate Limit Tests', async (t) => {
    let server;
    let serverUrl;

    try {
        await new Promise((resolve, reject) => {
            server = app.listen(0, '127.0.0.1', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        const address = server.address();
        serverUrl = `http://127.0.0.1:${address.port}`;

        let validSessionCookie = null;

        await t.test('Test A - existing non-counted login failures', async () => {
            // Missing configuration (503)
            process.env.CLASSROOM_ADMIN_PASSWORD = '';
            const res1 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'test_password' })
            });
            assert.strictEqual(res1.statusCode, 503);
            process.env.CLASSROOM_ADMIN_PASSWORD = 'test_password';

            // Malformed password data (400)
            const res2 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pass: 'wrong' })
            });
            assert.strictEqual(res2.statusCode, 400);
        });

        await t.test('Test B - failed login threshold', async () => {
            // wrong attempts 1 through 5
            for (let i = 1; i <= 5; i++) {
                const res = await makeRequest(serverUrl, '/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.0.${i}` },
                    body: JSON.stringify({ password: 'wrong' })
                });
                assert.strictEqual(res.statusCode, 401);
                const data = JSON.parse(res.data);
                assert.deepEqual(data, { authenticated: false, message: 'Parola hatalı.' });
                assert.ok(!res.headers['set-cookie']);
            }

            // 6th attempt should fail with 429 even with correct password (guard before password check)
            const res6 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.6' },
                body: JSON.stringify({ password: 'test_password' })
            });
            assert.strictEqual(res6.statusCode, 429);
            const data6 = JSON.parse(res6.data);
            assert.deepEqual(data6, { authenticated: false, message: "Çok fazla başarısız giriş denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin." });
            assert.ok(parseInt(res6.headers['retry-after'], 10) > 0);
            assert.strictEqual(res6.headers['cache-control'], 'no-store');
        });

        await t.test('Test C - login reset', async () => {
            // Advance time by 15 mins + 1ms
            fakeTime += (15 * 60 * 1000) + 1;

            // One wrong attempt -> 401
            const res1 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'wrong' })
            });
            assert.strictEqual(res1.statusCode, 401);

            // Correct login succeeds and clears
            const res2 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'test_password' })
            });
            assert.strictEqual(res2.statusCode, 200);
            validSessionCookie = res2.headers['set-cookie'][0].split(';')[0];

            // Next 5 wrong attempts return 401
            for (let i = 1; i <= 5; i++) {
                const res = await makeRequest(serverUrl, '/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: 'wrong' })
                });
                assert.strictEqual(res.statusCode, 401);
            }

            // 6th returns 429
            const res6 = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'wrong' })
            });
            assert.strictEqual(res6.statusCode, 429);
        });

        let session2Cookie = null;
        let session1Csrf = null;
        let session2Csrf = null;

        await t.test('Test D - session independence for writes', async () => {
            fakeTime += (15 * 60 * 1000) + 1;
            const res = await makeRequest(serverUrl, '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'test_password' })
            });
            assert.strictEqual(res.statusCode, 200);
            session2Cookie = res.headers['set-cookie'][0].split(';')[0];

            const csrfRes1 = await makeRequest(serverUrl, '/api/admin/session', {
                headers: { 'Cookie': validSessionCookie }
            });
            session1Csrf = csrfRes1.headers['x-csrf-token'];
            
            const csrfRes2 = await makeRequest(serverUrl, '/api/admin/session', {
                headers: { 'Cookie': session2Cookie }
            });
            session2Csrf = csrfRes2.headers['x-csrf-token'];

            assert.ok(session1Csrf);
            assert.ok(session2Csrf);
            assert.notStrictEqual(session1Csrf, session2Csrf);
        });

        await t.test('Test E - exact middleware order', async () => {
            const routes = app._router.stack.filter(l => l.route).map(l => l.route);
            const protectedRoutes = routes.filter(r => 
                r.stack.some(layer => layer.name === 'requireAdminSession')
            );
            
            const writeRoutes = protectedRoutes.filter(r => 
                r.path !== '/api/admin/login' && 
                r.path !== '/api/admin/logout' && 
                r.path !== '/api/admin/session' &&
                (r.methods.post || r.methods.put || r.methods.delete)
            );

            assert.strictEqual(writeRoutes.length, 18);

            const logReadRoute = protectedRoutes.find(r => r.path === '/api/logs' && r.methods.get);
            assert.ok(logReadRoute, 'GET /api/logs must be a protected read route');
            const logReadNames = logReadRoute.stack.map(layer => layer.name);
            assert.strictEqual(logReadNames[0], 'requireAdminSession', 'GET /api/logs must start with requireAdminSession');
            assert.ok(!logReadNames.includes('requireCsrfToken'), 'GET /api/logs must not have CSRF protection');
            assert.ok(!logReadNames.includes('middleware'), 'GET /api/logs must not have write rate limiting');

            let uploadCount = 0;

            for (const r of writeRoutes) {
                const names = r.stack.map(layer => layer.name);
                assert.strictEqual(names[0], 'requireAdminSession');
                assert.strictEqual(names[1], 'requireCsrfToken');
                assert.strictEqual(names[2], 'middleware'); // createRequestRateLimiter returns 'middleware'
                
                const hasMulter = names.includes('multerMiddleware');
                if (hasMulter) {
                    uploadCount++;
                    const multerIndex = names.indexOf('multerMiddleware');
                    assert.ok(multerIndex > 2, 'Multer should be after rate limiting');
                }
            }
            assert.strictEqual(uploadCount, 5);
        });

        await t.test('Test F - write threshold', async () => {
            // We use POST /api/settings which requires valid formatting but will harmlessly fail
            // or succeed without breaking things if given valid structure.
            // Actually DELETE /api/slides/999999 is side-effect-free since it won't find it.
            for (let i = 1; i <= 60; i++) {
                const res = await makeRequest(serverUrl, '/api/slides/999999', {
                    method: 'DELETE',
                    headers: {
                        'Cookie': validSessionCookie,
                        'x-csrf-token': session1Csrf
                    }
                });
                assert.notStrictEqual(res.statusCode, 429);
            }

            const res61 = await makeRequest(serverUrl, '/api/slides/999999', {
                method: 'DELETE',
                headers: {
                    'Cookie': validSessionCookie,
                    'x-csrf-token': session1Csrf
                }
            });
            assert.strictEqual(res61.statusCode, 429);
            const data = JSON.parse(res61.data);
            assert.deepEqual(data, { error: "Çok fazla yönetici işlemi yapıldı. Lütfen kısa bir süre sonra tekrar deneyin." });
            assert.ok(parseInt(res61.headers['retry-after'], 10) > 0);
            assert.strictEqual(res61.headers['cache-control'], 'no-store');
        });

        await t.test('Test G - second session unaffected', async () => {
            const res = await makeRequest(serverUrl, '/api/slides/999999', {
                method: 'DELETE',
                headers: {
                    'Cookie': session2Cookie,
                    'x-csrf-token': session2Csrf
                }
            });
            assert.notStrictEqual(res.statusCode, 429);
        });

        await t.test('Test H - window reset', async () => {
            fakeTime += (60 * 1000) + 1;
            const res = await makeRequest(serverUrl, '/api/slides/999999', {
                method: 'DELETE',
                headers: {
                    'Cookie': validSessionCookie,
                    'x-csrf-token': session1Csrf
                }
            });
            assert.notStrictEqual(res.statusCode, 429);
        });

        await t.test('Test I - public and rejected traffic remain unaffected', async () => {
            // Public GET
            for (let i = 0; i < 65; i++) {
                const res = await makeRequest(serverUrl, '/api/students');
                assert.strictEqual(res.statusCode, 200);
            }

            // Unauthenticated protected write (401)
            const res401 = await makeRequest(serverUrl, '/api/slides/999999', {
                method: 'DELETE'
            });
            assert.strictEqual(res401.statusCode, 401);
            assert.deepEqual(JSON.parse(res401.data), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

            // Authenticated write without CSRF (403)
            const res403 = await makeRequest(serverUrl, '/api/slides/999999', {
                method: 'DELETE',
                headers: {
                    'Cookie': validSessionCookie
                }
            });
            assert.strictEqual(res403.statusCode, 403);
            assert.deepEqual(JSON.parse(res403.data), { error: 'CSRF doğrulaması başarısız.' });

            // Login status unaffected
            const resStatus = await makeRequest(serverUrl, '/api/admin/session', {
                headers: { 'Cookie': validSessionCookie }
            });
            assert.strictEqual(resStatus.statusCode, 200);
        });

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        await closeDatabase(db);
        removeFileIfPresent(dbPath);
        removeFileIfPresent(dbPath + '-journal');
        removeFileIfPresent(dbPath + '-wal');
        removeFileIfPresent(dbPath + '-shm');
        removeDirectoryIfPresent(tempDir);

        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }

        if (originalAdminPassword === undefined) {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        } else {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalAdminPassword;
        }

        global.setInterval = originalSetInterval;
        Date.now = originalDateNow;
    }
});
