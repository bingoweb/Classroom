const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const kioskHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const noiseMeter = fs.readFileSync(path.join(root, 'public/js/noise-meter.js'), 'utf8');

const assets = [
    ['quiet', 'backend/uploads/sessiz.png'],
    ['attention', 'backend/uploads/uyari.png'],
    ['loud', 'backend/uploads/gurultu.png']
];

function readLossyWebpDimensions(buffer) {
    assert.strictEqual(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.strictEqual(buffer.toString('ascii', 8, 12), 'WEBP');
    assert.strictEqual(buffer.toString('ascii', 12, 16), 'VP8 ');
    assert.deepStrictEqual([...buffer.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
    return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff
    };
}

test('noise states use pinned full-resolution WebP assets with substantial transfer savings', () => {
    let originalBytes = 0;
    let optimizedBytes = 0;

    for (const [name, sourcePath] of assets) {
        const optimizedPath = path.join(root, `public/assets/noise-states/${name}.webp`);
        const optimized = fs.readFileSync(optimizedPath);
        const sourceBytes = fs.statSync(path.join(root, sourcePath)).size;

        originalBytes += sourceBytes;
        optimizedBytes += optimized.length;
        assert.deepStrictEqual(readLossyWebpDimensions(optimized), { width: 2816, height: 1536 });
        assert.ok(optimized.length < sourceBytes * 0.15, `${name} should save at least 85%`);
    }

    assert.ok(optimizedBytes < originalBytes * 0.1, 'combined WebP payload should save at least 90%');
});

test('kiosk and noise meter reference only the optimized state assets', () => {
    assert.match(kioskHtml, /assets\/noise-states\/quiet\.webp/);
    assert.match(kioskHtml, /noise-meter\.js\?v=5/);
    assert.doesNotMatch(kioskHtml, /uploads\/sessiz\.png/);

    for (const [name] of assets) {
        assert.match(noiseMeter, new RegExp(`assets/noise-states/${name}\\.webp`));
    }
    assert.doesNotMatch(noiseMeter, /uploads\/(?:sessiz|uyari|gurultu)\.png/);
});
