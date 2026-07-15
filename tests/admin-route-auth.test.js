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

    const originalDateNow = Date.now;
    let mockedTime = originalDateNow();
    global.Date.now = () => mockedTime;

    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    let capturedLogs = '';
    const captureLog = (string) => {
        capturedLogs += string;
    };

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

        // Helper to count rows
        const countRows = (table) => new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Helper to get dir snapshot
        const getDirSnapshot = (dirPath) => {
            try {
                return fs.readdirSync(dirPath);
            } catch (e) {
                return [];
            }
        };

        // Get a valid session
        const loginRes = await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: adminPassword }), { 'Content-Type': 'application/json' });
        assert.strictEqual(loginRes.statusCode, 200);
        const setCookie = loginRes.headers['set-cookie'][0];
        const sessionCookie = setCookie.split(';')[0];
        const sessionId = sessionCookie.split('=')[1];

        // 1. A valid cookie serves the existing /admin/ page.
        const resValid = await fetchPath('GET', '/admin/', sessionCookie);
        assert.ok(resValid.statusCode === 200 || resValid.statusCode === 304 || resValid.statusCode === 301, `Status was ${resValid.statusCode}`);

        // 1b. Both /admin and /admin/ return 401 without cookie
        const resAdminSlash = await fetchPath('GET', '/admin/');
        assert.strictEqual(resAdminSlash.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resAdminSlash.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        const resAdminNoSlash = await fetchPath('GET', '/admin');
        assert.strictEqual(resAdminNoSlash.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resAdminNoSlash.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        // 1c. HTML navigation to /admin and /admin/ redirects to the login page
        const resAdminSlashHtml = await fetchPath('GET', '/admin/', null, null, { 'Accept': 'text/html' });
        assert.strictEqual(resAdminSlashHtml.statusCode, 302);
        assert.strictEqual(resAdminSlashHtml.headers['location'], '/admin-login.html?next=/admin/');

        const resAdminNoSlashHtml = await fetchPath('GET', '/admin', null, null, { 'Accept': 'text/html' });
        assert.strictEqual(resAdminNoSlashHtml.statusCode, 302);
        assert.strictEqual(resAdminNoSlashHtml.headers['location'], '/admin-login.html?next=/admin/');

        // 2. Malformed cookie returns exact 401 JSON
        const resMalformed = await fetchPath('GET', '/admin/', 'classroom_admin_session=invalid');
        assert.strictEqual(resMalformed.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resMalformed.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        // 3. A valid-format but unknown 43-character session ID returns exact 401 JSON
        const resUnknownValidFormat = await fetchPath('GET', '/admin/', 'classroom_admin_session=' + 'x'.repeat(43));
        assert.strictEqual(resUnknownValidFormat.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resUnknownValidFormat.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        // 4. Duplicate-cookie test must use two separately logged-in, active session cookies in the same header.
        const loginResOther = await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: adminPassword }), { 'Content-Type': 'application/json' });
        const sessionCookieOther = loginResOther.headers['set-cookie'][0].split(';')[0];
        const duplicateCookie = `${sessionCookie}; ${sessionCookieOther}`;
        const resDuplicate = await fetchPath('GET', '/admin/', duplicateCookie);
        assert.strictEqual(resDuplicate.statusCode, 401, `Expected 401 with duplicate cookie, got ${resDuplicate.statusCode}`);

        // 5. Log out a separate valid session and prove its old cookie returns 401.
        const loginResTemp = await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: adminPassword }), { 'Content-Type': 'application/json' });
        const sessionCookieTemp = loginResTemp.headers['set-cookie'][0].split(';')[0];
        await fetchPath('POST', '/api/admin/logout', sessionCookieTemp);
        const resTempLogOut = await fetchPath('GET', '/admin/', sessionCookieTemp);
        assert.strictEqual(resTempLogOut.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resTempLogOut.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });

        const resTempLogOutHtml = await fetchPath('GET', '/admin/', sessionCookieTemp, null, { 'Accept': 'text/html' });
        assert.strictEqual(resTempLogOutHtml.statusCode, 302);
        assert.strictEqual(resTempLogOutHtml.headers['location'], '/admin-login.html?next=/admin/');

        // 6. Prove these remain public
        const publicRoutes = [
            { m: 'POST', p: '/api/admin/login', body: JSON.stringify({ password: 'wrong' }), headers: { 'Content-Type': 'application/json' } },
            { m: 'POST', p: '/api/admin/logout' },
            { m: 'GET', p: '/api/admin/session' },
            { m: 'GET', p: '/api/students' },
            { m: 'GET', p: '/api/schedule' },
            { m: 'GET', p: '/api/schedule/normalized' },
            { m: 'GET', p: '/' },
            { m: 'GET', p: '/admin-login.html' },
            { m: 'GET', p: '/uploads/nonexistent-public-probe' }
        ];
        for (const pr of publicRoutes) {
            const resPub = await fetchPath(pr.m, pr.p, null, pr.body, pr.headers);
            if (pr.p === '/api/admin/login') {
                assert.strictEqual(resPub.statusCode, 401, `Expected 401 Invalid Password for ${pr.m} ${pr.p}`);
                assert.deepStrictEqual(JSON.parse(resPub.body), { authenticated: false, message: 'Parola hatalı.' });
            } else {
                assert.notStrictEqual(resPub.statusCode, 401, `Expected public access for ${pr.m} ${pr.p}`);
            }
        }

        // 3. Expired session TTL
        mockedTime += (8 * 60 * 60 * 1000) + 1; // Advance 8 hours + 1 ms
        const resExpired = await fetchPath('GET', '/admin/', sessionCookie);
        assert.strictEqual(resExpired.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resExpired.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });
        mockedTime -= ((8 * 60 * 60 * 1000) + 1); // Revert time so rest of tests work with session

        // Re-login because hasSession() deleted the expired session from the store!
        const loginRes2 = await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: adminPassword }), { 'Content-Type': 'application/json' });
        assert.strictEqual(loginRes2.statusCode, 200);
        const setCookie2 = loginRes2.headers['set-cookie'][0];
        const sessionCookie2 = setCookie2.split(';')[0];
        const sessionId2 = sessionCookie2.split('=')[1];

        // 7. Exactly 18 routes
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

        // Deduplicate to ensure 18 unique method/path pairs
        const uniqueRoutes = new Set(writeRoutes.map(r => r.m + ' ' + r.p));
        assert.strictEqual(uniqueRoutes.size, 18, 'writeRoutes array must contain exactly 18 unique method/path pairs');
        assert.strictEqual(writeRoutes.length, 18);

        // Capture logs during protected routes checks
        process.stdout.write = captureLog;
        process.stderr.write = captureLog;

        const distinctiveBadPassword = 'DISTINCTIVE_BAD_PASSWORD_999';
        await fetchPath('POST', '/api/admin/login', null, JSON.stringify({ password: distinctiveBadPassword }), { 'Content-Type': 'application/json' });

        const unknownValidId = 'U'.repeat(43);
        const distinctiveUnknownSession = 'classroom_admin_session=' + unknownValidId;
        await fetchPath('GET', '/admin/', distinctiveUnknownSession);

        for (const r of writeRoutes) {
            const res = await fetchPath(r.m, r.p);
            assert.strictEqual(res.statusCode, 401, `Expected 401 for ${r.m} ${r.p}`);
            assert.deepStrictEqual(JSON.parse(res.body), { authenticated: false, message: 'Yönetici oturumu gerekli.' });
            
            assert.ok(!res.body.includes(adminPassword));
            if (res.headers['set-cookie']) {
                assert.ok(!res.headers['set-cookie'][0].includes(sessionId2));
            }
        }

        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;

        // 9. Assert captured logs do not contain password or session id
        assert.ok(!capturedLogs.includes(adminPassword), "Logs should not contain admin password");
        assert.ok(!capturedLogs.includes(sessionCookie2), "Logs should not contain full cookie");
        assert.ok(!capturedLogs.includes(sessionId2), "Logs should not contain session ID");

        assert.ok(!capturedLogs.includes(distinctiveBadPassword), "Logs should not contain distinctive bad password");
        assert.ok(!capturedLogs.includes(unknownValidId), "Logs should not contain distinctive unknown session ID");
        assert.ok(!capturedLogs.includes(distinctiveUnknownSession), "Logs should not contain distinctive unknown cookie header");

        // 4, 5, 6, 8. Upload routes
        const uploadRoutes = [
            { m: 'POST', p: '/api/students', field: 'photo' },
            { m: 'POST', p: '/api/students/import', field: 'excel' },
            { m: 'PUT', p: '/api/students/1/photo', field: 'photo' },
            { m: 'POST', p: '/api/slides', field: 'slide' },
            { m: 'PUT', p: '/api/slides/1', field: 'slide' }
        ];

        const uniqueUploadRoutes = new Set(uploadRoutes.map(r => r.m + ' ' + r.p));
        assert.strictEqual(uniqueUploadRoutes.size, 5, 'uploadRoutes array must contain exactly 5 unique method/path pairs');
        assert.strictEqual(uploadRoutes.length, 5);

        const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');
        const slidesDir = path.join(uploadsDir, 'slides');

        for (const r of uploadRoutes) {
            const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
            const bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="${r.field}"; filename="test.file"\r\nContent-Type: application/octet-stream\r\n\r\nfake file data\r\n--${boundary}--`;

            const beforeUploads = getDirSnapshot(uploadsDir);
            const beforeSlides = getDirSnapshot(slidesDir);

            let initialDbCount = 0;
            if (r.p.includes('/students')) {
                initialDbCount = await countRows('students');
            } else if (r.p.includes('/slides')) {
                initialDbCount = await countRows('slides');
            }

            const resMultipart = await fetchPath(r.m, r.p, null, bodyStr, {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(bodyStr)
            });
            assert.strictEqual(resMultipart.statusCode, 401);

            const afterUploads = getDirSnapshot(uploadsDir);
            const afterSlides = getDirSnapshot(slidesDir);
            assert.deepStrictEqual(beforeUploads, afterUploads, `Uploads dir mutated on unauth ${r.m} ${r.p}`);
            assert.deepStrictEqual(beforeSlides, afterSlides, `Slides dir mutated on unauth ${r.m} ${r.p}`);

            if (r.p.includes('/students')) {
                assert.strictEqual(await countRows('students'), initialDbCount, "Students count mutated");
            } else if (r.p.includes('/slides')) {
                assert.strictEqual(await countRows('slides'), initialDbCount, "Slides count mutated");
            }
        }

        // 10. Preserve valid-session representative write-route test
        const resJSONAuth = await fetchPath('POST', '/api/settings', sessionCookie2, JSON.stringify({}), { 'Content-Type': 'application/json' });
        assert.notStrictEqual(resJSONAuth.statusCode, 401);

    } finally {
        global.Date.now = originalDateNow;
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;

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
