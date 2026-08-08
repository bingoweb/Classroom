'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const originalAdminPassword = process.env.CLASSROOM_ADMIN_PASSWORD;
const originalSetInterval = global.setInterval;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-system-smoke-'));
const dbPath = path.join(tempDir, 'classroom-smoke.db');
const adminPassword = `smoke-${crypto.randomBytes(24).toString('hex')}`;

process.env.CLASSROOM_DB_PATH = dbPath;
process.env.CLASSROOM_ADMIN_PASSWORD = adminPassword;

// The application schedules periodic maintenance. A one-shot smoke process does
// not need those timers, and disabling them keeps teardown deterministic.
global.setInterval = () => 0;

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((error) => error ? reject(error) : resolve());
    });
}

function request(baseUrl, method, endpoint, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        let payload = null;
        const requestHeaders = { ...headers };

        if (body !== null) {
            payload = typeof body === 'string' ? body : JSON.stringify(body);
            if (!Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-length')) {
                requestHeaders['Content-Length'] = Buffer.byteLength(payload);
            }
        }

        const req = http.request(baseUrl + endpoint, {
            method,
            headers: requestHeaders
        }, (res) => {
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
                    body: parsed,
                    rawBody: data
                });
            });
        });

        req.on('error', reject);
        if (payload !== null) req.write(payload);
        req.end();
    });
}

function assertStatus(label, response, expected) {
    if (response.statusCode !== expected) {
        throw new Error(`${label}: expected HTTP ${expected}, received ${response.statusCode}; body=${response.rawBody}`);
    }
}

async function main() {
    let server;

    try {
        await db.scheduleMigrationPromise;

        server = await new Promise((resolve, reject) => {
            const instance = app.listen(0, '127.0.0.1', (error) => {
                if (error) return reject(error);
                resolve(instance);
            });
        });

        const baseUrl = `http://127.0.0.1:${server.address().port}`;

        const kiosk = await request(baseUrl, 'GET', '/', { Accept: 'text/html' });
        assertStatus('public kiosk', kiosk, 200);
        if (!kiosk.rawBody.includes('2/D Sihirli Pano')) {
            throw new Error('public kiosk: expected current kiosk title was not rendered');
        }
        console.log('public kiosk: 200');

        const adminRedirect = await request(baseUrl, 'GET', '/admin/', { Accept: 'text/html' });
        assertStatus('admin redirect', adminRedirect, 302);
        if (!String(adminRedirect.headers.location || '').startsWith('/admin-login.html')) {
            throw new Error(`admin redirect: unexpected location ${adminRedirect.headers.location}`);
        }
        console.log('admin redirect: 302');

        const fallback = await request(baseUrl, 'GET', '/api/slides/active');
        assertStatus('fallback slides', fallback, 200);
        if (!Array.isArray(fallback.body) || fallback.body.length !== 7 || fallback.body.some((slide) => slide.is_fallback !== 1)) {
            throw new Error(`fallback slides: expected seven system fallbacks, received ${fallback.rawBody}`);
        }
        console.log('fallback slides: 7');

        const wrongLogin = await request(
            baseUrl,
            'POST',
            '/api/admin/login',
            { 'Content-Type': 'application/json' },
            { username: 'admin', password: 'wrong-password' }
        );
        assertStatus('wrong admin login', wrongLogin, 401);
        if (wrongLogin.headers['set-cookie']) {
            throw new Error('wrong admin login: session cookie must not be issued');
        }

        const login = await request(
            baseUrl,
            'POST',
            '/api/admin/login',
            { 'Content-Type': 'application/json' },
            { username: 'admin', password: adminPassword }
        );
        assertStatus('admin login', login, 200);
        const setCookie = login.headers['set-cookie'];
        if (!setCookie || !setCookie[0]) {
            throw new Error('admin login: session cookie missing');
        }
        const cookie = setCookie[0].split(';')[0];
        console.log('admin login: 200');

        const session = await request(baseUrl, 'GET', '/api/admin/session', { Cookie: cookie });
        assertStatus('admin session', session, 200);
        if (!session.body || session.body.authenticated !== true) {
            throw new Error('admin session: expected authenticated=true');
        }
        const csrf = session.headers['x-csrf-token'];
        if (typeof csrf !== 'string' || !/^[a-f0-9]{64}$/i.test(csrf)) {
            throw new Error('admin session: expected 64-character CSRF token');
        }
        console.log('CSRF: 64');

        const adminSlides = await request(baseUrl, 'GET', '/api/admin/slides', { Cookie: cookie });
        assertStatus('admin slides', adminSlides, 200);
        if (!Array.isArray(adminSlides.body) || adminSlides.body.length !== 0) {
            throw new Error(`admin slides: fresh DB must hide system fallbacks; body=${adminSlides.rawBody}`);
        }
        console.log('admin slides: 0');

        const schedule = await request(baseUrl, 'GET', '/api/schedule/normalized');
        assertStatus('normalized schedule', schedule, 200);
        if (!schedule.body || !Array.isArray(schedule.body.periods)) {
            throw new Error('normalized schedule: invalid response contract');
        }

        const settingsWrite = await request(
            baseUrl,
            'POST',
            '/api/settings',
            {
                Cookie: cookie,
                'X-CSRF-Token': csrf,
                'Content-Type': 'application/json'
            },
            { key: 'message', value: 'system-smoke-write' }
        );
        assertStatus('temp settings write', settingsWrite, 200);

        const settingsRead = await request(baseUrl, 'GET', '/api/settings');
        assertStatus('temp settings read', settingsRead, 200);
        if (!settingsRead.body || settingsRead.body.message !== 'system-smoke-write') {
            throw new Error(`temp settings readback mismatch: ${settingsRead.rawBody}`);
        }
        console.log('temp settings write/readback: PASS');

        const stats = await request(baseUrl, 'GET', '/api/stats');
        assertStatus('stats', stats, 200);
        if (!stats.body || stats.body.total !== 0) {
            throw new Error(`stats: fresh temp DB expected total=0; body=${stats.rawBody}`);
        }

        console.log('SYSTEM_SMOKE_PASS');
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        try {
            await closeDatabase();
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            global.setInterval = originalSetInterval;

            if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
            else process.env.CLASSROOM_DB_PATH = originalDbPath;

            if (originalAdminPassword === undefined) delete process.env.CLASSROOM_ADMIN_PASSWORD;
            else process.env.CLASSROOM_ADMIN_PASSWORD = originalAdminPassword;
        }
    }
}

main().catch((error) => {
    console.error('SYSTEM_SMOKE_FAIL');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
