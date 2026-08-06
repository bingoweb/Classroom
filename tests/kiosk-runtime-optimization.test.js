const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const script = fs.readFileSync(path.join(__dirname, '../public/js/script.js'), 'utf8');
const kioskHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('dashboard refresh avoids request waterfalls and duplicate settings polling', () => {
    assert.match(script, /const \[roles, stats\] = await Promise\.all\(\[/);
    assert.match(script, /updateStats\(stats\)/);
    assert.doesNotMatch(script, /fetchWithErrorHandling\(`\$\{CONFIG\.API_URL\}\/settings`\)/);
});

test('clock and schedule rendering guard unchanged DOM values', () => {
    assert.match(script, /clockEl\.textContent !== clockText/);
    assert.match(script, /function setTextIfChanged/);
    assert.match(script, /function setDisplayIfChanged/);
    assert.match(script, /container\.dataset\.periodContextKey === renderKey/);
    assert.match(script, /currentImage\.getAttribute\('src'\) === imagePath/);
});

test('kiosk declares a small pinned favicon instead of triggering a missing icon request', () => {
    const favicon = fs.readFileSync(path.join(__dirname, '../public/assets/favicon.png'));

    assert.match(kioskHtml, /<link rel="icon" href="assets\/favicon\.png" type="image\/png" sizes="64x64">/);
    assert.deepStrictEqual([...favicon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.strictEqual(favicon.readUInt32BE(16), 64);
    assert.strictEqual(favicon.readUInt32BE(20), 64);
    assert.ok(favicon.length < 10 * 1024);
});
