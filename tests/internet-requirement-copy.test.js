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

    await t.test('2. README.md clearly states the current local-first operating model', () => {
        assert.ok(readmeContent.includes('yerel-first'), 'README missing local-first operating model');
        assert.ok(
            readmeContent.includes("dış CDN'e bağımlı değildir"),
            'README must explain that the admin Excel runtime is local rather than CDN-dependent'
        );
    });

    await t.test('3. The requirements section no longer claims active internet is mandatory', () => {
        const matchCount = (readmeContent.match(/Aktif internet bağlantısı/g) || []).length;
        assert.strictEqual(matchCount, 0, 'README must not claim active internet is a runtime requirement');
        assert.ok(readmeContent.includes('Node.js >=22 <25'), 'README must retain the actual Node runtime requirement');
    });

    await t.test('4. public/admin/index.html no longer contains "İnternet bağlantısı gerekmez"', () => {
        assert.ok(!adminHtmlContent.includes('İnternet bağlantısı gerekmez'), 'Admin HTML contains stale "İnternet bağlantısı gerekmez"');
    });

    await t.test('5. The simplified admin HTML omits the retired system requirement card', () => {
        const msg = '🌐 Sistem ve harici kaynaklar için internet bağlantısı gereklidir.';
        const matchCount = (adminHtmlContent.match(new RegExp(msg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        assert.strictEqual(matchCount, 0, 'Admin HTML must not restore the retired system requirement card');
    });

    await t.test('6. The known stale phrase "offline operation" is absent from public/admin/index.html and public/admin/admin.js', () => {
        assert.ok(!adminHtmlContent.includes('offline operation'), 'Admin HTML contains "offline operation"');
        assert.ok(!adminJsContent.includes('offline operation'), 'Admin JS contains "offline operation"');
    });

    await t.test('7. The retired SheetJS CDN URL is absent from the admin HTML', () => {
        assert.ok(!adminHtmlContent.includes('cdn.sheetjs.com'), 'Admin HTML still depends on the SheetJS CDN');
    });

    await t.test('8. The local SheetJS runtime URL appears exactly once in the admin HTML', () => {
        const localUrl = '/vendor/sheetjs/xlsx.full.min.js';
        const matchCount = (adminHtmlContent.match(new RegExp(localUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        assert.strictEqual(matchCount, 1, 'Admin HTML must contain exactly one local SheetJS runtime URL');
    });

    await t.test('9. Local SheetJS still loads before admin.js without restoring retired admin structure', () => {
        const xlsxTag = '<script src="/vendor/sheetjs/xlsx.full.min.js"></script>';
        const adminTag = '<script src="admin.js"></script>';
        const xlsxIndex = adminHtmlContent.indexOf(xlsxTag);
        const adminIndex = adminHtmlContent.indexOf(adminTag);
        assert.ok(xlsxIndex >= 0, 'Local SheetJS script tag not intact');
        assert.ok(adminIndex >= 0, 'admin.js script tag not intact');
        assert.ok(xlsxIndex < adminIndex, 'SheetJS must load before admin.js');
    });
});
