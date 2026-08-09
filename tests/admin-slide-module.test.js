const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public/admin/admin.js');
const htmlPath = path.join(root, 'public/admin/index.html');
const slidesPath = path.join(root, 'public/admin/js/slides.js');
const packagePath = path.join(root, 'package.json');

test('P3-5B4.1 extracts admin slide read/render behavior into a classic-script module', () => {
    assert.strictEqual(
        fs.existsSync(slidesPath),
        true,
        'public/admin/js/slides.js must exist'
    );

    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const htmlSource = fs.readFileSync(htmlPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const attendanceScript = '<script src="js/attendance.js"></script>';
    const slidesScript = '<script src="js/slides.js"></script>';
    const adminScript = '<script src="admin.js"></script>';

    assert.ok(htmlSource.includes(slidesScript), 'admin HTML loads slides.js');
    assert.ok(
        htmlSource.indexOf(attendanceScript) < htmlSource.indexOf(slidesScript),
        'slides.js loads after attendance.js'
    );
    assert.ok(
        htmlSource.indexOf(slidesScript) < htmlSource.indexOf(adminScript),
        'slides.js loads before admin.js'
    );

    assert.match(slidesSource, /window\.AdminSlides\s*=\s*\{/);
    assert.match(slidesSource, /function renderSlides\(slides\)/);
    assert.match(slidesSource, /Utils\.normalizePath\(mediaPath, true\)/);
    assert.match(slidesSource, /slide-item\$\{isActive \? '' : ' is-inactive'\}/);
    assert.match(slidesSource, /Pasif Yap/);
    assert.match(slidesSource, /Aktif Yap/);

    assert.match(adminSource, /AdminSlides\.init\(\{[\s\S]*setupDragAndDrop[\s\S]*\}\)/);
    assert.match(adminSource, /AdminSlides\.renderSlides\(allSlides\)/);
    assert.doesNotMatch(adminSource, /function renderSlides\(slides\)/);

    // B4.1 is read/render only. Later slide behaviors must stay in the shell for their own sub-waves.
    assert.match(adminSource, /function setupDragAndDrop\(\)/);
    assert.match(adminSource, /async function reorderSlides\(/);
    assert.match(adminSource, /window\.showSlideForm\s*=/);
    assert.match(adminSource, /window\.toggleSlideActive\s*=/);
    assert.match(adminSource, /async function handleSlideSettingsSubmit\(/);

    assert.strictEqual(
        packageJson.scripts['test:admin-slide-module'],
        'node --test tests/admin-slide-module.test.js',
        'package.json exposes the focused B4.1 structural test'
    );
    assert.match(
        packageJson.scripts['test:core'],
        /tests\/admin-slide-module\.test\.js/,
        'B4.1 structural regression stays in test:core'
    );
});
