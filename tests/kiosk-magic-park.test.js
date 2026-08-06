const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('magic park kiosk is fully local and loaded in dependency order', () => {
    const html = read('public/index.html');

    assert.match(html, /<body class="magic-park-theme">/);
    assert.match(html, /css\/kiosk-magic-park\.css\?v=11/);
    assert.match(html, /assets\/kiosk-magic-park-shell\.webp/);

    const gsapPosition = html.indexOf('vendor/gsap/gsap-3.15.0.min.js');
    const confettiVendorPosition = html.indexOf('vendor/canvas-confetti/canvas-confetti-1.9.4.js');
    const confettiAdapterPosition = html.indexOf('js/confetti.js');
    const motionPosition = html.indexOf('js/kiosk-motion.js');

    assert.ok(gsapPosition > 0, 'the pinned local GSAP build must be present');
    assert.ok(confettiVendorPosition > gsapPosition, 'the pinned confetti build must follow GSAP');
    assert.ok(confettiAdapterPosition > confettiVendorPosition, 'the classroom adapter must follow its vendor build');
    assert.ok(motionPosition > confettiAdapterPosition, 'the motion layer must load after its dependencies');
    assert.doesNotMatch(html, /(?:src|href)="https?:\/\//, 'the kiosk must not depend on a runtime CDN');

    for (const relativePath of [
        'public/vendor/gsap/gsap-3.15.0.min.js',
        'public/vendor/canvas-confetti/canvas-confetti-1.9.4.js',
        'public/fonts/fredoka-latin-wght-normal.woff2',
        'public/fonts/fredoka-latin-ext-wght-normal.woff2',
        'public/fonts/nunito-sans-latin-wght-normal.woff2',
        'public/fonts/nunito-sans-latin-ext-wght-normal.woff2'
    ]) {
        assert.ok(fs.statSync(path.join(root, relativePath)).size > 1000, `${relativePath} is unexpectedly small`);
    }
});

test('magic park shell is an optimized high-resolution 16:9 repository asset', () => {
    const webp = fs.readFileSync(path.join(root, 'public/assets/kiosk-magic-park-shell.webp'));
    assert.strictEqual(webp.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.strictEqual(webp.subarray(8, 12).toString('ascii'), 'WEBP');

    const chunkType = webp.subarray(12, 16).toString('ascii');
    assert.strictEqual(chunkType, 'VP8 ');
    const frameHeader = webp.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    assert.ok(frameHeader > 0, 'VP8 frame header is missing');
    const width = webp.readUInt16LE(frameHeader + 3) & 0x3fff;
    const height = webp.readUInt16LE(frameHeader + 5) & 0x3fff;

    assert.ok(width >= 1600, `shell width is too small: ${width}`);
    assert.ok(height >= 900, `shell height is too small: ${height}`);
    assert.ok(Math.abs((width / height) - (16 / 9)) < 0.015, `shell is not 16:9: ${width}x${height}`);
    assert.ok(webp.length < 500_000, `optimized shell is unexpectedly large: ${webp.length}`);
});

test('emergency tribute portrait uses a correctly typed optimized WebP asset', () => {
    const tribute = fs.readFileSync(path.join(root, 'public/assets/tribute.webp'));

    assert.strictEqual(tribute.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.strictEqual(tribute.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(tribute.length < 300_000, `tribute fallback is unexpectedly large: ${tribute.length}`);
});

test('magic park stylesheet registers all eight live regions to the 4K shell', () => {
    const css = read('public/css/kiosk-magic-park.css');

    assert.match(css, /font-family: 'Fredoka Classroom'/);
    assert.match(css, /font-family: 'Nunito Classroom'/);
    assert.match(css, /grid-template-columns: 27% 73%/);
    assert.match(css, /grid-template-columns: 65\.1% 34\.9%/);
    assert.match(css, /width:\s*min\(100vw, 177\.7777778vh\)/);
    assert.match(css, /height:\s*min\(100vh, 56\.25vw\)/);
    assert.match(css, /container-name:\s*kiosk-stage/);
    assert.match(css, /background:[^;]*kiosk-magic-park-shell\.webp[^;]*100% 100%/s);
    assert.match(css, /@media \(min-width: 3000px\) and \(min-height: 1600px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

    for (const selector of [
        '.clock-card',
        '.stats-card',
        '.countdown-card',
        '.noise-meter-card',
        '.slideshow-card',
        '.president-card',
        '.duty-card',
        '.star-card'
    ]) {
        assert.ok(css.includes(selector), `missing magic park region: ${selector}`);
    }
});

test('motion and celebration layers delegate to pinned libraries without prototype graphics', () => {
    const motion = read('public/js/kiosk-motion.js');
    const confetti = read('public/js/confetti.js');
    const pictographic = /\p{Extended_Pictographic}/u;

    assert.match(motion, /gsap\.matchMedia\(\)/);
    assert.match(motion, /new MutationObserver/);
    assert.match(motion, /prefers-reduced-motion/);
    assert.doesNotMatch(motion, /card-titlebar-icon|stats-header-icon/);
    assert.match(confetti, /window\.confetti\(/);
    assert.match(confetti, /disableForReducedMotion: true/);
    assert.doesNotMatch(confetti, /document\.createElement\(['"]canvas['"]\)/);
    assert.equal(pictographic.test(motion), false);
    assert.equal(pictographic.test(confetti), false);
});

test('detail-polish rules prevent narrow meters, clipped slides, and off-centre role content', () => {
    const css = read('public/css/kiosk-magic-park.css');

    assert.match(css, /\.date-section\s*\{[^}]*align-items:\s*center/s);
    assert.match(css, /\.noise-meter-container\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
    assert.match(css, /\.slideshow-container \.slide\s*\{[^}]*min-height:\s*0/s);
    assert.match(css, /\.slide-text-content\.fade-out\s*\{[^}]*opacity:\s*1[^}]*transition:\s*none/s);
    assert.match(css, /\.star-slide\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*justify-items:\s*center/s);
    assert.match(css, /\.star-avatar\s*\{[^}]*position:\s*relative[^}]*justify-self:\s*center/s);
});

test('live kiosk panels reserve gaps without clipping and share the centre title width', () => {
    const html = read('public/index.html');
    const css = read('public/css/kiosk-magic-park.css');

    assert.match(css, /\.stats-body\s*\{[^}]*grid-template-rows:\s*minmax\(0, 40fr\) minmax\(0, 34fr\) minmax\(0, 26fr\)/s);
    assert.match(css, /\.card-titlebar,[\s\S]*?width:\s*100%/s);
    assert.doesNotMatch(html, /class="[^"]*(?:card-titlebar-icon|stats-header-icon)/);
    assert.match(css, /\.noise-content\s*\{[^}]*inset:\s*20% 9% 14% 9%[^}]*border:\s*0[^}]*box-shadow:\s*none/s);
    assert.match(css, /\.before-school-mode,[\s\S]*?inset:\s*24% 16% 18% 16%/s);
    assert.match(css, /\.vice-president-name\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test('featured student panels use a clear portrait hierarchy and compact noise layout', () => {
    const css = read('public/css/kiosk-magic-park.css');

    assert.match(css, /#president-container\s*\{[^}]*grid-template-rows:\s*minmax\(0, 54fr\) minmax\(0, 40fr\)/s);
    assert.match(css, /\.president-main\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)[^}]*grid-template-rows:\s*minmax\(0, 1fr\)/s);
    assert.match(css, /\.vice-presidents-container\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)[^}]*height:\s*100%/s);
    assert.match(css, /\.mic-state-unavailable \.noise-info\s*\{[^}]*grid-template-rows:\s*auto auto auto[^}]*align-content:\s*center/s);
    assert.match(css, /#stars-container\s*\{[^}]*inset:\s*18% 9% 7% 9%/s);
    assert.match(css, /\.star-avatar\s*\{[^}]*width:\s*clamp\(7rem, 9\.4cqw, 22\.5rem\)/s);
    assert.match(css, /\.star-name\s*\{[^}]*grid-row:\s*1[^}]*align-self:\s*end/s);
    assert.match(css, /\.eq-column:nth-child\(even\)\s*\{[^}]*display:\s*none/s);
    assert.match(css, /\.eq-bar\s*\{[^}]*mask-image:\s*none[^}]*-webkit-mask-image:\s*none/s);
});

test('equalizer markup is created once by the noise meter at runtime', () => {
    const html = read('public/index.html');
    const noiseMeter = read('public/js/noise-meter.js');

    assert.match(html, /<div class="equalizer-bars"><\/div>/);
    assert.doesNotMatch(html, /id="eq-bar-\d+"/);
    assert.match(noiseMeter, /document\.createDocumentFragment\(\)/);
    assert.match(noiseMeter, /for \(let i = 0; i < 128; i\+\+\)/);
    assert.match(noiseMeter, /column\.appendChild\(peak\)/);
    assert.match(noiseMeter, /column\.appendChild\(bar\)/);
});
