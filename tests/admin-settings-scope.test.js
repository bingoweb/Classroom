const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adminHtml = fs.readFileSync(
    path.join(__dirname, '../public/admin/index.html'),
    'utf8'
);

function getDivContentsById(html, id) {
    const openingPattern = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
    const openingMatch = openingPattern.exec(html);

    assert.ok(openingMatch, `#${id} bölümü bulunamadı`);

    const start = openingMatch.index;
    const divPattern = /<div\b[^>]*>|<\/div\s*>/gi;
    divPattern.lastIndex = start;

    let depth = 0;
    let match;

    while ((match = divPattern.exec(html)) !== null) {
        if (/^<\/div/i.test(match[0])) {
            depth -= 1;
            if (depth === 0) {
                return html.slice(start, divPattern.lastIndex);
            }
        } else {
            depth += 1;
        }
    }

    assert.fail(`#${id} bölümü kapanmıyor`);
}

test('genel ayar eylemleri yalnızca Ayarlar sekmesinin içinde kalır', () => {
    const settingsHtml = getDivContentsById(adminHtml, 'settings');
    const outsideSettings = adminHtml.replace(settingsHtml, '');

    assert.match(settingsHtml, /onclick="saveAllSettings\(\)"/);
    assert.match(settingsHtml, />Sistem Bilgisi<\/h3>/);
    assert.doesNotMatch(outsideSettings, /onclick="saveAllSettings\(\)"/);
    assert.doesNotMatch(outsideSettings, />Sistem Bilgisi<\/h3>/);
});
