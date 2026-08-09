'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public', 'admin', 'admin.js');
const cssPath = path.join(root, 'public', 'admin', 'style.css');

const adminSource = fs.readFileSync(adminPath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');

test('P3-5C5 moves admin shell QR template style attributes into admin CSS', () => {
    const styleAttributes = adminSource.match(/\sstyle=(?:"[^"]*"|'[^']*')/g) || [];
    assert.strictEqual(
        styleAttributes.length,
        0,
        `expected zero admin shell template style attributes, found ${styleAttributes.length}`
    );

    for (const className of [
        'admin-qr-address',
        'admin-qr-address__title',
        'admin-qr-address__value',
        'admin-qr-address__note'
    ]) {
        const occurrences = adminSource.match(new RegExp(`\\b${className}\\b`, 'g')) || [];
        assert.strictEqual(occurrences.length, 2,
            `${className} must be emitted in both network-info and fallback QR templates`);
        assert.match(cssSource, new RegExp(`\\.${className.replace(/__/g, '__')}\\b`),
            `${className} must be styled by public/admin/style.css`);
    }
});

test('P3-5C5 preserves the QR address computed-style contract explicitly', () => {
    assert.match(cssSource, /\.admin-qr-address\s*\{[^}]*text-align:\s*center;[^}]*padding:\s*20px;/s);
    assert.match(cssSource, /\.admin-qr-address__title\s*\{[^}]*font-size:\s*1\.2rem;[^}]*margin-bottom:\s*15px;[^}]*font-weight:\s*bold;/s);
    assert.match(cssSource, /\.admin-qr-address__value\s*\{[^}]*background:\s*white;[^}]*padding:\s*15px;[^}]*border-radius:\s*10px;[^}]*border:\s*2px solid var\(--primary\);[^}]*word-break:\s*break-all;[^}]*font-family:\s*monospace;[^}]*font-size:\s*1rem;/s);
    assert.match(cssSource, /\.admin-qr-address__note\s*\{[^}]*margin-top:\s*15px;[^}]*font-size:\s*0\.9rem;[^}]*color:\s*#666;/s);
});

test('P3-5C5 keeps QR modal runtime display ownership in JavaScript', () => {
    assert.match(adminSource, /document\.getElementById\('qrModal'\)\.style\.display\s*=\s*'flex'/);
    assert.match(adminSource, /document\.getElementById\('qrModal'\)\.style\.display\s*=\s*'none'/);
    assert.match(adminSource, /new URL\('\/index\.html',\s*window\.location\.origin\)\.href/,
        'the C5 style-only refactor must preserve the corrected QR fallback behavior');
});
