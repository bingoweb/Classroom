'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const adminPath = path.join(__dirname, '..', 'public', 'admin', 'admin.js');

function loadAdminWithFailedNetworkInfo({ href, origin }) {
    const elements = new Map([
        ['qrModal', { style: {} }],
        ['qrcode', { innerHTML: '' }]
    ]);

    const windowObject = {
        location: { href, origin },
        addEventListener() {}
    };

    const context = {
        window: windowObject,
        document: {
            getElementById(id) {
                return elements.get(id) || null;
            },
            querySelectorAll() {
                return [];
            },
            addEventListener() {}
        },
        fetch: async () => {
            throw new Error('forced network-info failure');
        },
        CONFIG: { API_URL: '/api' },
        URL,
        console
    };

    vm.createContext(context);
    vm.runInContext(fs.readFileSync(adminPath, 'utf8'), context, { filename: adminPath });
    return { context, elements };
}

test('admin QR fallback always points to the public kiosk from /admin/', async () => {
    const { context, elements } = loadAdminWithFailedNetworkInfo({
        href: 'http://127.0.0.1:49375/admin/',
        origin: 'http://127.0.0.1:49375'
    });

    await context.window.showQRCode();

    assert.strictEqual(elements.get('qrModal').style.display, 'flex');
    assert.match(elements.get('qrcode').innerHTML, /http:\/\/127\.0\.0\.1:49375\/index\.html/);
    assert.doesNotMatch(elements.get('qrcode').innerHTML, /127\.0\.0\.1:49375\/admin\//);
});

test('admin QR fallback is origin-based instead of depending on legacy admin/index.html path text', () => {
    const source = fs.readFileSync(adminPath, 'utf8');

    assert.doesNotMatch(source, /location\.href\.replace\(['"]\/admin\/index\.html['"]/);
    assert.match(source, /new URL\(['"]\/index\.html['"],\s*window\.location\.origin\)\.href/);
});
