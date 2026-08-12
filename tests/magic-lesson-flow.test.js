'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const boxRoot = path.join(root, 'public/themes/magic-park/boxes/lesson-flow');

test('lesson flow owns CSS, JSON, JavaScript and package documentation', () => {
    for (const name of ['lesson-flow.css', 'lesson-flow.json', 'lesson-flow.js', 'README.md']) {
        assert.ok(fs.statSync(path.join(boxRoot, name)).size > 0, `${name} must exist and be non-empty`);
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    assert.equal(manifest.id, 'magic-park-lesson-flow');
    assert.equal(manifest.css, 'lesson-flow.css');
    assert.equal(manifest.script, 'lesson-flow.js');
    assert.deepEqual(Object.keys(manifest.modes), [
        'before-school', 'in-class', 'in-break', 'after-school', 'weekend', 'error'
    ]);
    assert.equal(manifest.motion.direction, 'left-to-right');
    assert.deepEqual(manifest.motion.revealOrder, ['title', 'kicker', 'primary', 'context']);
    assert.equal(manifest.capabilities.three, true);
    assert.equal(manifest.capabilities.customShader, true);
    assert.equal(manifest.capabilities.instancedBubbles, true);
    assert.equal(manifest.capabilities.cssFallback, true);
    assert.equal(manifest.water.fillDirection, 'bottom-to-top');
    assert.equal(manifest.water.bubbles, 72);
    assert.deepEqual(manifest.water.contrastThresholds, {
        context: 24, primary: 50, kicker: 74, title: 90
    });

    const theme = fs.readFileSync(path.join(root, 'public/themes/magic-park/theme.css'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(theme, /boxes\/lesson-flow\/lesson-flow\.css/);
    assert.match(html, /themes\/magic-park\/boxes\/lesson-flow\/lesson-flow\.js/);
});

test('enchanted glass typography contract is owned by the lesson flow manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));

    assert.deepEqual(manifest.typography, {
        concept: 'enchanted-glass-crest',
        palette: {
            dryFace: '#245D5B',
            dryEdge: '#FFF8E6',
            wetFace: '#FFF8E6',
            wetEdge: '#245D5B',
            depth: '#5D3C78',
            glass: '#8FE8E1',
            warmGlint: '#FFB12D'
        },
        motionMs: {
            titleSettle: 520,
            kickerReveal: 380,
            separatorPulse: 1000,
            sheenCycle: 9000
        },
        depthLayers: 4
    });
});

test('lesson flow builds readable models for every schedule state', () => {
    const { buildLessonFlowViewModel } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');

    assert.deepEqual(buildLessonFlowViewModel({
        mode: 'before-school', countdown: '1:05:00', subtitle: '09:00 - Ders Başlıyor', progress: 0
    }, 'fallback'), {
        mode: 'before-school', kicker: 'BAŞLAMASINA KALAN', title: 'DERS BAŞLIYOR', primary: '1:05:00', current: '09:00’DA',
        nextLabel: '', next: '', progress: 0, showCountdown: true
    });

    assert.equal(buildLessonFlowViewModel({
        mode: 'in-class', countdown: '24:24', currentPeriodNumber: 3,
        currentPeriodName: '3. Ders (Beslenme)', progress: 40
    }, 'fallback').current, 'Beslenme');

    assert.deepEqual(buildLessonFlowViewModel({
        mode: 'in-class', countdown: '28:00', currentPeriodNumber: 2, currentPeriodName: 'Türkçe',
        nextLessonName: 'Matematik', progress: 30
    }, 'external'), {
        mode: 'in-class', kicker: 'TENEFFÜSE KALAN', title: '2. DERS', primary: '28:00', current: 'Türkçe',
        nextLabel: 'SIRADAKİ', next: 'Matematik', progress: 30, showCountdown: true
    });

    assert.deepEqual(buildLessonFlowViewModel({
        mode: 'in-break', countdown: '07:00', currentPeriodNumber: 1, currentPeriodName: '1. Teneffüs',
        nextLessonName: 'Hayat Bilgisi', progress: 80
    }, 'external'), {
        mode: 'in-break', kicker: 'DERSE KALAN', title: '1. TENEFFÜS', primary: '07:00', current: '',
        nextLabel: 'SIRADAKİ', next: 'Hayat Bilgisi', progress: 80, showCountdown: true
    });

    assert.deepEqual(buildLessonFlowViewModel({
        mode: 'after-school', message: 'Yarın Görüşürüz', subtitle: 'İyi dinlenin', progress: 100
    }, 'fallback'), {
        mode: 'after-school', kicker: 'DERSLER TAMAMLANDI', title: 'YARIN GÖRÜŞÜRÜZ', primary: 'İyi dinlenin', current: '',
        nextLabel: '', next: '', progress: 100, showCountdown: false
    });

    assert.deepEqual(buildLessonFlowViewModel({
        mode: 'weekend', message: 'İyi Hafta Sonları!', subtitle: 'Tatilinizin tadını çıkarın!'
    }, 'fallback'), {
        mode: 'weekend', kicker: 'DİNLENME ZAMANI', title: 'İYİ HAFTA SONLARI!', primary: 'Tatilinizin tadını çıkarın!', current: '',
        nextLabel: '', next: '', progress: 0, showCountdown: false
    });

    assert.deepEqual(buildLessonFlowViewModel({ mode: 'error' }, 'fallback'), {
        mode: 'error', kicker: 'DERS AKIŞI', title: 'PROGRAM BEKLENİYOR', primary: 'Ders bilgisi hazırlanıyor', current: '',
        nextLabel: '', next: '', progress: 0, showCountdown: false
    });
});

test('countdown typography segments preserve minutes and optional hours', () => {
    const { splitCountdownParts } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');

    assert.deepEqual(splitCountdownParts('18:00'), ['18', ':', '00']);
    assert.deepEqual(splitCountdownParts('1:05:09'), ['1', ':', '05', ':', '09']);
    assert.equal(splitCountdownParts('Ders bilgisi hazırlanıyor'), null);
});

test('typography manifest values are validated before becoming scene variables', () => {
    const { applyTypographyStyle } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const properties = new Map();
    const scene = { style: { setProperty(name, value) { properties.set(name, value); } } };

    applyTypographyStyle(scene, {
        palette: { dryFace: '#245D5B', wetFace: 'not-a-color', glass: '#8FE8E1' },
        motionMs: { titleSettle: 520, separatorPulse: 1000, sheenCycle: 50000 }
    });

    assert.equal(properties.get('--lesson-flow-type-dry-face'), '#245D5B');
    assert.equal(properties.get('--lesson-flow-type-glass'), '#8FE8E1');
    assert.equal(properties.has('--lesson-flow-type-wet-face'), false);
    assert.equal(properties.get('--lesson-flow-title-settle'), '520ms');
    assert.equal(properties.get('--lesson-flow-separator-pulse'), '1000ms');
    assert.equal(properties.has('--lesson-flow-crest-sheen'), false);
});

test('countdown renderer declares accessible digit and separator spans', () => {
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');

    assert.match(runtime, /lesson-flow__digits/);
    assert.match(runtime, /lesson-flow__separator/);
    assert.match(runtime, /renderPrimaryValue/);
    assert.match(runtime, /aria-label/);
});

test('fallback schedule does not present a guessed next lesson', () => {
    const { buildLessonFlowViewModel } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const model = buildLessonFlowViewModel({
        mode: 'in-class', countdown: '12:00', currentPeriodNumber: 1, currentPeriodName: '1. Ders',
        nextLessonName: '2. Ders', progress: 70
    }, 'fallback');

    assert.equal(model.title, '1. DERS');
    assert.equal(model.current, '');
    assert.equal(model.next, '');
    assert.equal(model.nextLabel, '');
});

test('adaptive contrast follows the bottom-up fill through every reading zone', () => {
    const { resolveAdaptiveContrast } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');

    assert.deepEqual(resolveAdaptiveContrast(0), {
        context: false, primary: false, kicker: false, title: false
    });
    assert.deepEqual(resolveAdaptiveContrast(55), {
        context: true, primary: true, kicker: false, title: false
    });
    assert.deepEqual(resolveAdaptiveContrast(100), {
        context: true, primary: true, kicker: true, title: true
    });
});

test('render layer uses a continuous free surface as the only visible progress indicator', () => {
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');
    const css = fs.readFileSync(path.join(boxRoot, 'lesson-flow.css'), 'utf8');

    assert.doesNotMatch(runtime, /trackGeometry|travellerGeometry|lesson-flow__route/);
    assert.match(runtime, /new THREE\.ShaderMaterial/);
    assert.match(runtime, /new THREE\.DataTexture/);
    assert.match(runtime, /physics\.getSurfaceProfile/);
    assert.match(runtime, /new THREE\.InstancedMesh\([^,]+,[^,]+,\s*72\)/s);
    assert.match(runtime, /bubbleMesh\.instanceMatrix\.needsUpdate\s*=\s*true/);
    assert.match(runtime, /physics\.setTargetFill\(targetProgress\)/);
    assert.match(runtime, /physics\.sampleVelocity/);
    assert.match(runtime, /physics\.disturb/);
    assert.match(runtime, /setProgress\(value, mode\)/);
    assert.match(css, /\.lesson-flow__progress-wash\s*\{[^}]*height:\s*var\(--lesson-flow-progress/s);
    assert.match(css, /\.is-on-fill/);
    assert.doesNotMatch(runtime, /new THREE\.WebGLRenderTarget|uDensityField|densityTarget/);
    assert.doesNotMatch(css, /lesson-flow__route|lesson-flow__traveller|lesson-flow__target/);
});

test('revision 3 declares a LiquidFun simulation with a continuous surface-profile renderer', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');

    assert.equal(manifest.water.physics.engine, 'liquidfun-particles');
    assert.equal(manifest.water.physics.surfaceWaveSolver, 'damped-shallow-water');
    assert.equal(manifest.water.physics.surfaceTension, true);
    assert.equal(manifest.water.physics.viscosity, true);
    assert.equal(manifest.water.renderer, 'refracted-backdrop-volume');
    assert.equal(manifest.water.surface, 'traveling-height-field');
    assert.equal(manifest.water.liquidKind, 'orange-soda');
    assert.deepEqual(manifest.water.liquidPalette, {
        shallow: '#FFC44A',
        deep: '#E85D08',
        foam: '#FFF3C4',
        gas: '#FFF9E6',
        scatter: '#FF9828'
    });
    assert.deepEqual(manifest.water.optics, {
        absorption: [0.18, 0.72, 1.55],
        density: 1.18,
        refractionStrength: 0.018,
        fresnel: 0.36,
        meniscusRise: 0.018
    });
    assert.deepEqual(manifest.water.carbonation, {
        risingBubbles: 72,
        microBubbles: 168,
        nucleationSites: 12,
        wallBubbles: 36,
        growth: 0.32,
        minimumRiseSpeed: 0.055,
        maximumRiseSpeed: 0.14
    });
    assert.deepEqual(manifest.water.surfaceWave, {
        samples: 128,
        propagation: 0.225,
        velocityRetention: 0.996,
        displacementRetention: 0.99965,
        reflection: 0.82,
        maximumAmplitude: 0.086,
        impulseRadius: 7,
        impulseGain: 0.0135,
        capillaryAmplitude: 0.012,
        capillaryFrequency: 28
    });
    assert.deepEqual(manifest.water.glass, {
        backgroundAsset: 'assets/glass-jar-interior-v1.webp',
        material: 'clear-molded-glass',
        centerClearance: 72,
        liquidDepth: 0.72,
        interiorMask: {
            sideInset: 0.075,
            centerFloor: 0.072,
            edgeFloor: 0.18,
            bottomCurve: 2,
            ceiling: 0.955,
            shoulderDepth: 0.055,
            feather: 0.012
        }
    });
    assert.ok(manifest.water.bubbles >= 60);
    assert.match(runtime, /liquid-physics\.js/);
    assert.match(runtime, /uSurfaceProfile/);
    assert.match(runtime, /setWaveStyle/);
    assert.match(runtime, /uJarDepth/);
    assert.match(runtime, /opticalPath/);
    assert.match(runtime, /surfaceUnderside/);
    assert.doesNotMatch(runtime, /uDensityField/);
    assert.doesNotMatch(runtime, /float waveA|float waveB|float waveC/);
});

test('orange soda shader refracts the real jar backdrop with exponential volume absorption', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');

    assert.equal(manifest.water.renderer, 'refracted-backdrop-volume');
    assert.match(runtime, /new THREE\.TextureLoader\(\)/);
    assert.match(runtime, /uJarBackdrop/);
    assert.match(runtime, /texture2D\(uJarBackdrop,\s*clamp\(refractedUv/);
    assert.match(runtime, /exp\(-uAbsorption \* liquidPath\)/);
    assert.match(runtime, /setSodaStyle/);
    assert.doesNotMatch(runtime, /uPulpColor|pulpCell|float pulp/);
});

test('revision 2 transparent glass never replaces the water with an opaque ink panel', () => {
    const css = fs.readFileSync(path.join(boxRoot, 'lesson-flow.css'), 'utf8');

    assert.match(css, /backdrop-filter:\s*blur\(/);
    assert.match(css, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[4-9]\)/);
    assert.match(css, /lesson-flow__context\[hidden\][\s\S]*display:\s*none\s*!important/);
    assert.doesNotMatch(css, /var\(--lesson-flow-ink\)\s*78%/);
    assert.match(css, /lesson-flow__primary\.is-countdown[^}]*background-clip:\s*text/s);
});

test('enchanted glass crest CSS replaces the plain pill without covering the liquid', () => {
    const css = fs.readFileSync(path.join(boxRoot, 'lesson-flow.css'), 'utf8');

    assert.match(css, /\.lesson-flow__title::before/);
    assert.match(css, /\.lesson-flow__title::after/);
    assert.match(css, /clip-path:\s*polygon/);
    assert.match(css, /\.lesson-flow__kicker::before/);
    assert.match(css, /\.lesson-flow__kicker::after/);
    assert.match(css, /\.lesson-flow__separator/);
    assert.match(css, /@keyframes lesson-flow-separator-breathe/);
    assert.match(css, /background-clip:\s*text/);
    assert.match(css, /prefers-reduced-motion/);
    assert.doesNotMatch(css, /\.lesson-flow__title\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.09\)/s);
});

test('kicker light rails remain visible at the real 1080p card height', () => {
    const css = fs.readFileSync(path.join(boxRoot, 'lesson-flow.css'), 'utf8');

    assert.match(css, /lesson-flow__kicker\s*\{[^}]*font:\s*950 clamp\(0\.5[6-9]rem,\s*4\.[0-9]+cqw/s);
    assert.match(css, /lesson-flow__kicker::before,[\s\S]*?height:\s*max\(1px,\s*0\.[3-9]\d*cqh\)/);
    assert.match(css, /lesson-flow__kicker::before,[\s\S]*?min-width:\s*1\.[5-9]\d*rem/);
});

test('orange soda sits inside a box-local optical glass jar', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    const { resolveJarInteriorBounds } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');
    const css = fs.readFileSync(path.join(boxRoot, 'lesson-flow.css'), 'utf8');

    assert.equal(typeof resolveJarInteriorBounds, 'function');
    assert.deepEqual(manifest.water.glass.interiorMask, {
        sideInset: 0.075,
        centerFloor: 0.072,
        edgeFloor: 0.18,
        bottomCurve: 2,
        ceiling: 0.955,
        shoulderDepth: 0.055,
        feather: 0.012
    });
    const center = resolveJarInteriorBounds(0, manifest.water.glass.interiorMask);
    const innerEdge = resolveJarInteriorBounds(0.82, manifest.water.glass.interiorMask);
    const wall = resolveJarInteriorBounds(0.9, manifest.water.glass.interiorMask);
    assert.equal(center.inside, true);
    assert.equal(innerEdge.inside, true);
    assert.equal(wall.inside, false);
    assert.ok(innerEdge.floor > center.floor + 0.15, 'oval jar floor must rise toward both side walls');
    assert.ok(innerEdge.ceiling < center.ceiling, 'rounded jar shoulder must close toward the side walls');
    assert.match(runtime, /jarInteriorMask\(vec2 uv\)/);
    assert.match(runtime, /body \*= jarInteriorMask\(vUv\)/);
    assert.match(runtime, /bounds\.floor/);
    assert.match(css, /--lesson-flow-glass-edge:/);
    assert.match(css, /glass-jar-interior-v1\.webp/);
    assert.match(css, /\.lesson-flow__glow::before/);
    assert.match(css, /\.lesson-flow__glow::after/);
    assert.match(css, /inset:\s*3\.2%\s+4\.4%\s+4\.8%/);
    assert.match(css, /backdrop-filter:\s*blur\(0\.16cqw\)\s+saturate\(1\.12\)/);
    assert.match(css, /inset\s+0\s+-[\d.]+cqh\s+[\d.]+cqh/);
});

test('jar floor follows a true ellipse instead of a steep power ramp', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    const { resolveJarInteriorBounds } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const mask = manifest.water.glass.interiorMask;

    assert.equal(mask.bottomCurve, 2);
    const center = resolveJarInteriorBounds(0, mask);
    const halfway = resolveJarInteriorBounds(center.maxX * 0.5, mask);
    const ellipseRise = 1 - Math.sqrt(1 - (0.5 ** 2));
    const expectedFloor = -1 + (2 * (mask.centerFloor + ((mask.edgeFloor - mask.centerFloor) * ellipseRise)));
    assert.ok(Math.abs(halfway.floor - expectedFloor) < 0.000001);
});

test('carbonation nucleation sites originate inside the curved jar floor', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'lesson-flow.json'), 'utf8'));
    const { buildCarbonationSites, resolveJarInteriorBounds } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const mask = manifest.water.glass.interiorMask;
    const sites = buildCarbonationSites(manifest.water.carbonation.nucleationSites, mask);

    assert.equal(sites.length, 12);
    assert.equal(new Set(sites.map(site => site.x.toFixed(5))).size, 12);
    sites.forEach(site => {
        const bounds = resolveJarInteriorBounds(site.x, mask);
        assert.equal(bounds.inside, true);
        assert.ok(site.y >= bounds.floor + 0.017 && site.y <= bounds.floor + 0.019);
        assert.ok(site.phase >= 0 && site.phase < Math.PI * 2);
    });
    assert.notDeepEqual(
        sites.map(site => site.x.toFixed(4)).sort(),
        sites.map(site => (-site.x).toFixed(4)).sort(),
        'natural carbonation chains must not form a perfectly mirrored grid'
    );
});

test('carbonation renderer adds micro streams and wall-attached bubbles', () => {
    const runtime = fs.readFileSync(path.join(boxRoot, 'lesson-flow.js'), 'utf8');

    assert.match(runtime, /buildCarbonationSites\(12/);
    assert.match(runtime, /new THREE\.InstancedMesh\(microBubbleGeometry,\s*microBubbleMaterial,\s*168\)/s);
    assert.match(runtime, /wallAttached/);
    assert.match(runtime, /microBubbleMesh\.instanceMatrix\.needsUpdate\s*=\s*true/);
    assert.match(runtime, /setCarbonationStyle/);
});

test('real LiquidFun adapter creates bounded water particles for the requested fill volume', async () => {
    const physicsPath = path.join(boxRoot, 'liquid-physics.js');
    const vendorPath = path.join(root, 'public/vendor/liquidfun/liquidfun.module.js');
    assert.ok(fs.existsSync(physicsPath), 'liquid-physics.js must exist');
    assert.ok(fs.existsSync(vendorPath), 'local LiquidFun browser bundle must exist');

    const physicsModule = require(physicsPath);
    const engine = await import(pathToFileURL(vendorPath).href);
    const physics = physicsModule.createLiquidPhysics(engine, { maxParticles: 320, seed: 17 });
    physics.setTargetFill(0.5);
    for (let index = 0; index < 240; index += 1) physics.step(1 / 60);

    const snapshot = physics.getSnapshot();
    assert.ok(snapshot.particleCount >= 130 && snapshot.particleCount <= 180);
    assert.equal(snapshot.positions.length, snapshot.particleCount * 2);
    for (let index = 0; index < snapshot.positions.length; index += 2) {
        assert.ok(snapshot.positions[index] >= -1 && snapshot.positions[index] <= 1);
        assert.ok(snapshot.positions[index + 1] >= 0 && snapshot.positions[index + 1] <= 1);
    }
    physics.dispose();
});

test('LiquidFun exposes one continuous free-surface profile instead of particle rows', async () => {
    const physicsPath = path.join(boxRoot, 'liquid-physics.js');
    const vendorPath = path.join(root, 'public/vendor/liquidfun/liquidfun.module.js');
    const physicsModule = require(physicsPath);
    const engine = await import(pathToFileURL(vendorPath).href);
    const physics = physicsModule.createLiquidPhysics(engine, { maxParticles: 360, seed: 23 });

    assert.deepEqual(Array.from(physics.getSurfaceProfile(64)), Array(64).fill(0));

    physics.setTargetFill(0.62);
    physics.step(1 / 60);
    const immediateProfile = physics.getSurfaceProfile(64);
    const immediateMean = immediateProfile.reduce((total, value) => total + value, 0) / immediateProfile.length;
    assert.ok(Math.abs(immediateMean - 0.62) < 0.025, 'visible fill must immediately match countdown progress');

    for (let index = 0; index < 260; index += 1) physics.step(1 / 60);
    physics.disturb(-0.32, 0.72);
    for (let index = 0; index < 18; index += 1) physics.step(1 / 60);

    const profile = physics.getSurfaceProfile(64);
    assert.equal(profile.length, 64);
    assert.ok(profile.every(value => value >= 0 && value <= 1));
    assert.ok(Math.min(...profile) > 0.35, 'settled water must span the full tank width');
    assert.ok(Math.max(...profile) - Math.min(...profile) > 0.004, 'physical disturbance must shape the free surface');

    const settledMean = profile.reduce((total, value) => total + value, 0) / profile.length;
    assert.ok(Math.abs(settledMean - 0.62) < 0.025, 'physical settling must not desynchronize the fill level');

    physics.setTargetFill(1);
    physics.step(1 / 60);
    assert.ok(physics.getSurfaceProfile(64).every(value => value === 1), '100% progress must fill the water surface completely');

    physics.dispose();
});

test('controller renders status events and releases listeners on dispose', () => {
    const { createLessonFlowController } = require('../public/themes/magic-park/boxes/lesson-flow/lesson-flow.js');
    const listeners = new Map();
    const nodes = Object.fromEntries([
        'lesson-flow-title', 'lesson-flow-primary', 'lesson-flow-current',
        'lesson-flow-kicker', 'lesson-flow-next-label', 'lesson-flow-next'
    ].map(id => [id, { textContent: '', style: {}, hidden: false }]));
    const box = { hidden: true, dataset: {}, querySelector: () => null };
    const documentObject = {
        body: { dataset: { theme: 'magic-park' } },
        getElementById(id) { return id === 'countdown-card' ? box : nodes[id] || null; }
    };
    const windowObject = {
        addEventListener(type, handler) { listeners.set(type, handler); },
        removeEventListener(type) { listeners.delete(type); },
        matchMedia: () => ({ matches: true })
    };
    const controller = createLessonFlowController({ window: windowObject, document: documentObject }).init();

    listeners.get('classroom:schedule-status-updated')({ detail: {
        scheduleSource: 'external',
        status: { mode: 'in-class', countdown: '18:00', currentPeriodNumber: 3, currentPeriodName: 'Türkçe', nextLessonName: 'Matematik', progress: 55 }
    } });

    assert.equal(box.dataset.lessonFlowMode, 'in-class');
    assert.equal(nodes['lesson-flow-kicker'].textContent, 'TENEFFÜSE KALAN');
    assert.equal(nodes['lesson-flow-title'].textContent, '3. DERS');
    assert.equal(nodes['lesson-flow-primary'].textContent, '18:00');
    assert.equal(nodes['lesson-flow-current'].textContent, 'Türkçe');
    assert.equal(nodes['lesson-flow-next'].textContent, 'Matematik');

    controller.dispose();
    assert.equal(listeners.has('classroom:schedule-status-updated'), false);
});

test('lesson flow visuals are owned only by the box stylesheet', () => {
    const shared = [
        'public/css/kiosk-magic-park.css',
        'public/themes/magic-park/magic-components.css',
        'public/themes/magic-park/magic-states.css'
    ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

    assert.doesNotMatch(shared, /lesson-flow-scene|before-school-mode|countdown-mode|goodbye-mode|period-context/);
});

test('dashboard publishes one schedule status event from the existing ScheduleManager result', () => {
    const script = fs.readFileSync(path.join(root, 'public/js/script.js'), 'utf8');
    assert.match(script, /new CustomEvent\('classroom:schedule-status-updated'/);
    assert.match(script, /detail:\s*\{\s*status,\s*scheduleSource,/s);
});
