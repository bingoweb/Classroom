const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Internet Requirement Copy Tests', async (t) => {
    const readmePath = path.join(__dirname, '..', 'README.md');
    const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin', 'index.html');
    const adminJsPath = path.join(__dirname, '..', 'public', 'admin', 'admin.js');

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const adminHtmlContent = fs.readFileSync(adminHtmlPath, 'utf8');
    const adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

    await t.test('1. README.md no longer contains "offline çalışabilen"', () => {
        assert.ok(!readmeContent.includes('offline çalışabilen'), 'README contains stale "offline çalışabilen"');
    });

    await t.test('2. README.md clearly states internet-connected operation', () => {
        assert.ok(readmeContent.includes('internet bağlantısı ile çalışan'), 'README missing internet connection statement');
    });

    await t.test('3. The requirements section contains exactly one "Aktif internet bağlantısı"', () => {
        const matchCount = (readmeContent.match(/Aktif internet bağlantısı/g) || []).length;
        assert.strictEqual(matchCount, 1, 'README must contain exactly one "Aktif internet bağlantısı"');
    });

    await t.test('4. public/admin/index.html no longer contains "İnternet bağlantısı gerekmez"', () => {
        assert.ok(!adminHtmlContent.includes('İnternet bağlantısı gerekmez'), 'Admin HTML contains stale "İnternet bağlantısı gerekmez"');
    });

    await t.test('5. The admin HTML contains exactly one system requirement message', () => {
        const msg = '🌐 Sistem ve harici kaynaklar için internet bağlantısı gereklidir.';
        const matchCount = (adminHtmlContent.match(new RegExp(msg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        assert.strictEqual(matchCount, 1, 'Admin HTML must contain exactly one system requirement message');
    });

    await t.test('6. The known stale phrase "offline operation" is absent from public/admin/index.html and public/admin/admin.js', () => {
        assert.ok(!adminHtmlContent.includes('offline operation'), 'Admin HTML contains "offline operation"');
        assert.ok(!adminJsContent.includes('offline operation'), 'Admin JS contains "offline operation"');
    });

    await t.test('7. The SheetJS CDN URL remains present exactly once in the admin HTML', () => {
        const cdnUrl = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        const matchCount = (adminHtmlContent.match(new RegExp(cdnUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        assert.strictEqual(matchCount, 1, 'Admin HTML must contain exactly one SheetJS CDN URL');
    });

    await t.test('8. The admin HTML does not contain /vendor/xlsx.full.min.js', () => {
        assert.ok(!adminHtmlContent.includes('/vendor/xlsx.full.min.js'), 'Admin HTML contains localized SheetJS path');
    });

    await t.test('9. No production behavior, script ordering or existing admin section structure is altered', () => {
        assert.ok(adminHtmlContent.includes('<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>'), 'SheetJS script tag not intact');
        assert.ok(adminHtmlContent.includes('<script src="admin.js"></script>'), 'admin.js script tag not intact');
    });
});
