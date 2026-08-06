const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adminHtml = fs.readFileSync(
    path.join(__dirname, '../public/admin/index.html'),
    'utf8'
);
const settingsHandlerPath = path.join(__dirname, '../public/admin/settings-handler.js');
const dashboardHtml = fs.readFileSync(
    path.join(__dirname, '../public/index.html'),
    'utf8'
);
const noiseMeterSource = fs.readFileSync(
    path.join(__dirname, '../public/js/noise-meter.js'),
    'utf8'
);
const adminScript = fs.readFileSync(
    path.join(__dirname, '../public/admin/admin.js'),
    'utf8'
);
const removedScheduleFiles = [
    '../public/admin/schedule-diagnostics.js',
    '../public/admin/schedule-draft-editor.js',
    '../public/admin/schedule-review-panel.js',
    './admin-schedule-diagnostics.test.js',
    './admin-schedule-draft-editor.test.js',
    './admin-schedule-review-panel.test.js'
];

test('admin paneli gereksiz ses ayarlarını sunmaz', () => {
    const removedUi = [
        'id="clockFormat"',
        'id="slideshowAutoPlay"',
        'id="slideshowLoop"',
        'id="slideshowProgress"',
        'id="displayModeNormal"',
        'id="themeLight"',
        'id="fontSize"',
        'id="autoRefreshInterval"',
        'id="theme-btn-neon"',
        'id="admin-noise-preview"',
        'id="noiseSensitivity"',
        'id="warningThreshold"',
        'id="dangerThreshold"',
        'onclick="testNoiseMeter()"',
        'id="settings"',
        '>Ses Ayarları</button>',
        'onclick="saveAllSettings()"',
        '>Sistem Bilgisi</h3>'
    ];

    removedUi.forEach(fragment => assert.ok(!adminHtml.includes(fragment), fragment));
    assert.doesNotMatch(adminHtml, /settings-handler\.js/);
    assert.strictEqual(fs.existsSync(settingsHandlerPath), false);
});

test('öğrenci ekranı tek tema ve otomatik ses kalibrasyonu kullanır', () => {
    assert.match(dashboardHtml, /class="equalizer-container" id="equalizer-container"/);
    assert.doesNotMatch(dashboardHtml, /equalizer-container theme-/);
    assert.match(noiseMeterSource, /getByteTimeDomainData/);
    assert.match(noiseMeterSource, /updateCalibration\(decibels\)/);
    assert.match(noiseMeterSource, /resolveLevel\(percentage\)/);
    assert.doesNotMatch(
        noiseMeterSource,
        /equalizer_theme|setTheme\(|this\.themes|noiseSensitivity|warning_threshold|danger_threshold|settingsLoaded/
    );
});

test('admin ana menüsü günlük işlere odaklanır ve sistem kayıtlarını korur', () => {
    const primaryTabs = [...adminHtml.matchAll(/<button class="tab-btn(?: active)?"[^>]*>([^<]+)<\/button>/g)]
        .map(match => match[1].trim());

    assert.deepStrictEqual(primaryTabs, ['Öğrenciler', 'Görevler', 'Yoklama', 'Slaytlar']);
    assert.match(adminHtml, /id="systemButton"[^>]*onclick="showTab\('error-logs'\)"[^>]*>⚙️ Sistem<\/button>/);
    assert.match(adminHtml, /<div id="error-logs" class="content-section">/);
    assert.match(adminHtml, /<script src="error-logs\.js"><\/script>/);
    assert.doesNotMatch(adminHtml, /scheduleDiagnostics|Ders Programı Tanılama|Ders Programı Taslağı|schedule-(?:diagnostics|draft-editor|review-panel)\.js|schedule-normalizer\.js/);
    assert.doesNotMatch(adminScript, /AdminSchedule|scheduleDiagnostics|loadScheduleIntegration|ScheduleNormalizer/);

    removedScheduleFiles.forEach(relativePath => {
        assert.strictEqual(fs.existsSync(path.join(__dirname, relativePath)), false, relativePath);
    });
});
