const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const kioskFiles = [
    'public/index.html',
    'public/css/style.css',
    'public/js/script.js',
    'public/js/schedule-manager.js',
    'public/js/noise-meter.js',
    'public/js/utils.js'
];

const requiredAssets = [
    'books.png',
    'calendar-weekend.png',
    'loudspeaker.png',
    'microphone.png',
    'quiet.png',
    'schedule-celebration.png',
    'schedule-flower.png',
    'schedule-fox.png',
    'schedule-moon.png',
    'schedule-sunrise.png',
    'schedule-weekend.png',
    'school-clock.png',
    'sparkles.png',
    'student-boy.png',
    'student-girl.png',
    'weather-partly-cloudy.png',
    'weather-rain.png',
    'weather-snow.png',
    'weather-sun.png'
];

test('student-facing kiosk uses repository-owned graphics instead of platform emoji', () => {
    const pictographic = /\p{Extended_Pictographic}/u;

    for (const relativePath of kioskFiles) {
        const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
        assert.equal(pictographic.test(source), false, `${relativePath} contains a platform emoji`);
        assert.doesNotMatch(source, /#icon-|<symbol\b|<use\b/, `${relativePath} contains a legacy SVG sprite reference`);
    }
});

test('every generated 3D kiosk asset is present and has a PNG signature', () => {
    for (const filename of requiredAssets) {
        const assetPath = path.join(root, 'public/assets/ui-icons-3d', filename);
        const buffer = fs.readFileSync(assetPath);
        assert.deepEqual(
            [...buffer.subarray(0, 8)],
            [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
            `${filename} is not a valid PNG file`
        );
    }
});

test('every primary kiosk card uses the shared title bar system', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const titleBars = [...html.matchAll(/class="([^"]*)"/g)]
        .filter(([, classNames]) => classNames.split(/\s+/).includes('card-titlebar'));

    assert.equal(titleBars.length, 8, 'all eight primary kiosk cards must use the shared title bar component');

    for (const title of [
        'Günün Zamanı',
        'Sınıf Mevcudu',
        'Ders Akışı',
        'Sınıfın Ses Dengesi',
        'Sınıfımızdan',
        'Sınıf Başkanı',
        'Nöbetçiler',
        'Haftanın Yıldızları'
    ]) {
        assert.ok(html.includes(title), `missing standardized title: ${title}`);
    }
});
