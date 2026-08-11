const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function readRgbaPngAlpha(relativePath) {
    const png = fs.readFileSync(path.join(root, relativePath));
    assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const bitDepth = png[24];
    const colorType = png[25];
    assert.equal(bitDepth, 8, `${relativePath} must use 8-bit PNG channels`);
    assert.equal(colorType, 6, `${relativePath} must be true RGBA, not a palette transparency workaround`);

    const idat = [];
    for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        const type = png.subarray(offset + 4, offset + 8).toString('ascii');
        if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
        offset += 12 + length;
        if (type === 'IEND') break;
    }

    const decoded = zlib.inflateSync(Buffer.concat(idat));
    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const alpha = Buffer.alloc(width * height);
    let sourceOffset = 0;
    let previous = Buffer.alloc(stride);
    let transparent = 0;
    let partial = 0;
    let opaque = 0;

    for (let y = 0; y < height; y += 1) {
        const filter = decoded[sourceOffset++];
        const current = Buffer.alloc(stride);
        for (let x = 0; x < stride; x += 1) {
            const raw = decoded[sourceOffset++];
            const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
            const up = previous[x] || 0;
            const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = up;
            else if (filter === 3) predictor = Math.floor((left + up) / 2);
            else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
            else assert.equal(filter, 0, `unsupported PNG filter ${filter} in ${relativePath}`);
            current[x] = (raw + predictor) & 0xff;
        }

        for (let x = 0; x < width; x += 1) {
            const value = current[(x * bytesPerPixel) + 3];
            alpha[(y * width) + x] = value;
            if (value === 0) transparent += 1;
            else if (value === 255) opaque += 1;
            else partial += 1;
        }
        previous = current;
    }

    return {
        width,
        height,
        alpha,
        transparent,
        partial,
        opaque,
        alphaAt(x, y) {
            return alpha[(y * width) + x];
        }
    };
}

function readRgbPngPixels(relativePath) {
    const png = fs.readFileSync(path.join(root, relativePath));
    assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const bitDepth = png[24];
    const colorType = png[25];
    assert.equal(bitDepth, 8, `${relativePath} must use 8-bit PNG channels`);
    assert.equal(colorType, 2, `${relativePath} must be a true RGB PNG for source-pixel analysis`);

    const idat = [];
    for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        const type = png.subarray(offset + 4, offset + 8).toString('ascii');
        if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
        offset += 12 + length;
        if (type === 'IEND') break;
    }

    const decoded = zlib.inflateSync(Buffer.concat(idat));
    const bytesPerPixel = 3;
    const stride = width * bytesPerPixel;
    const rgb = Buffer.alloc(width * height * bytesPerPixel);
    let sourceOffset = 0;
    let previous = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
        const filter = decoded[sourceOffset++];
        const current = Buffer.alloc(stride);
        for (let x = 0; x < stride; x += 1) {
            const raw = decoded[sourceOffset++];
            const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
            const up = previous[x] || 0;
            const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = up;
            else if (filter === 3) predictor = Math.floor((left + up) / 2);
            else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
            else assert.equal(filter, 0, `unsupported PNG filter ${filter} in ${relativePath}`);
            current[x] = (raw + predictor) & 0xff;
        }
        current.copy(rgb, y * stride);
        previous = current;
    }

    return {
        width,
        height,
        rgbAt(x, y) {
            const offset = ((y * width) + x) * 3;
            return [rgb[offset], rgb[offset + 1], rgb[offset + 2]];
        }
    };
}

function rgbSaturation255(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return Math.round(((max - min) * 255) / max);
}

test('magic park kiosk is fully local and loaded in dependency order', () => {
    const html = read('public/index.html');
    const manifest = JSON.parse(read('public/themes/magic-park/theme.json'));

    assert.match(html, /<body[^>]*class="magic-park-theme[^"\n]*"[^>]*data-theme="magic-park"/);
    assert.match(html, /id="active-theme-stylesheet"[^>]*themes\/magic-park\/theme\.css/);
    assert.match(read('public/themes/magic-park/theme.css'), /@import\s+url\(['"]\.\.\/\.\.\/css\/kiosk-magic-park\.css['"]\)/);
    assert.match(html, /assets\/sontema-foreground\.png/);
    assert.doesNotMatch(html, /assets\/AnaTema2-foreground\.png/);
    assert.doesNotMatch(html, /assets\/AnaTema\.png/);
    assert.doesNotMatch(html, /assets\/kiosk-magic-park-shell\.webp/);
    assert.equal(manifest.backgroundAsset, 'assets/sontema.png');
    assert.equal(manifest.previewAsset, 'assets/sontema.png');

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

test('MP2-A attendance garden uses storybook materials and a readable non-ticker absence roster', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const script = read('public/js/script.js');
    const html = read('public/index.html');

    assert.match(css, /--mp2-paper-cream:/);
    assert.match(css, /--mp2-wood-ink:/);
    assert.match(css, /\.present-students-panel::before/);
    assert.match(css, /\.class-capacity-panel::before/);
    assert.match(css, /\.gender-box::before/);
    assert.match(css, /\.attendance-box::before/);
    assert.match(css, /\.absent-marquee-container::before/);
    assert.match(css, /body\.magic-park-theme \.marquee-content\s*\{[^}]*flex-wrap:\s*nowrap[^}]*animation:\s*none/s);
    assert.match(css, /body\.magic-park-theme \.marquee-item\s*\{[^}]*border-radius:[^}]*background:/s);
    assert.doesNotMatch(script, /marqueeHtml \+ marqueeHtml \+ marqueeHtml/);
    assert.match(script, /startAbsentRoster\(absentStudents\);/);
    assert.match(html, /js\/script\.js\?v=13/);
});

test('MP2-A long absence state is paged instead of shrinking or clipping every student at once', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const script = read('public/js/script.js');
    const html = read('public/index.html');

    assert.match(script, /ABSENT_ROSTER_PAGE_SIZE\s*=\s*2/);
    assert.match(script, /ABSENT_ROSTER_PAGE_DURATION\s*=\s*5500/);
    assert.match(script, /function renderAbsentRosterPage\(/);
    assert.match(script, /dataset\.pageLabel/);
    assert.match(script, /attendanceWrapper\.classList\.toggle\('has-absent'/);
    assert.match(script, /absentRosterInterval\s*=\s*intervalManager\.setInterval/);
    assert.match(css, /\.attendance-wrapper\.has-absent\s*\{[^}]*grid-template-rows:\s*minmax\(0, 36fr\) minmax\(0, 64fr\)/s);
    assert.match(css, /body\.magic-park-theme \.marquee-content\s*\{[^}]*flex-direction:\s*row[^}]*flex-wrap:\s*nowrap/s);
    assert.match(css, /content:\s*attr\(data-page-label\)/);
    assert.match(html, /<div class="absent-label">DEVAMSIZLAR<\/div>/);
});

test('MP2-A attendance strip decorative hardware uses browser-valid lengths and clean script markup', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const html = read('public/index.html');

    assert.doesNotMatch(css, /box-shadow:\s*calc\(100%\s*\+\s*19\.1cqw\)/);
    assert.match(css, /box-shadow:\s*19\.1cqw\s+0\s+0\s+#d2a15d/);
    assert.match(html, /^    <script src="js\/script\.js\?v=13"><\/script>$/m);
});

test('MP2-B noise stage keeps semantic meter motion after the resident mascot moves to Class TV', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const noiseMeter = read('public/js/noise-meter.js');
    const motion = read('public/js/kiosk-motion.js');
    const html = read('public/index.html');

    assert.match(css, /--mp2-noise-paper:/);
    assert.match(css, /body\.magic-park-theme \.noise-content\s*\{[^}]*grid-template-columns:\s*minmax\(0, 31\.5%\) minmax\(0, 1fr\)/s);
    assert.match(css, /body\.magic-park-theme #noise-character-img\s*\{[^}]*width:\s*94%[^}]*transition:\s*none[^}]*animation:\s*none/s);
    assert.match(css, /body\.magic-park-theme \.noise-meter-container\s*\{[^}]*background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme \.equalizer-container\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
    assert.doesNotMatch(noiseMeter, /translateX\(-50%\)/);
    assert.doesNotMatch(noiseMeter, /stateImageTimer/);
    assert.match(noiseMeter, /case 'medium':\s*this\.setStatus\('assets\/ui-icons-3d\/microphone\.png'/s);
    assert.doesNotMatch(motion, /noise-character-wrapper|noise-character-img/,
        'legacy resident-mascot motion must not target elements removed from the noise panel');
    assert.match(motion, /gsap\.fromTo\(label,/,
        'noise state changes should keep a bounded meter-label emphasis');
    assert.match(html, /js\/kiosk-motion\.js\?v=5/);
    assert.match(html, /js\/noise-meter\.js\?v=6/);
});

test('Magic Park clears legacy scene-root transforms while preserving alternate-theme motion', () => {
    const motion = read('public/js/kiosk-motion.js');

    assert.match(motion, /const MAGIC_SCENE_ROOTS\s*=\s*\[/,
        'Magic Park motion must explicitly own a stable list of artwork-aligned scene roots');
    assert.match(motion, /function\s+syncMagicSceneTransforms\s*\(/,
        'Magic Park must clear legacy GSAP transforms from its exact artwork openings');
    assert.match(motion, /if\s*\(!isMagicPark\)\s*\{[\s\S]*?entrance[\s\S]*?\.from\(MAGIC_SCENE_ROOTS/s,
        'legacy entrance transforms may remain for alternate themes but must be skipped in Magic Park');
    assert.match(motion, /classroom:theme-change/,
        'switching back to Magic Park must clear any alternate-theme residual transforms');
});

test('MP2-C role scenes use storybook role materials, designed fallback states, and GSAP star crossfades', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const script = read('public/js/script.js');
    const html = read('public/index.html');

    assert.match(css, /--mp2-role-paper:/);
    assert.match(css, /body\.magic-park-theme \.president-main\s*\{[^}]*background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme #president-container\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
    assert.match(css, /body\.magic-park-theme \.vice-president-item\s*\{[^}]*background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme \.duty-item\s*\{[^}]*background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme \.role-empty-state\s*\{[^}]*grid-template-rows:\s*auto auto auto/s);
    assert.match(css, /body\.magic-park-theme \.role-empty-icon\s*\{[^}]*width:\s*clamp\(4\.5rem, 5\.8cqw, 14rem\)/s);
    assert.match(css, /body\.magic-park-theme \.role-empty-title/);
    assert.match(css, /body\.magic-park-theme \.star-slide\s*\{[^}]*display:\s*grid[^}]*visibility:\s*hidden/s);
    assert.match(css, /body\.magic-park-theme \.star-slide\.is-transitioning/s);
    assert.match(css, /body\.magic-park-theme \.star-dots\s*\{[^}]*position:\s*absolute[^}]*top:\s*0\.3cqh[^}]*bottom:\s*auto/s);

    assert.match(script, /function renderRoleEmptyState\(/);
    assert.match(script, /function renderRoleFallbackState\(/);
    assert.match(script, /function animateStarSlideTransition\(/);
    assert.match(script, /window\.gsap\.timeline\(/);
    assert.doesNotMatch(script, /const STAR_TRANSITIONS = \[/);
    assert.doesNotMatch(script, /transition-slide-right/);

    assert.match(html, /id="active-theme-stylesheet"[^>]*themes\/magic-park\/theme\.css/);
    assert.match(html, /js\/script\.js\?v=13/);
});

test('MP2-D clock and lesson flow use owned typography, enamel time badges, and unclipped state-aware scenes', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const script = read('public/js/script.js');
    const html = read('public/index.html');

    assert.match(css, /--mp2-time-paper:/);
    assert.match(css, /body\.magic-park-theme \.date-full\s*\{[^}]*font-family:\s*'Nunito Classroom'/s);
    assert.match(css, /body\.magic-park-theme \.weekend-pill\s*\{[^}]*border-radius:\s*0\.8cqw 1\.05cqw 0\.82cqw 1\.08cqw[^}]*background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme \.before-school-mode,[\s\S]*?background:\s*linear-gradient/s);
    assert.match(css, /body\.magic-park-theme #countdown-card\[data-flow-state="in-class"\] \.countdown-mode/);
    assert.match(css, /body\.magic-park-theme #countdown-card\[data-flow-state="in-break"\] \.countdown-mode/);
    assert.match(css, /body\.magic-park-theme \.countdown-mode\s*\{[^}]*padding:\s*0\.6cqh 0\.8cqw[^}]*gap:\s*0\.25cqh/s);
    assert.match(css, /body\.magic-park-theme \.period-context\.is-single \.period-context-chip\.is-only\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /body\.magic-park-theme \.period-context-value\s*\{[^}]*overflow:\s*visible[^}]*text-overflow:\s*clip[^}]*white-space:\s*normal/s);
    assert.match(css, /body\.magic-park-theme \.goodbye-visual\s*\{[^}]*width:\s*34%[^}]*height:\s*42%/s);

    assert.match(script, /countdownCard\.dataset\.flowState\s*=\s*status\.mode/);
    assert.match(html, /id="active-theme-stylesheet"[^>]*themes\/magic-park\/theme\.css/);
    assert.match(html, /js\/script\.js\?v=13/);
});

test('magic park sontema shell is a high-resolution 16:9 PNG repository asset', () => {
    const png = fs.readFileSync(path.join(root, 'public/assets/sontema.png'));
    assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.strictEqual(png.subarray(12, 16).toString('ascii'), 'IHDR');

    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const bitDepth = png[24];
    const colorType = png[25];

    assert.equal(width, 3840, `current sontema width changed unexpectedly: ${width}`);
    assert.equal(height, 2160, `current sontema height changed unexpectedly: ${height}`);
    assert.equal(bitDepth, 8, 'current sontema must keep 8-bit channels');
    assert.equal(colorType, 2, 'current sontema source is expected to be a true RGB PNG');
    assert.equal(width / height, 16 / 9, `shell is not exact 16:9: ${width}x${height}`);
});

test('Magic Park uses one sontema-based baked RGBA foreground asset with genuinely transparent openings', () => {
    const packageCss = read('public/themes/magic-park/theme.css');
    const layoutPath = path.join(root, 'public/themes/magic-park/magic-layout.css');
    const foregroundPath = path.join(root, 'public/assets/sontema-foreground.png');
    const alphaMaskPath = path.join(root, 'public/assets/sontema-alpha-mask.svg');

    assert.ok(fs.existsSync(layoutPath), 'Magic Park artwork geometry stylesheet must exist');
    assert.ok(fs.existsSync(foregroundPath), 'baked transparent foreground asset must exist');
    assert.equal(fs.existsSync(alphaMaskPath), false,
        'runtime SVG opening mask must be removed after the alpha foreground is baked');

    const layout = fs.readFileSync(layoutPath, 'utf8');
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const source = fs.readFileSync(path.join(root, 'public/assets/sontema.png'));
    const sourceWidth = source.readUInt32BE(16);
    const sourceHeight = source.readUInt32BE(20);

    assert.match(packageCss, /@import\s+url\(['"]\.\/magic-layout\.css['"]\)/,
        'Magic Park package must load its artwork-specific geometry layer');
    assert.equal(foreground.width, sourceWidth, 'foreground width must remain pixel-registered to sontema');
    assert.equal(foreground.height, sourceHeight, 'foreground height must remain pixel-registered to sontema');
    const pixelCount = foreground.width * foreground.height;
    assert.ok(foreground.transparent > pixelCount * 0.18,
        'all eight openings must occupy a substantial genuinely transparent alpha area');
    assert.ok(foreground.opaque > pixelCount * 0.35,
        'frame, foliage, curtains and props must remain fully opaque where the original artwork is visible');
    assert.ok(foreground.partial > 0,
        'opening boundaries should retain anti-aliased partial alpha instead of jagged binary edges');

    const frameRule = layout.match(/\.bento-grid::after\s*\{([^}]*)\}/s)?.[1] || '';
    assert.match(frameRule, /sontema-foreground\.png/,
        'foreground layer must paint the baked transparent asset directly');
    assert.doesNotMatch(frameRule, /(?:-webkit-)?mask-image|sontema-alpha-mask\.svg/,
        'foreground rendering must not depend on CSS masking at runtime');
    assert.match(frameRule, /z-index:\s*20/,
        'transparent foreground frame must render above the live content layer');
    assert.match(frameRule, /pointer-events:\s*none/,
        'foreground artwork must not intercept kiosk interactions');
    assert.match(read('public/index.html'), /preload[^>]+sontema-foreground\.png/,
        'the actual foreground asset must be preloaded instead of the obsolete masked source layer');
    assert.match(layout, /\.main-content-area,[\s\S]*?\.column\s*\{[^}]*display:\s*contents/s,
        'legacy column boxes must stop being the Magic Park positioning system');
    assert.doesNotMatch(layout, /\.bento-grid\s*\{[^}]*background:[^;}]*sontema\.png/s,
        'flattened checkerboard PNG must not remain the direct stage background');

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
        const escaped = selector.replace('.', '\\.');
        assert.match(layout, new RegExp(`${escaped}\\s*\\{[^}]*position:\\s*absolute[^}]*z-index:\\s*5`, 's'),
            `${selector} must sit behind the foreground frame as an artwork-anchored live scene`);
    }
});

test('Magic Park sontema foreground is alpha-empty at the centre of all eight live openings', () => {
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const openingCentres = [
        ['clock', 498, 412],
        ['attendance', 544, 1137],
        ['lesson-flow', 550, 1797],
        ['noise', 1990, 440],
        ['class-tv', 1961, 1325],
        ['president', 3407, 392],
        ['duty', 3355, 1201],
        ['stars', 3373, 1852]
    ];

    for (const [id, x, y] of openingCentres) {
        assert.equal(foreground.alphaAt(x, y), 0,
            `${id} opening centre must be truly transparent in the foreground bitmap`);
    }
    assert.equal(foreground.alphaAt(20, 20), 255,
        'outer frame artwork must remain opaque and must not become a giant transparent canvas');
});

test('Magic Park preserves the Class TV curtains and the noise-window right-side decoration', () => {
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const protectedArtworkProbes = [
        ['Class TV left curtain', 1535, 1022],
        ['Class TV upper curtain', 2246, 1012],
        ['Class TV right curtain', 2588, 1085],
        ['Class TV dark upper curtain fold', 1900, 969],
        ['Class TV dark left curtain shadow', 1332, 1250],
        ['Class TV dark right curtain shadow', 2591, 1250],
        ['noise right decoration upper', 2659, 352],
        ['noise right decoration lower', 2692, 687]
    ];

    for (const [id, x, y] of protectedArtworkProbes) {
        assert.ok(foreground.alphaAt(x, y) >= 192,
            `${id} must remain visibly present instead of being cut away by the opening mask`);
    }

    const upperCurtainDeepShadowProbes = [
        ['Class TV upper curtain deepest fold A', 1760, 978],
        ['Class TV upper curtain deepest fold B', 1843, 972],
        ['Class TV upper curtain deepest fold C', 1893, 969]
    ];

    for (const [id, x, y] of upperCurtainDeepShadowProbes) {
        assert.equal(foreground.alphaAt(x, y), 255,
            `${id} must stay fully opaque even when the source red is nearly black`);
    }

    const lampArmGapProbes = [
        ['Class TV lamp left arm gap', 1772, 892],
        ['Class TV lamp middle arm gap', 1912, 892],
        ['Class TV lamp right arm gap', 2099, 895]
    ];

    for (const [id, x, y] of lampArmGapProbes) {
        assert.equal(foreground.alphaAt(x, y), 0,
            `${id} must expose the live Class TV surface instead of retaining baked board fill`);
    }

    const lampArtworkProbes = [
        ['Class TV lamp left arm', 1840, 885],
        ['Class TV lamp centre arm', 1988, 885],
        ['Class TV lamp upper gold', 1990, 825]
    ];

    for (const [id, x, y] of lampArtworkProbes) {
        assert.equal(foreground.alphaAt(x, y), 255,
            `${id} must remain fully opaque while the negative spaces are cleared`);
    }

    const attendancePencilProbes = [
        ['attendance pencil yellow edge', 886, 1046],
        ['attendance pencil blue tip', 900, 1063],
        ['attendance pencil teal tip', 931, 1065],
        ['attendance pencil dark blue edge', 886, 1098]
    ];

    for (const [id, x, y] of attendancePencilProbes) {
        assert.equal(foreground.alphaAt(x, y), 255,
            `${id} must remain fully opaque instead of being eaten by the attendance opening mask`);
    }

    assert.equal(foreground.alphaAt(884, 1034), 0,
        'true dark attendance opening pixels beside the pencils must remain transparent');

    assert.equal(foreground.alphaAt(2670, 640), 0,
        'the residual black island inside the lower-right of the noise opening must be transparent');
});

test('Magic Park lamp-gap cleanup keeps dark chromatic lamp edges while clearing the three negative spaces', () => {
    const source = readRgbPngPixels('public/assets/sontema.png');
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const gapRegions = [
        ['left', 1716, 838, 1840, 932, 1772, 892],
        ['middle', 1841, 838, 1988, 932, 1912, 892],
        ['right', 1989, 838, 2200, 932, 2099, 895]
    ];

    const luminance = (r, g, b) => (54 * r + 183 * g + 19 * b) >> 8;
    for (const [id, minX, minY, maxX, maxY, gapX, gapY] of gapRegions) {
        let erasedWarmEdgePixels = 0;
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                if (foreground.alphaAt(x, y) !== 0) continue;
                const [r, g, b] = source.rgbAt(x, y);
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const saturation = max === 0 ? 0 : Math.round(((max - min) * 255) / max);
                const warmChromaticEdge = luminance(r, g, b) > 10
                    && max >= 45
                    && saturation >= 75
                    && r >= g + 12
                    && r >= b + 18;
                if (warmChromaticEdge) erasedWarmEdgePixels += 1;
            }
        }

        assert.equal(foreground.alphaAt(gapX, gapY), 0,
            `${id} lamp-arm negative-space centre must remain truly transparent`);
        assert.equal(erasedWarmEdgePixels, 0,
            `${id} lamp gap has ${erasedWarmEdgePixels} dark warm lamp-edge pixels erased by local gap cleanup`);
    }
});

test('Magic Park clears the neutral white halo beside the attendance pencil cup without eating its contour', () => {
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const neutralBackgroundProbes = [
        ['attendance white halo beside pencil cup A', 1003, 1170],
        ['attendance white halo beside pencil cup B', 1004, 1170],
        ['attendance white halo beside pencil cup C', 1003, 1171]
    ];

    for (const [id, x, y] of neutralBackgroundProbes) {
        assert.equal(foreground.alphaAt(x, y), 0,
            `${id} must be transparent instead of leaving a visible neutral foreground fleck`);
    }

    const pencilCupContourProbes = [
        ['attendance pencil-cup warm contour A', 1001, 1170],
        ['attendance pencil-cup warm contour B', 1002, 1172]
    ];

    for (const [id, x, y] of pencilCupContourProbes) {
        assert.equal(foreground.alphaAt(x, y), 255,
            `${id} must remain fully opaque while the adjacent neutral halo is cleared`);
    }
});

test('Magic Park keeps chromatic attendance lower decorations out of the transparent opening mask', () => {
    const source = readRgbPngPixels('public/assets/sontema.png');
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const regions = [
        ['attendance lower books', 84, 1160, 300, 1410],
        ['attendance loose pencils', 300, 1260, 620, 1410],
        ['attendance right pencil-cup-lamp group', 620, 1130, 1004, 1410]
    ];

    for (const [id, minX, minY, maxX, maxY] of regions) {
        let chromaticArtwork = 0;
        let erasedChromaticArtwork = 0;
        for (let y = minY; y < maxY; y += 1) {
            for (let x = minX; x < maxX; x += 1) {
                const [r, g, b] = source.rgbAt(x, y);
                const value = Math.max(r, g, b);
                if (value < 45 || rgbSaturation255(r, g, b) < 75) continue;
                chromaticArtwork += 1;
                if (foreground.alphaAt(x, y) === 0) erasedChromaticArtwork += 1;
            }
        }

        assert.ok(chromaticArtwork > 1000, `${id} analysis region must contain substantial artwork`);
        assert.ok(erasedChromaticArtwork <= 5,
            `${id} has ${erasedChromaticArtwork} strongly chromatic source pixels erased by the opening mask`);
    }

    let darkOpeningPixels = 0;
    let transparentDarkOpeningPixels = 0;
    for (let y = 1130; y < 1445; y += 1) {
        for (let x = 84; x < 1004; x += 1) {
            const [r, g, b] = source.rgbAt(x, y);
            if (Math.max(r, g, b) > 24) continue;
            darkOpeningPixels += 1;
            if (foreground.alphaAt(x, y) === 0) transparentDarkOpeningPixels += 1;
        }
    }

    assert.ok(darkOpeningPixels > 100_000, 'attendance lower strip must contain substantial dark opening background');
    assert.ok(transparentDarkOpeningPixels / darkOpeningPixels >= 0.97,
        'protecting lower decorations must not re-opaque the dark attendance opening background');
});

test('Magic Park keeps strongly chromatic artwork out of the four-pixel opening-growth band', () => {
    const source = readRgbPngPixels('public/assets/sontema.png');
    const foreground = readRgbaPngAlpha('public/assets/sontema-foreground.png');
    const openingBounds = [
        ['clock', 155, 147, 840, 674, 498, 412],
        ['attendance', 84, 839, 1003, 1435, 544, 1137],
        ['lesson-flow', 193, 1569, 906, 2024, 550, 1797],
        ['noise', 1288, 129, 2691, 750, 1990, 440],
        ['class-tv', 1331, 967, 2590, 1682, 1961, 1325],
        ['president', 2974, 99, 3773, 697, 3407, 392],
        ['duty', 3030, 953, 3679, 1449, 3355, 1201],
        ['stars', 3018, 1612, 3727, 2092, 3373, 1852]
    ];

    const luminance = (r, g, b) => (54 * r + 183 * g + 19 * b) >> 8;
    const isStrongChromatic = (r, g, b) => {
        const value = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (value < 45 || value === 0) return false;
        return Math.round(((value - min) * 255) / value) >= 75;
    };

    const failures = [];
    for (const [id, minX, minY, maxX, maxY, centreX, centreY] of openingBounds) {
        const localWidth = maxX - minX + 1;
        const localHeight = maxY - minY + 1;
        const seen = new Uint8Array(localWidth * localHeight);
        const queue = [];
        const start = ((centreY - minY) * localWidth) + (centreX - minX);
        const [centreR, centreG, centreB] = source.rgbAt(centreX, centreY);
        assert.ok(luminance(centreR, centreG, centreB) <= 10, `${id} centre must remain inside its verified dark seed`);
        seen[start] = 1;
        queue.push(start);

        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const localIndex = queue[cursor];
            const localY = Math.floor(localIndex / localWidth);
            const localX = localIndex - (localY * localWidth);
            const neighbours = [];
            if (localX > 0) neighbours.push(localIndex - 1);
            if (localX + 1 < localWidth) neighbours.push(localIndex + 1);
            if (localY > 0) neighbours.push(localIndex - localWidth);
            if (localY + 1 < localHeight) neighbours.push(localIndex + localWidth);
            for (const neighbour of neighbours) {
                if (seen[neighbour]) continue;
                const ny = Math.floor(neighbour / localWidth);
                const nx = neighbour - (ny * localWidth);
                const [nr, ng, nb] = source.rgbAt(minX + nx, minY + ny);
                if (luminance(nr, ng, nb) > 10) continue;
                seen[neighbour] = 1;
                queue.push(neighbour);
            }
        }

        let erasedChromaticGrowthPixels = 0;
        const radius = 4;
        for (let y = Math.max(0, minY - radius); y <= Math.min(source.height - 1, maxY + radius); y += 1) {
            for (let x = Math.max(0, minX - radius); x <= Math.min(source.width - 1, maxX + radius); x += 1) {
                if (foreground.alphaAt(x, y) !== 0) continue;
                const [r, g, b] = source.rgbAt(x, y);
                if (luminance(r, g, b) <= 10 || !isStrongChromatic(r, g, b)) continue;

                let nearVerifiedSeed = false;
                for (let dy = -radius; dy <= radius && !nearVerifiedSeed; dy += 1) {
                    const sy = y + dy;
                    if (sy < minY || sy > maxY) continue;
                    for (let dx = -radius; dx <= radius; dx += 1) {
                        const sx = x + dx;
                        if (sx < minX || sx > maxX) continue;
                        const localSeedIndex = ((sy - minY) * localWidth) + (sx - minX);
                        if (seen[localSeedIndex]) {
                            nearVerifiedSeed = true;
                            break;
                        }
                    }
                }

                if (nearVerifiedSeed) erasedChromaticGrowthPixels += 1;
            }
        }

        if (erasedChromaticGrowthPixels > 0) failures.push(`${id}=${erasedChromaticGrowthPixels}`);
    }

    assert.deepEqual(failures, [],
        `strongly chromatic artwork is erased inside the opening-growth band: ${failures.join(', ')}`);
});

test('Magic Park keeps the baked foreground above flat DOM content with no cavity or edge-depth layer', () => {
    const layout = read('public/themes/magic-park/magic-layout.css');
    const components = read('public/themes/magic-park/magic-components.css');
    const html = read('public/index.html');

    assert.doesNotMatch(layout, /body\.magic-park-theme\.theme-magic-park \.card::after\s*\{/,
        'the theme package must not repaint four CSS gradient ramps over every card');
    assert.doesNotMatch(layout, /magic-3d-stage|--magic-cavity-content-inset|cavity|recess/i,
        'the layout must not retain a WebGL or CSS cavity positioning contract');
    assert.doesNotMatch(html, /magic-3d-stage|magic-3d-scene\.js/,
        'the kiosk document must not mount the retired 3D stage');

    const sharedSceneRule = components.match(/body\.magic-park-theme\.theme-magic-park \.magic-scene\s*\{([^}]*)\}/s)?.[1] || '';
    assert.doesNotMatch(sharedSceneRule, /box-shadow|backdrop-filter|filter/i,
        'live opening surfaces must stay flat instead of adding fake depth over the artwork');
});

test('Magic Park artwork cards overscan the extracted mask by a few pixels so no opening edge can leak through', () => {
    const layout = read('public/themes/magic-park/magic-layout.css');

    assert.doesNotMatch(layout, /2750×1536|2750x1536/,
        'layout geometry must be regenerated from the current 3840×2160 sontema source');

    const expectedGeometry = new Map([
        ['clock-card', ['3.828%', '6.574%', '18.281%', '25.046%']],
        ['stats-card', ['1.979%', '38.472%', '24.375%', '28.380%']],
        ['countdown-card', ['4.818%', '72.269%', '19.010%', '21.852%']],
        ['noise-meter-card', ['33.333%', '5.602%', '36.979%', '29.537%']],
        ['slideshow-card', ['34.453%', '44.398%', '33.229%', '33.889%']],
        ['president-card', ['79.740%', '4.213%', '17.995%', '27.917%']],
        ['duty-card', ['78.698%', '43.750%', '17.344%', '23.750%']],
        ['star-card', ['78.385%', '74.259%', '18.906%', '23.009%']]
    ]);

    for (const [className, [left, top, width, height]] of expectedGeometry) {
        const rule = layout.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 's'))?.[1] || '';
        assert.match(rule, new RegExp(`left:\\s*${left.replace('.', '\\.')}\\s*;`), `${className} must overscan left edge`);
        assert.match(rule, new RegExp(`top:\\s*${top.replace('.', '\\.')}\\s*;`), `${className} must overscan top edge`);
        assert.match(rule, new RegExp(`width:\\s*${width.replace('.', '\\.')}\\s*;`), `${className} must overscan right edge`);
        assert.match(rule, new RegExp(`height:\\s*${height.replace('.', '\\.')}\\s*;`), `${className} must overscan bottom edge`);
    }
});

test('lesson-flow scene stays inside its artwork-anchored countdown card', () => {
    const html = read('public/index.html');
    assert.doesNotMatch(html, /class="card countdown-card magic-scene lesson-flow-scene"/,
        'countdown card must not also be the full-size generic scene surface');
    assert.match(html, /<div class="card countdown-card" id="countdown-card">[\s\S]*?<div class="magic-scene lesson-flow-scene">/,
        'lesson flow must own a nested scene surface inside the positioned countdown card');
});

test('Magic Park 2.2 component layer is composed for the eight transparent artwork openings', () => {
    const componentsPath = path.join(root, 'public/themes/magic-park/magic-components.css');
    const statesPath = path.join(root, 'public/themes/magic-park/magic-states.css');
    const components = fs.readFileSync(componentsPath, 'utf8');
    const states = fs.readFileSync(statesPath, 'utf8');

    for (const token of [
        '--magic-paper',
        '--magic-ink',
        '--magic-blue-surface',
        '--magic-berry-surface'
    ]) {
        assert.match(components, new RegExp(token), `Magic Park component palette must own ${token}`);
    }

    assert.match(components, /\.clock-scene\s*\{[^}]*grid-template-rows:/s,
        'clock opening must use a dedicated three-zone composition');
    assert.match(components, /\.attendance-scene\s*\{[^}]*position:\s*relative[^}]*display:\s*block\s*!important/s,
        'attendance opening must act as the viewport for its rotating mini-channel pages');
    assert.match(components, /\.attendance-hero\s*\{[^}]*grid-template-columns:/s,
        'attendance hero must prioritize present/total values horizontally');
    assert.match(components, /\.noise-scene\s*\{[^}]*grid-template-rows:/s,
        'wide noise opening must devote its complete surface to the listening instrument');
    assert.match(components, /\.slideshow-scene\s*\{[^}]*border:\s*0\s*!important/s,
        'theatre media must sit directly behind the foreground curtains without a duplicate frame');
    assert.match(components, /#president-container\s*\{[^}]*place-items:\s*center/s,
        'president opening must be a single-president hero stage');
    assert.match(components, /#duty-container\s*\{[^}]*padding:[^}]*30%/s,
        'duty content must reserve the decorated aquarium floor instead of hiding names behind plants');
    assert.match(components, /#stars-container\s*\{[^}]*--magic-role-accent:/s,
        'star opening must own its berry/gold presentation accent');
    assert.match(components, /\.star-name\s*\{[^}]*align-self:\s*end/s,
        'featured student name must remain visibly staged above the foreground podium');

    assert.match(states, /#countdown-card\[data-flow-state="in-class"\]/,
        'lesson-flow appearance must remain driven by the existing runtime state hook');
    assert.match(states, /#noise-meter-card\.state-high/,
        'noise high state must retain a designed artwork-scoped state');
});

test('Magic Park 2.2 exposes eight semantic scene roots without replacing dynamic kiosk hooks', () => {
    const html = read('public/index.html');

    for (const sceneClass of [
        'clock-scene',
        'attendance-scene',
        'lesson-flow-scene',
        'noise-scene',
        'slideshow-scene',
        'president-scene',
        'duty-scene',
        'stars-scene'
    ]) {
        assert.match(
            html,
            new RegExp(`class="[^"]*\\bmagic-scene\\b[^"]*\\b${sceneClass}\\b[^"]*"`),
            `${sceneClass} must expose a Magic Park 2.2 scene root`
        );
    }

    for (const id of [
        'day-name',
        'date',
        'clock',
        'weekend-widget',
        'weekend-counter',
        'present-students',
        'total-students',
        'girl-students',
        'boy-students',
        'attendance-stat',
        'today-attendance',
        'absent-container',
        'absent-list',
        'countdown-card',
        'before-school-mode',
        'countdown-mode',
        'goodbye-mode',
        'countdown',
        'countdown-bar',
        'noise-meter-card',
        'noise-status-text',
        'noise-level-meter',
        'noise-meter-fill',
        'equalizer-container',
        'mic-start-btn',
        'slideshow-container',
        'class-tv-layer',
        'class-tv-programme',
        'class-tv-mascot-pip',
        'class-tv-takeover',
        'president-container',
        'duty-container',
        'stars-container'
    ]) {
        const matches = html.match(new RegExp(`id="${id}"`, 'g')) || [];
        assert.equal(matches.length, 1, `${id} must remain a unique stable runtime hook`);
    }
});

test('Class TV owns Lavunu while the top noise panel remains a dedicated instrument', () => {
    const html = read('public/index.html');
    const noiseSource = read('public/js/noise-meter.js');
    const classTvPath = path.join(root, 'public/js/class-tv.js');
    const classTvSource = fs.existsSync(classTvPath) ? fs.readFileSync(classTvPath, 'utf8') : '';
    const noisePanel = html.match(/<div class="card noise-meter-card"[\s\S]*?<div class="card slideshow-card">/)?.[0] || '';

    assert.doesNotMatch(noisePanel, /noise-character-wrapper|noise-character-img/,
        'Lavunu must no longer live in the top listening panel');
    assert.match(noisePanel, /id="noise-level-meter"/);
    assert.match(noisePanel, /id="equalizer-container"/);
    assert.match(html, /id="class-tv-layer"/);
    assert.match(html, /js\/class-tv\.js\?v=1/);
    assert.match(noiseSource, /classroom:noise-state/,
        'noise sensing must publish semantic state to the broadcast layer');
    assert.match(classTvSource, /assets\/noise-states\/quiet\.webp/);
    assert.match(classTvSource, /assets\/noise-states\/attention\.webp/);
    assert.match(classTvSource, /assets\/noise-states\/loud\.webp/);
});

test('Class TV is Magic-Park-only and the narrow attendance panel behaves as a mini channel', () => {
    const html = read('public/index.html');
    const themeSystemCss = read('public/css/kiosk-theme-system.css');
    const components = read('public/themes/magic-park/magic-components.css');

    assert.match(themeSystemCss, /body:not\(\.theme-magic-park\)\s+#class-tv-layer\s*\{[^}]*display:\s*none/s,
        'shared theme chrome must hide Class TV only outside its owning theme');
    assert.match(components, /body\.magic-park-theme\.theme-magic-park\s+#class-tv-layer\s*\{[^}]*display:\s*block/s,
        'Magic Park must explicitly reveal its Class TV layer with enough specificity to beat the shared guard');

    for (const pageClass of [
        'attendance-mini-page--hero',
        'attendance-mini-page--gender',
        'attendance-mini-page--status'
    ]) {
        assert.match(html, new RegExp(`\\b${pageClass}\\b`), `${pageClass} must exist`);
    }
    assert.match(components, /@keyframes\s+magic-attendance-channel/,
        'the narrow attendance panel must rotate its compact views');
    assert.match(components, /\.attendance-mini-page--gender\s*\{[^}]*animation-delay:/s);
    assert.match(components, /\.attendance-mini-page--status\s*\{[^}]*animation-delay:/s);
});

test('emergency tribute portrait uses a correctly typed optimized WebP asset', () => {
    const tribute = fs.readFileSync(path.join(root, 'public/assets/tribute.webp'));

    assert.strictEqual(tribute.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.strictEqual(tribute.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(tribute.length < 300_000, `tribute fallback is unexpectedly large: ${tribute.length}`);
});

test('magic park stylesheet registers all eight live regions to the 4K shell', () => {
    const css = read('public/css/kiosk-magic-park.css');
    const packageCss = read('public/themes/magic-park/theme.css');

    assert.match(css, /font-family: 'Fredoka Classroom'/);
    assert.match(css, /font-family: 'Nunito Classroom'/);
    assert.match(css, /grid-template-columns: 27% 73%/);
    assert.match(css, /grid-template-columns: 65\.1% 34\.9%/);
    assert.match(css, /width:\s*min\(100vw, 177\.7777778vh\)/);
    assert.match(css, /height:\s*min\(100vh, 56\.25vw\)/);
    assert.match(css, /container-name:\s*kiosk-stage/);
    assert.match(css, /background:[^;]*sontema\.png[^;]*100% 100%/s);
    assert.doesNotMatch(css, /AnaTema(?:2)?\.png|kiosk-magic-park-shell\.webp/);
    assert.match(css, /@media \(min-width: 3000px\) and \(min-height: 1600px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(
        packageCss,
        /body\.magic-park-theme\.theme-magic-park \.card-titlebar\s*\{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/s,
        'Magic Park must visually suppress DOM titlebars because AnaTema already contains the headings'
    );
    assert.doesNotMatch(
        packageCss,
        /body\.magic-park-theme(?!\.theme-magic-park) \.card-titlebar\s*\{[^}]*opacity:\s*0/s,
        'titlebar suppression must not leak into other themes that retain the magic-park compatibility class'
    );

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
    assert.match(css, /\.noise-content\s*\{[^}]*inset:\s*18% 7\.5% 12\.5% 7\.5%[^}]*border:\s*0[^}]*box-shadow:\s*none/s);
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
