'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const boxRoot = path.join(root, 'public/themes/magic-park/boxes/attendance');

function readPngContract(filePath) {
    const bytes = fs.readFileSync(filePath);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
        colorType: bytes[25],
        size: bytes.length
    };
}

test('attendance box owns a valid manifest and entrypoints', () => {
    for (const name of ['attendance.css', 'attendance.json', 'attendance.js', 'README.md']) {
        assert.ok(fs.statSync(path.join(boxRoot, name)).size > 0, `${name} must exist and be non-empty`);
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'attendance.json'), 'utf8'));
    assert.deepEqual(manifest.visibleFields, ['total', 'girls', 'boys']);
    assert.deepEqual(manifest.sceneOrder, ['total', 'girls', 'boys']);
    assert.deepEqual(manifest.timingMs, {
        scene: 6000,
        enter: 700,
        holdUntil: 5200,
        overlap: 450,
        numberSettle: 650
    });
    assert.deepEqual(manifest.motion, {
        direction: 'left-to-right',
        genderRevealOrder: ['character', 'label', 'number']
    });
    assert.equal(manifest.capabilities.three, true);
    assert.equal(manifest.capabilities.cssFallback, true);
    assert.deepEqual(manifest.characterPresentation, {
        anchor: 'left',
        horizontalFlip: false,
        foregroundOcclusion: 'none'
    });

    const themeCss = fs.readFileSync(path.join(root, 'public/themes/magic-park/theme.css'), 'utf8');
    assert.match(themeCss, /boxes\/attendance\/attendance\.css/);
});

test('scene model exposes only the three approved labels and values', () => {
    const { buildAttendanceSceneModel } = require('../public/themes/magic-park/boxes/attendance/attendance.js');

    assert.deepEqual(buildAttendanceSceneModel({ total: 24, girls: 12, boys: 12 }), [
        { id: 'total', label: 'SINIF MEVCUDU', value: 24 },
        { id: 'girls', label: 'KIZ ÖĞRENCİ', value: 12 },
        { id: 'boys', label: 'ERKEK ÖĞRENCİ', value: 12 }
    ]);
});

test('scene model normalizes missing and invalid counts without exposing attendance details', () => {
    const { buildAttendanceSceneModel } = require('../public/themes/magic-park/boxes/attendance/attendance.js');

    const scenes = buildAttendanceSceneModel({
        total: -1,
        girls: '7.9',
        boys: 'invalid',
        todayPresent: 19,
        todayAbsent: 2,
        absentStudents: [{ name: 'Ada' }]
    });

    assert.deepEqual(scenes, [
        { id: 'total', label: 'SINIF MEVCUDU', value: 0 },
        { id: 'girls', label: 'KIZ ÖĞRENCİ', value: 7 },
        { id: 'boys', label: 'ERKEK ÖĞRENCİ', value: 0 }
    ]);
    assert.deepEqual(Object.keys(scenes[0]), ['id', 'label', 'value']);
});

test('attendance character assets are high-resolution alpha PNGs', () => {
    for (const name of ['attendance-girl.png', 'attendance-boy.png']) {
        const asset = readPngContract(path.join(boxRoot, 'assets', name));
        assert.ok(asset.width >= 1024 && asset.height >= 1024, `${name} must be at least 1024×1024`);
        assert.equal(asset.colorType, 6, `${name} must use RGBA colour type`);
        assert.ok(asset.size > 100_000, `${name} is unexpectedly empty`);
    }
});

test('kiosk markup provides exactly three Magic Park attendance scenes and keeps the legacy attendance surface separate', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const sceneIds = [...html.matchAll(/data-attendance-scene="([^"]+)"/g)].map(([, id]) => id);

    assert.deepEqual(sceneIds, ['total', 'girls', 'boys']);
    assert.match(html, /id="magic-attendance-box"[^>]*data-attendance-box/);
    assert.match(html, /data-attendance-value="total"/);
    assert.match(html, /data-attendance-value="girls"/);
    assert.match(html, /data-attendance-value="boys"/);
    assert.match(html, />SINIF MEVCUDU</);
    assert.match(html, />KIZ ÖĞRENCİ</);
    assert.match(html, />ERKEK ÖĞRENCİ</);
    assert.match(html, /boxes\/attendance\/assets\/attendance-girl\.png/);
    assert.match(html, /boxes\/attendance\/assets\/attendance-boy\.png/);
    assert.match(html, /class="attendance-legacy-details"/);
    assert.doesNotMatch(html, /magic-attendance__blocks|magic-attendance__abacus/,
        'the already decorated foreground must not be crowded with duplicate toys');

    const attendanceScriptIndex = html.indexOf('themes/magic-park/boxes/attendance/attendance.js');
    const dashboardScriptIndex = html.indexOf('js/script.js?v=13');
    assert.ok(attendanceScriptIndex > -1, 'attendance runtime must be loaded');
    assert.ok(attendanceScriptIndex < dashboardScriptIndex, 'attendance runtime must subscribe before dashboard stats arrive');
});

test('attendance controller reveals the Magic Park surface and binds only the three approved stats', () => {
    const { createAttendanceController } = require('../public/themes/magic-park/boxes/attendance/attendance.js');
    const values = {
        total: { textContent: '--' },
        girls: { textContent: '--' },
        boys: { textContent: '--' }
    };
    const listeners = new Map();
    const rootElement = {
        hidden: true,
        dataset: {},
        querySelector(selector) {
            const match = selector.match(/data-attendance-value="([^"]+)"/);
            return match ? values[match[1]] : null;
        }
    };
    const windowObject = {
        addEventListener(type, handler) { listeners.set(type, handler); },
        removeEventListener(type) { listeners.delete(type); }
    };
    const documentObject = {
        body: { dataset: { theme: 'magic-park' } },
        getElementById(id) { return id === 'magic-attendance-box' ? rootElement : null; }
    };
    const controller = createAttendanceController({ window: windowObject, document: documentObject });

    controller.init();
    assert.equal(rootElement.hidden, false);
    listeners.get('classroom:stats-updated')({
        detail: { total: 24, girls: 12, boys: 12, todayAbsent: 3 }
    });
    assert.deepEqual(Object.fromEntries(Object.entries(values).map(([key, node]) => [key, node.textContent])), {
        total: '24', girls: '12', boys: '12'
    });

    controller.dispose();
    assert.equal(listeners.has('classroom:stats-updated'), false);
});

test('attendance controller rotates total, girls and boys in manifest order every six seconds', () => {
    const { createAttendanceController } = require('../public/themes/magic-park/boxes/attendance/attendance.js');
    const makeScene = () => {
        const classes = new Set();
        return {
            classes,
            classList: {
                add: value => classes.add(value),
                remove: value => classes.delete(value)
            },
            setAttribute(name, value) { this[name] = value; }
        };
    };
    const scenes = [makeScene(), makeScene(), makeScene()];
    const timers = [];
    const rootElement = {
        hidden: true,
        dataset: {},
        querySelector: () => null,
        querySelectorAll: selector => selector === '[data-attendance-scene]' ? scenes : []
    };
    const documentObject = {
        body: { dataset: { theme: 'magic-park' } },
        getElementById: id => id === 'magic-attendance-box' ? rootElement : null
    };
    const windowObject = {
        gsap: null,
        matchMedia: () => ({ matches: false }),
        addEventListener() {},
        removeEventListener() {},
        setTimeout(handler, delay) { timers.push({ handler, delay }); return timers.length; },
        clearTimeout() {}
    };
    const controller = createAttendanceController({ window: windowObject, document: documentObject });

    controller.init();
    assert.equal(scenes[0].classes.has('is-active'), true);
    assert.equal(timers[0].delay, 6000);
    timers[0].handler();
    assert.equal(scenes[0].classes.has('is-active'), false);
    assert.equal(scenes[1].classes.has('is-active'), true);
});

test('gender scenes travel left-to-right and reveal child, label, then number', () => {
    const runtime = fs.readFileSync(path.join(boxRoot, 'attendance.js'), 'utf8');
    const css = fs.readFileSync(path.join(boxRoot, 'attendance.css'), 'utf8');

    assert.match(css, /\.magic-attendance__scene\s*\{[^}]*translate3d\(-6%/s);
    assert.match(css, /\.magic-attendance__scene--girls \.magic-attendance__copy,[\s\S]*?left:\s*41%/);
    assert.match(runtime, /gsap\.set\?\.\(next,\s*\{[^}]*xPercent:\s*-7/s);
    assert.match(runtime, /previous,\s*\{[^}]*xPercent:\s*6/s);
    const characterReveal = runtime.indexOf("if (character) timeline?.fromTo(character");
    const labelReveal = runtime.indexOf("if (label) timeline?.fromTo(label");
    const numberReveal = runtime.indexOf("if (number) timeline?.fromTo(number");
    assert.ok(characterReveal > -1 && characterReveal < labelReveal && labelReveal < numberReveal);
});

test('Three.js is pinned and exposed only through exact browser module routes', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
    const runtime = fs.readFileSync(path.join(boxRoot, 'attendance.js'), 'utf8');

    assert.equal(packageJson.dependencies.three, '0.185.1');
    assert.match(server, /\/vendor\/three\/three\.module\.min\.js/);
    assert.match(server, /\/vendor\/three\/three\.core\.min\.js/);
    assert.doesNotMatch(server, /express\.static\([^\n]*node_modules/);
    assert.match(runtime, /import\(['"]\/vendor\/three\/three\.module\.min\.js['"]\)/);
    assert.match(runtime, /PlaneGeometry/);
    assert.match(runtime, /windowObject\?\.gsap|windowObject\.gsap/);
});

test('Magic Park foreground stays above a left-anchored character composition without flower-pocket staging', () => {
    const css = fs.readFileSync(path.join(boxRoot, 'attendance.css'), 'utf8');
    const layout = fs.readFileSync(path.join(root, 'public/themes/magic-park/magic-layout.css'), 'utf8');

    assert.match(layout, /\.bento-grid::after\s*\{[^}]*z-index:\s*20/s);
    assert.match(css, /\.magic-attendance__character\s*\{[^}]*position:\s*absolute[^}]*left:[^;}]+;[^}]*bottom:[^;}]+;[^}]*z-index:\s*[1-9]/s);
    assert.match(css, /\.magic-attendance__character--girl\s*\{/);
    assert.match(css, /\.magic-attendance__character--boy\s*\{/);
    assert.match(css, /\.attendance-legacy-details\s*\{[^}]*display:\s*none/s);
});

test('attendance surface is bright and the labels and numbers use glossy dimensional treatments', () => {
    const css = fs.readFileSync(path.join(boxRoot, 'attendance.css'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'attendance.json'), 'utf8'));

    assert.notEqual(manifest.palette.ink.toLowerCase(), '#03040d');
    assert.doesNotMatch(css, /background:[^;{}]*#03040d/);
    assert.match(css, /\.magic-attendance\s*\{[^}]*linear-gradient[^}]*#(?:[a-f\d]{6})/is);
    assert.match(css, /\.magic-attendance__label\s*\{[^}]*linear-gradient[^}]*box-shadow:/is);
    assert.match(css, /\.magic-attendance__number\s*\{[^}]*linear-gradient[^}]*background-clip:\s*text[^}]*text-shadow:/is);
});

test('attendance visuals are owned only by the box-local stylesheet', () => {
    const sharedSources = [
        'public/themes/magic-park/magic-components.css',
        'public/themes/magic-park/magic-states.css',
        'public/css/kiosk-magic-park.css'
    ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

    assert.doesNotMatch(sharedSources, /attendance-scene|attendance-mini-page|attendance-hero|attendance-wrapper|gender-box/);
});
