'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const readme = read('README.md');
const packageJson = JSON.parse(read('package.json'));

function markdownVersionPattern(name, version) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escapedName}\\s+(?:\\*\\*|__|\\x60)?${escapedVersion}(?:\\*\\*|__|\\x60)?`, 'i');
}

function assertNoLegacyActiveClaims(text, label) {
    assert.doesNotMatch(text, /daily_word/i, `${label} must not present removed daily_word as current`);
    assert.doesNotMatch(text, /OpenMeteo|open-meteo/i, `${label} must not present removed weather integration as current`);
    assert.doesNotMatch(text, /10\s+(?:farklı\s+)?(?:equalizer|ekolayzer)|equalizer.{0,30}tema/i,
        `${label} must not present removed equalizer theme UI as current`);
    assert.doesNotMatch(text, /schedule-diagnostics\.js|schedule-draft-editor\.js|schedule-review-panel\.js|settings-handler\.js/i,
        `${label} must not present removed admin prototype files as current`);
    assert.doesNotMatch(text, /gemini-service|gemini-client|nano-banana|generate-ai/i,
        `${label} must not resurrect removed AI experiments`);
}

function collectProjectMarkdown(directory, relative = '') {
    const found = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const absolute = path.join(directory, entry.name);
        const nextRelative = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            found.push(...collectProjectMarkdown(absolute, nextRelative));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            found.push(nextRelative.split(path.sep).join('/'));
        }
    }
    return found.sort();
}

test('documentation source-of-truth contract', async (t) => {
    await t.test('README remains the public GitHub surface and describes the current runtime', () => {
        assert.equal(packageJson.engines.node, '>=22 <25');
        assert.match(readme, /Node(?:\.js)?\s+22[^\n]*24|Node(?:\.js)?\s+22\s*\/\s*24/i);
        assert.match(readme, /2\/D Sihirli Pano|Sihirli Öğrenme Parkı|Magic Park/i);
        assert.match(readme, /Öğrenciler/);
        assert.match(readme, /Görevler/);
        assert.match(readme, /Yoklama/);
        assert.match(readme, /Slaytlar/);
        assert.match(readme, /CLASSROOM_ADMIN_PASSWORD/);
        assert.match(readme, markdownVersionPattern('Express', '4.22.2'));
        assert.match(readme, markdownVersionPattern('sqlite3', '6.0.1'));
        assert.match(readme, markdownVersionPattern('Multer', '2.2.0'));
        assert.match(readme, markdownVersionPattern('SheetJS', '0.20.3'));
        assert.doesNotMatch(readme, /cdn\.sheetjs\.com|cdnjs|unpkg\.com/i);
        assertNoLegacyActiveClaims(readme, 'README');
    });

    await t.test('README declares the split source-of-truth model', () => {
        assert.match(readme, /Obsidian\s+`Classroom\/`/i);
        assert.match(readme, /kanonik/i);
        assert.match(readme, /Git HEAD/i);
        assert.match(readme, /kod\/runtime|kod.*runtime/i);
        assert.match(readme, /dokümantasyon.*Obsidian|Obsidian.*dokümantasyon/i);
        assert.match(readme, /GitHub vitrini/i);
    });

    await t.test('operational Markdown is no longer duplicated in the repository', () => {
        assert.deepEqual(collectProjectMarkdown(root), ['README.md']);
        for (const legacyPath of [
            'AI_PROJECT_CONTEXT.md',
            'CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md',
            'docs/PROJE_OZETI.md',
            'docs/DEVELOPMENT_TOOLCHAIN.md',
            'docs/GRAPHICS_ASSET_TOOLCHAIN.md'
        ]) {
            assert.equal(fs.existsSync(path.join(root, legacyPath)), false, `${legacyPath} must live in Obsidian, not the repo`);
        }
    });

    await t.test('GitHub showcase images remain local even though Markdown documentation moved', () => {
        const imagePaths = [...readme.matchAll(/(?:src|href)=["'](docs\/images\/[^"']+)["']/g)]
            .map(match => match[1]);

        assert.ok(imagePaths.length >= 5, 'README must keep the full visual GitHub showcase set');
        assert.equal(new Set(imagePaths).size, imagePaths.length, 'README showcase image references must be unique');

        for (const imagePath of imagePaths) {
            assert.equal(fs.existsSync(path.join(root, imagePath)), true, `${imagePath} must remain available to README`);
            assert.ok(fs.statSync(path.join(root, imagePath)).size > 0, `${imagePath} must not be empty`);
        }
    });
});
