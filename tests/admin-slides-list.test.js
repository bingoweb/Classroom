const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-admin-slides-list-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;
process.env.CLASSROOM_ADMIN_PASSWORD = 'admin-slides-test-password';

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { Logger } = require('../backend/logger.js');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => err ? reject(err) : resolve());
    });
}

function makeRequest(serverUrl, method, endpoint, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(serverUrl + endpoint, { method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = data ? JSON.parse(data) : null;
                } catch (_) {}
                resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (body !== null) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

test('Admin Slides Management List', async (t) => {
    let server;
    let serverUrl;
    let adminCookie;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await run(`
            INSERT INTO slides (
                title, content_type, media_type, media_path, display_order, is_active, is_fallback
            ) VALUES (?, 'photo', 'image', ?, ?, ?, 0)
        `, ['Admin Pasif', 'backend\\uploads\\slides\\inactive.jpg', 900, 0]);

        await run(`
            INSERT INTO slides (
                title, content_type, media_type, media_path, display_order, is_active, is_fallback
            ) VALUES (?, 'photo', 'image', ?, ?, ?, 0)
        `, ['Admin Aktif', 'backend\\uploads\\slides\\active.jpg', 901, 1]);

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                serverUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
    });

    t.after(async () => {
        if (server) await new Promise(resolve => server.close(resolve));
        await closeDatabase(db);
        fs.rmSync(tempDir, { recursive: true, force: true });
        global.setInterval = originalSetInterval;

        if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
        else process.env.CLASSROOM_DB_PATH = originalDbPath;

        if (originalPassword === undefined) delete process.env.CLASSROOM_ADMIN_PASSWORD;
        else process.env.CLASSROOM_ADMIN_PASSWORD = originalPassword;
    });

    await t.test('1. GET /api/admin/slides rejects unauthenticated access', async () => {
        const response = await makeRequest(serverUrl, 'GET', '/api/admin/slides');
        assert.strictEqual(response.statusCode, 401);
        assert.deepStrictEqual(response.body, {
            authenticated: false,
            message: 'Yönetici oturumu gerekli.'
        });
    });

    await t.test('2. login creates the admin session used by the management list', async () => {
        const response = await makeRequest(
            serverUrl,
            'POST',
            '/api/admin/login',
            { 'Content-Type': 'application/json' },
            { username: 'admin', password: 'admin-slides-test-password' }
        );
        assert.strictEqual(response.statusCode, 200);
        assert.ok(response.headers['set-cookie']);
        adminCookie = response.headers['set-cookie'][0].split(';')[0];
    });

    await t.test('3. authenticated management list returns active and inactive slides in display order', async () => {
        const response = await makeRequest(serverUrl, 'GET', '/api/admin/slides', { Cookie: adminCookie });
        assert.strictEqual(response.statusCode, 200);
        assert.ok(Array.isArray(response.body));

        const customSlides = response.body.filter(row => ['Admin Pasif', 'Admin Aktif'].includes(row.title));
        assert.deepStrictEqual(customSlides.map(row => row.title), ['Admin Pasif', 'Admin Aktif']);
        assert.deepStrictEqual(customSlides.map(row => row.is_active), [0, 1]);
        assert.deepStrictEqual(customSlides.map(row => row.display_order), [900, 901]);
    });

    await t.test('4. management list normalizes managed media paths', async () => {
        const response = await makeRequest(serverUrl, 'GET', '/api/admin/slides', { Cookie: adminCookie });
        assert.strictEqual(response.statusCode, 200);

        const inactiveSlide = response.body.find(row => row.title === 'Admin Pasif');
        const activeSlide = response.body.find(row => row.title === 'Admin Aktif');
        assert.strictEqual(inactiveSlide.media_path, '/uploads/slides/inactive.jpg');
        assert.strictEqual(activeSlide.media_path, '/uploads/slides/active.jpg');
    });

    await t.test('5. database errors are logged but redacted from the HTTP response', async () => {
        const originalDbAll = db.all;
        const originalLoggerError = Logger.prototype.error;
        const secretMarker = 'ADMIN_SLIDES_DB_SECRET_' + crypto.randomBytes(4).toString('hex');
        const dbError = new Error(secretMarker);
        let loggedError = null;
        let loggedContext = null;

        db.all = (sql, params, cb) => cb(dbError);
        Logger.prototype.error = function(component, message, error, context) {
            loggedError = error;
            loggedContext = context;
        };

        try {
            const response = await makeRequest(serverUrl, 'GET', '/api/admin/slides', { Cookie: adminCookie });
            assert.strictEqual(response.statusCode, 500);
            assert.deepStrictEqual(response.body, { error: 'Slayt bilgileri alınırken hata oluştu' });
            assert.strictEqual(JSON.stringify(response.body).includes(secretMarker), false);
            assert.strictEqual(loggedError, dbError);
            assert.strictEqual(loggedContext.endpoint, '/api/admin/slides');
        } finally {
            db.all = originalDbAll;
            Logger.prototype.error = originalLoggerError;
        }
    });
});
