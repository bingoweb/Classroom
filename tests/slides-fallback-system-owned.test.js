'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const originalPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
const originalSetInterval = global.setInterval;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-fallback-owned-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);

process.env.CLASSROOM_DB_PATH = testDbPath;
process.env.CLASSROOM_ADMIN_PASSWORD = 'fallback-owned-test-password';
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
    });
}

function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((error) => error ? reject(error) : resolve());
    });
}

function request(serverUrl, method, endpoint, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(serverUrl + endpoint, { method, headers }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = data ? JSON.parse(data) : null;
                } catch (_) {}
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });
        req.on('error', reject);
        if (body !== null) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function invokeFinalHandler(handler, req) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Route did not respond')), 500);
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                clearTimeout(timeout);
                resolve({ statusCode: this.statusCode, body });
            }
        };

        handler(req, res);
    });
}

test('Atatürk fallback slides are system-owned', async (t) => {
    let server;
    let serverUrl;
    let cookie;
    let csrf;
    let fallbackId;
    let teacherSlideId;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await run(`
            INSERT INTO slides (
                title, content_type, media_type, media_path, text_content,
                display_order, is_active, is_fallback
            ) VALUES (?, 'rule', 'image', '/assets/teacher-owned.webp', ?, 900, 1, 0)
        `, ['Öğretmen Slaytı', 'Öğretmen içeriği']);

        teacherSlideId = (await get(`SELECT id FROM slides WHERE title = 'Öğretmen Slaytı'`)).id;
        fallbackId = (await get(`SELECT id FROM slides WHERE fallback_key = 'ataturk-education'`)).id;

        server = await new Promise((resolve) => {
            const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
        });
        serverUrl = `http://127.0.0.1:${server.address().port}`;

        const login = await request(
            serverUrl,
            'POST',
            '/api/admin/login',
            { 'Content-Type': 'application/json' },
            { username: 'admin', password: 'fallback-owned-test-password' }
        );
        assert.equal(login.statusCode, 200);
        cookie = login.headers['set-cookie'][0].split(';')[0];

        const session = await request(serverUrl, 'GET', '/api/admin/session', { Cookie: cookie });
        assert.equal(session.statusCode, 200);
        csrf = session.headers['x-csrf-token'];
        assert.match(csrf, /^[a-f0-9]{64}$/);
    });

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        await closeDatabase();
        fs.rmSync(tempDir, { recursive: true, force: true });
        global.setInterval = originalSetInterval;

        if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
        else process.env.CLASSROOM_DB_PATH = originalDbPath;

        if (originalPassword === undefined) delete process.env.CLASSROOM_ADMIN_PASSWORD;
        else process.env.CLASSROOM_ADMIN_PASSWORD = originalPassword;
    });

    await t.test('admin management list exposes teacher slides but hides system fallback rows', async () => {
        const response = await request(serverUrl, 'GET', '/api/admin/slides', { Cookie: cookie });

        assert.equal(response.statusCode, 200);
        assert.ok(response.body.some((row) => row.id === teacherSlideId));
        assert.equal(response.body.some((row) => row.is_fallback === 1), false);
        assert.equal(response.body.some((row) => row.fallback_key), false);
    });

    await t.test('direct update cannot deactivate or edit a system fallback', async () => {
        const before = await get(`
            SELECT title, is_active, display_order
            FROM slides
            WHERE id = ?
        `, [fallbackId]);

        const response = await request(
            serverUrl,
            'PUT',
            `/api/slides/${fallbackId}`,
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf,
                'Content-Type': 'application/json'
            },
            { is_active: 0, title: 'Değiştirilemez' }
        );

        assert.equal(response.statusCode, 403);
        assert.deepEqual(response.body, { error: 'Sistem slaytları düzenlenemez' });

        const after = await get(`
            SELECT title, is_active, display_order
            FROM slides
            WHERE id = ?
        `, [fallbackId]);
        assert.deepEqual(after, before);
    });

    await t.test('a blocked multipart-style fallback update cleans its uploaded file before returning 403', async () => {
        const updateRoute = app._router.stack.find(
            (layer) => layer.route && layer.route.path === '/api/slides/:id' && layer.route.methods.put
        );
        const finalHandler = updateRoute.route.stack.at(-1).handle;
        const uploadedPath = path.join(tempDir, 'blocked-fallback-upload.tmp');
        fs.writeFileSync(uploadedPath, 'temporary upload');

        const response = await invokeFinalHandler(finalHandler, {
            params: { id: String(fallbackId) },
            body: { title: 'Değiştirilemez - Dosyalı' },
            file: { path: uploadedPath },
            requestId: 'fallback-owned-upload-test'
        });

        assert.equal(response.statusCode, 403);
        assert.deepEqual(response.body, { error: 'Sistem slaytları düzenlenemez' });
        assert.equal(fs.existsSync(uploadedPath), false);
    });

    await t.test('direct reorder cannot change a system fallback display order', async () => {
        const before = await get(`SELECT display_order FROM slides WHERE id = ?`, [fallbackId]);

        const response = await request(
            serverUrl,
            'PUT',
            '/api/slides/reorder',
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf,
                'Content-Type': 'application/json'
            },
            { slideOrders: [{ id: fallbackId, display_order: 777 }] }
        );

        assert.equal(response.statusCode, 403);
        assert.deepEqual(response.body, { error: 'Sistem slaytları yeniden sıralanamaz' });

        const after = await get(`SELECT display_order FROM slides WHERE id = ?`, [fallbackId]);
        assert.deepEqual(after, before);
    });

    await t.test('direct delete cannot remove a system fallback', async () => {
        const response = await request(
            serverUrl,
            'DELETE',
            `/api/slides/${fallbackId}`,
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf
            }
        );

        assert.equal(response.statusCode, 403);
        assert.deepEqual(response.body, { error: 'Sistem slaytları silinemez' });
        assert.equal((await get(`SELECT COUNT(*) AS count FROM slides WHERE id = ?`, [fallbackId])).count, 1);
    });

    await t.test('teacher-owned slides remain editable and deletable', async () => {
        const update = await request(
            serverUrl,
            'PUT',
            `/api/slides/${teacherSlideId}`,
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf,
                'Content-Type': 'application/json'
            },
            { title: 'Öğretmen Slaytı Güncel', is_active: 0 }
        );
        assert.equal(update.statusCode, 200);

        const row = await get(`SELECT title, is_active FROM slides WHERE id = ?`, [teacherSlideId]);
        assert.equal(row.title, 'Öğretmen Slaytı Güncel');
        assert.equal(row.is_active, 0);

        const deletion = await request(
            serverUrl,
            'DELETE',
            `/api/slides/${teacherSlideId}`,
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf
            }
        );
        assert.equal(deletion.statusCode, 200);
        assert.equal((await get(`SELECT COUNT(*) AS count FROM slides WHERE id = ?`, [teacherSlideId])).count, 0);
    });
});
