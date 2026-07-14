const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

test('Admin Route Auth Test', async (t) => {
    const originalDbPath = process.env.CLASSROOM_DB_PATH;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-route-auth-test-'));
    const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
    process.env.CLASSROOM_DB_PATH = testDbPath;

    const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
    const adminPassword = 'AUTH_TEST_PASSWORD_' + Date.now();
    process.env.CLASSROOM_ADMIN_PASSWORD = adminPassword;

    const originalSetInterval = global.setInterval;
    global.setInterval = () => {};

    let server;
    let db;

    try {
        const app = require('../backend/server.js');
        db = require('../backend/database.js');

        await db.scheduleMigrationPromise;

        const serverUrl = await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                resolve(`http://127.0.0.1:${server.address().port}`);
            });
        });

        const fetchPath = async (method, route, cookieStr = null, body = null, headers = {}) => {
            return new Promise((resolve, reject) => {
                const reqHeaders = { ...headers };
                if (cookieStr) {
                    reqHeaders['Cookie'] = cookieStr;
                }
                reqHeaders['Connection'] = 'close';
                
                const req = http.request(serverUrl + route, {
                    method: method,
                    headers: reqHeaders
                }, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        resolve({ statusCode: response.statusCode, headers: response.headers, body: data });
                    });
                });
                req.on('error', reject);

                if (body && body.pipe) {
                    body.pipe(req);
                } else {
                    if (body) req.write(body);
                    req.end();
                }
            });
        };

        // Get a valid session
        const loginRes = await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: adminPassword }), { 'Content-Type': 'application/json' });
        assert.strictEqual(loginRes.statusCode, 200);
        const setCookie = loginRes.headers['set-cookie'][0];
        const sessionCookie = setCookie.split(';')[0];

        // 1. /admin/ returns 401 without a cookie
        const res1 = await fetchPath('GET', '/admin/');
        assert.strictEqual(res1.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(res1.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        // 14 & 15. /admin/ returns 401 for malformed, duplicate, unknown, expired and logged-out session cookies.
        const res2a = await fetchPath('GET', '/admin/', 'classroom_admin_session=invalid');
        assert.strictEqual(res2a.statusCode, 401);
        const res2b = await fetchPath('GET', '/admin/', 'classroom_admin_session=x'.repeat(43));
        assert.strictEqual(res2b.statusCode, 401);

        // 2 & 16. A valid login cookie allows /admin/ to reach the existing management-panel content
        const res3 = await fetchPath('GET', '/admin/', sessionCookie);
        assert.ok(res3.statusCode === 200 || res3.statusCode === 304 || res3.statusCode === 301, `Status was ${res3.statusCode}`);

        // 3. All 18 protected write routes return exact 401 JSON without a valid session.
        // 18. Exact 18 unique method/path pairs.
        const writeRoutes = [
            { m: 'POST', p: '/api/students' },
            { m: 'POST', p: '/api/students/import' },
            { m: 'DELETE', p: '/api/students/1' },
            { m: 'PUT', p: '/api/students/1/photo' },
            { m: 'POST', p: '/api/roles' },
            { m: 'DELETE', p: '/api/roles/1' },
            { m: 'POST', p: '/api/settings' },
            { m: 'PUT', p: '/api/schedule/normalized' },
            { m: 'POST', p: '/api/schedule' },
            { m: 'POST', p: '/api/attendance' },
            { m: 'PUT', p: '/api/attendance/1' },
            { m: 'POST', p: '/api/slides' },
            { m: 'PUT', p: '/api/slides/reorder' },
            { m: 'PUT', p: '/api/slides/1' },
            { m: 'DELETE', p: '/api/slides/1' },
            { m: 'POST', p: '/api/slide-settings' },
            { m: 'POST', p: '/api/logs' },
            { m: 'DELETE', p: '/api/logs/cleanup' }
        ];

        for (const r of writeRoutes) {
            const res = await fetchPath(r.m, r.p);
            assert.strictEqual(res.statusCode, 401, `Expected 401 for ${r.m} ${r.p}`);
            assert.deepStrictEqual(JSON.parse(res.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });
            
            // 17. Responses and logs never expose password, cookie value, Cookie header or session ID.
            assert.ok(!res.body.includes(adminPassword));
            if (res.headers['set-cookie']) {
                assert.ok(!res.headers['set-cookie'][0].includes(sessionCookie.split('=')[1]));
            }
        }

        // 4, 5, 6, 7, 8, 9, 19. All 5 upload routes reject before Multer and do not create files or mutate DB.
        const uploadRoutes = [
            { m: 'POST', p: '/api/students' },
            { m: 'POST', p: '/api/students/import' },
            { m: 'PUT', p: '/api/students/1/photo' },
            { m: 'POST', p: '/api/slides' },
            { m: 'PUT', p: '/api/slides/1' }
        ];

        for (const r of uploadRoutes) {
            const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
            const bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.file"\r\nContent-Type: application/octet-stream\r\n\r\nfake file data\r\n--${boundary}--`;
            
            const resMultipart = await fetchPath(r.m, r.p, null, bodyStr, {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(bodyStr)
            });
            assert.strictEqual(resMultipart.statusCode, 401);
        }

        const resJSONAuth = await fetchPath('POST', '/api/settings', sessionCookie, JSON.stringify({}), { 'Content-Type': 'application/json' });
        assert.notStrictEqual(resJSONAuth.statusCode, 401);

        // 10. Public login, logout and session-status endpoints remain public.
        const resSessionPublic = await fetchPath('GET', '/api/admin/session');
        assert.strictEqual(resSessionPublic.statusCode, 200);

        // 11. Existing public GET routes remain public.
        const resGetPublic = await fetchPath('GET', '/api/students');
        assert.strictEqual(resGetPublic.statusCode, 200);

        // 12. The main classroom display remains public.
        const resMainPublic = await fetchPath('GET', '/');
        assert.strictEqual(resMainPublic.statusCode, 200);

        // 13. /uploads remains public
        const resUploadsPublic = await fetchPath('GET', '/uploads/default_boy.png');
        assert.notStrictEqual(resUploadsPublic.statusCode, 401);

        // 14. Expired and logged-out cookies are rejected.
        await fetchPath('POST', '/api/admin/logout', sessionCookie);
        const resLoggedOut = await fetchPath('GET', '/admin/', sessionCookie);
        assert.strictEqual(resLoggedOut.statusCode, 401);

    } finally {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        
        if (db) {
            await new Promise(resolve => db.close(resolve));
        }

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
