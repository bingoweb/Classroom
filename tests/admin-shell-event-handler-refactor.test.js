'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'public/admin/admin.js'), 'utf8');

test('P3-5E1 shell controls use explicit JS hooks instead of inline event handlers', () => {
    assert.match(html, /id="systemButton"[^>]*data-admin-tab="error-logs"/);
    assert.match(html, /id="mobileConnectButton"/);
    assert.match(html, /id="logoutButton"/);
    assert.match(html, /id="qrCloseButton"/);

    for (const tab of ['students', 'roles', 'attendance', 'slides']) {
        assert.match(html, new RegExp(`class="tab-btn(?: active)?"[^>]*data-admin-tab="${tab}"`));
    }

    const shellFragments = [
        /id="systemButton"[^>]*>/,
        /id="mobileConnectButton"[^>]*>/,
        /id="logoutButton"[^>]*>/,
        /class="tab-btn active"[^>]*data-admin-tab="students"[^>]*>/,
        /class="tab-btn"[^>]*data-admin-tab="roles"[^>]*>/,
        /class="tab-btn"[^>]*data-admin-tab="attendance"[^>]*>/,
        /class="tab-btn"[^>]*data-admin-tab="slides"[^>]*>/,
        /id="qrCloseButton"[^>]*>/
    ];

    for (const fragment of shellFragments) {
        const match = html.match(fragment);
        assert.ok(match, `missing expected shell fragment: ${fragment}`);
        assert.doesNotMatch(match[0], /\son[a-z]+\s*=/i, `shell hook still has inline handler: ${match[0]}`);
    }
});

test('P3-5E1 admin shell binds events without parsing onclick source text', () => {
    assert.doesNotMatch(admin, /getAttribute\(['"]onclick['"]\)/);
    assert.match(admin, /querySelectorAll\(['"]\[data-admin-tab\]['"]\)/);
    assert.match(admin, /dataset\.adminTab/);
    assert.match(admin, /mobileConnectButton\.addEventListener\(['"]click['"]/);
    assert.match(admin, /logoutButton\.addEventListener\(['"]click['"]/);
    assert.match(admin, /qrCloseButton\.addEventListener\(['"]click['"]/);
});

test('P3-5E1 logout behavior is owned by admin.js instead of a trailing inline script', () => {
    assert.match(admin, /async function logoutAdmin\(\)/);
    assert.match(admin, /fetch\(['"]\/api\/admin\/logout['"],\s*\{\s*method:\s*['"]POST['"]\s*\}\)/);
    assert.doesNotMatch(html, /async function logoutAdmin\(\)/);
});
