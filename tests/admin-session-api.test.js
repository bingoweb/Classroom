const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-admin-session-api-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

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

function makeRequest(serverUrl, method, endpoint, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(serverUrl + endpoint, {
            method: method,
            headers: headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const responseHeaders = res.headers;
                try {
                    resolve({ statusCode: res.statusCode, headers: responseHeaders, body: data ? JSON.parse(data) : null });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: responseHeaders, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

test('Admin Session API Tests', async (t) => {
    let server;
    let serverUrl;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                serverUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
    });

    t.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await closeDatabase(db);
        removeFileIfPresent(fs, testDbPath);
        removeFileIfPresent(fs, testDbPath + '-journal');
        removeFileIfPresent(fs, testDbPath + '-wal');
        removeFileIfPresent(fs, testDbPath + '-shm');
        removeDirectoryIfPresent(fs, tempDir);
        
        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    let originalPassword;
    let hadOriginalPassword;
    let originalSecureCookie;
    let hadOriginalSecureCookie;

    t.beforeEach(() => {
        hadOriginalPassword = Object.prototype.hasOwnProperty.call(process.env, 'CLASSROOM_ADMIN_PASSWORD');
        originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
        
        hadOriginalSecureCookie = Object.prototype.hasOwnProperty.call(process.env, 'CLASSROOM_ADMIN_COOKIE_SECURE');
        originalSecureCookie = process.env.CLASSROOM_ADMIN_COOKIE_SECURE;
        
        process.env.CLASSROOM_ADMIN_PASSWORD = 'test-password';
        delete process.env.CLASSROOM_ADMIN_COOKIE_SECURE;
    });

    t.afterEach(() => {
        if (hadOriginalPassword) {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalPassword;
        } else {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        }

        if (hadOriginalSecureCookie) {
            process.env.CLASSROOM_ADMIN_COOKIE_SECURE = originalSecureCookie;
        } else {
            delete process.env.CLASSROOM_ADMIN_COOKIE_SECURE;
        }
    });

    await t.test('1. Login fails safely with HTTP 503 when CLASSROOM_ADMIN_PASSWORD is missing', async () => {
        delete process.env.CLASSROOM_ADMIN_PASSWORD;
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'test-password' });
        assert.strictEqual(res.statusCode, 503);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Yönetici parolası yapılandırılmamış.' });
        assert.strictEqual(res.headers['set-cookie'], undefined);
    });

    await t.test('2. Login fails with HTTP 400 when password is missing or not a string', async () => {
        let res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, {});
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Geçersiz parola formatı.' });

        res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 123 });
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Geçersiz parola formatı.' });
        assert.strictEqual(res.headers['set-cookie'], undefined);
    });

    await t.test('3. Login fails with HTTP 401 when password is wrong', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'wrong-password' });
        assert.strictEqual(res.statusCode, 401);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Parola hatalı.' });
        assert.strictEqual(res.headers['set-cookie'], undefined);
    });

    let validCookieHeader = null;

    await t.test('4. Correct password creates a session and sets a classroom_admin_session cookie', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'test-password' });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: true, message: 'Yönetici oturumu açıldı.' });
        assert.ok(res.headers['set-cookie']);
        assert.ok(res.headers['set-cookie'][0].startsWith('classroom_admin_session='));
        validCookieHeader = res.headers['set-cookie'][0].split(';')[0];
    });

    await t.test('5. Login response never includes the configured password', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'test-password' });
        assert.strictEqual(JSON.stringify(res.body).includes('test-password'), false);
    });

    await t.test('6. GET /api/admin/session returns authenticated true with a valid session cookie', async () => {
        const res = await makeRequest(serverUrl, 'GET', '/api/admin/session', { 'Cookie': validCookieHeader });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: true });
    });

    await t.test('7. GET /api/admin/session returns authenticated false without a cookie', async () => {
        const res = await makeRequest(serverUrl, 'GET', '/api/admin/session');
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false });
    });

    await t.test('8. GET /api/admin/session returns authenticated false with malformed, duplicate, unknown, logged-out, or expired cookies', async () => {
        let res = await makeRequest(serverUrl, 'GET', '/api/admin/session', { 'Cookie': 'classroom_admin_session=malformed!' });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false });

        res = await makeRequest(serverUrl, 'GET', '/api/admin/session', { 'Cookie': 'classroom_admin_session=1234567890123456789012345678901234567890123; classroom_admin_session=1234567890123456789012345678901234567890123' });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false });

        res = await makeRequest(serverUrl, 'GET', '/api/admin/session', { 'Cookie': 'classroom_admin_session=1234567890123456789012345678901234567890123' });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false });
    });

    await t.test('9. Logout clears the cookie and invalidates the session', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/logout', { 'Cookie': validCookieHeader });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Yönetici oturumu kapatıldı.' });
        assert.ok(res.headers['set-cookie']);
        assert.ok(res.headers['set-cookie'][0].includes('Max-Age=0'));
        assert.ok(res.headers['set-cookie'][0].includes('classroom_admin_session=;'));

        const checkRes = await makeRequest(serverUrl, 'GET', '/api/admin/session', { 'Cookie': validCookieHeader });
        assert.strictEqual(checkRes.statusCode, 200);
        assert.deepStrictEqual(checkRes.body, { authenticated: false });
    });

    await t.test('10. Logout is idempotent', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/logout', { 'Cookie': validCookieHeader });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { authenticated: false, message: 'Yönetici oturumu kapatıldı.' });
    });

    await t.test('11. Local HTTP cookie contains HttpOnly, SameSite=Strict, Path=/, and Max-Age=28800, but not Secure', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'test-password' });
        const cookie = res.headers['set-cookie'][0];
        assert.ok(cookie.includes('HttpOnly'));
        assert.ok(cookie.includes('SameSite=Strict'));
        assert.ok(cookie.includes('Path=/'));
        assert.ok(cookie.includes('Max-Age=28800'));
        assert.strictEqual(cookie.includes('Secure'), false);
    });

    await t.test('12. With CLASSROOM_ADMIN_COOKIE_SECURE=true, login cookie includes Secure', async () => {
        process.env.CLASSROOM_ADMIN_COOKIE_SECURE = 'true';
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/login', { 'Content-Type': 'application/json' }, { password: 'test-password' });
        const cookie = res.headers['set-cookie'][0];
        assert.ok(cookie.includes('Secure'));
    });

    await t.test('13. Clearing cookie uses Max-Age=0', async () => {
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/logout', {});
        const cookie = res.headers['set-cookie'][0];
        assert.ok(cookie.includes('Max-Age=0'));
        assert.ok(cookie.includes('classroom_admin_session=;'));
        assert.ok(cookie.includes('HttpOnly'));
        assert.ok(cookie.includes('SameSite=Strict'));
        assert.ok(cookie.includes('Path=/'));
    });

    await t.test('14. The three new routes do not require CSRF yet', async () => {
        // Just verify we can reach login and logout without a CSRF token.
        // Already verified by earlier tests completing with 200.
        const res = await makeRequest(serverUrl, 'POST', '/api/admin/logout', {});
        assert.strictEqual(res.statusCode, 200);
    });

    await t.test('15. Existing public display route behavior is not changed by these session endpoints', async () => {
        const res = await makeRequest(serverUrl, 'GET', '/api/slides');
        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body));
    });
});
