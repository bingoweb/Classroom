const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loginHtml = fs.readFileSync(
    path.join(__dirname, '../public/admin-login.html'),
    'utf8'
);

test('admin login form requires the default admin username', () => {
    assert.match(
        loginHtml,
        /<input[^>]+id="username"[^>]+value="admin"[^>]+required[^>]+autocomplete="username"/
    );
});

test('admin login request sends both username and password', () => {
    assert.match(loginHtml, /const username = usernameInput\.value;/);
    assert.match(loginHtml, /body: JSON\.stringify\(\{ username, password \}\)/);
    assert.match(loginHtml, /passwordInput\.value = '';/);
});

test('admin login declares the existing app favicon instead of triggering /favicon.ico fallback', () => {
    assert.match(
        loginHtml,
        /<link[^>]+rel="(?:shortcut )?icon"[^>]+href="\/assets\/favicon\.png"[^>]*>/,
        'login page should use the bundled favicon and avoid a browser /favicon.ico 404'
    );
});
