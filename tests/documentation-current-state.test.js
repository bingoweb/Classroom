'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const readme = read('README.md');
const aiContext = read('AI_PROJECT_CONTEXT.md');
const projectSummary = read('docs/PROJE_OZETI.md');
const packageJson = JSON.parse(read('package.json'));

const livingPlanName = 'Classroom Projesi — Önceliklendirilmiş Düzeltme Planı — 2026-08-08.md';
const tomographyName = 'CLASSROOM_PROJE_TOMOGRAFISI_2026-08-08.md';
const livingPlan = read(`Classroom Projesi/01 - Güncel Belgeler/${livingPlanName}`);

function markdownVersionPattern(name, version) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escapedName}\\s+(?:\\*\\*|__|\\x60)?${escapedVersion}(?:\\*\\*|__|\\x60)?`, 'i');
}

function assertNoLegacyActiveClaims(text, label) {
    assert.doesNotMatch(text, /daily_word/i, `${label} must not present removed daily_word as current`);
    assert.doesNotMatch(text, /OpenMeteo|open-meteo/i, `${label} must not present removed weather integration as current`);
    assert.doesNotMatch(text, /10\s+(?:farklı\s+)?(?:equalizer|ekolayzer)|equalizer.{0,30}tema/i, `${label} must not present removed equalizer theme UI as current`);
    assert.doesNotMatch(text, /schedule-diagnostics\.js|schedule-draft-editor\.js|schedule-review-panel\.js|settings-handler\.js/i,
        `${label} must not present removed admin prototype files as current`);
    assert.doesNotMatch(text, /gemini-service|gemini-client|nano-banana|generate-ai/i,
        `${label} must not resurrect removed AI experiments`);
}

test('current documentation source-of-truth contract', async (t) => {
    await t.test('README describes the current runtime, product surfaces, and local dependency model', () => {
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
        assert.match(readme, new RegExp(tomographyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(readme, /Önceliklendirilmiş Düzeltme Planı/);
        assertNoLegacyActiveClaims(readme, 'README');
    });

    await t.test('AI context is a current handoff instead of an old branch/task diary', () => {
        assert.match(aiContext, /branch[^\n]*main|dal[^\n]*main/i);
        assert.match(aiContext, /Git HEAD|HEAD.*source of truth|HEAD.*gerçek/i);
        assert.match(aiContext, /Classroom Projesi\/01 - Güncel Belgeler/);
        assert.match(aiContext, /Önceliklendirilmiş Düzeltme Planı/);
        assert.match(aiContext, new RegExp(tomographyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(aiContext, /system-owned|sistem[- ]owned|sistem sahipli/i);
        assert.match(aiContext, /audit[^\n]*0|0 vulnerability/i);
        assert.match(aiContext, /fiziksel[^\n]*55["″]/i);
        assert.doesNotMatch(aiContext, /ilk-surum-gelistirme/i);
        assert.doesNotMatch(aiContext, /Save Button|save button/i);
        assertNoLegacyActiveClaims(aiContext, 'AI_PROJECT_CONTEXT');
    });

    await t.test('project summary reflects current kiosk, admin, security, and data architecture', () => {
        assert.match(projectSummary, /2\/D Sihirli Pano|Sihirli Öğrenme Parkı|Magic Park/i);
        assert.match(projectSummary, /sekiz|8\s+(?:ana\s+)?(?:bölge|kart)/i);
        assert.match(projectSummary, /Öğrenciler/);
        assert.match(projectSummary, /Görevler/);
        assert.match(projectSummary, /Yoklama/);
        assert.match(projectSummary, /Slaytlar/);
        assert.match(projectSummary, /CSRF/i);
        assert.match(projectSummary, /SameSite=Strict/i);
        assert.match(projectSummary, /Europe\/Istanbul/i);
        assert.match(projectSummary, /system-owned|sistem[- ]owned|sistem sahipli/i);
        assert.match(projectSummary, markdownVersionPattern('sqlite3', '6.0.1'));
        assert.match(projectSummary, markdownVersionPattern('Multer', '2.2.0'));
        assert.match(projectSummary, markdownVersionPattern('SheetJS', '0.20.3'));
        assert.match(projectSummary, /Önceliklendirilmiş Düzeltme Planı/);
        assert.match(projectSummary, new RegExp(tomographyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assertNoLegacyActiveClaims(projectSummary, 'PROJE_OZETI');
    });

    await t.test('all three documents define a non-conflicting source-of-truth chain', () => {
        for (const [name, text] of [
            ['README', readme],
            ['AI_PROJECT_CONTEXT', aiContext],
            ['PROJE_OZETI', projectSummary]
        ]) {
            assert.match(text, /source of truth|kaynak.*gerçek|teknik gerçek/i, `${name} must explain its authority boundary`);
            assert.match(text, /Git HEAD|HEAD/i, `${name} must defer changing code facts to Git HEAD`);
            assert.match(text, /Önceliklendirilmiş Düzeltme Planı/, `${name} must point to the living work queue`);
        }
    });

    await t.test('living priority table reflects already completed P3-1 and P3-2 milestones', () => {
        assert.match(livingPlan, /# 4\. FAZ 0[^\n]*Değişiklikten önce tabanı sabitle[\s\S]{0,220}\*\*Durum:\*\* 🟩 Tamamlandı ve doğrulandı/);
        assert.match(livingPlan, /# 17\. P3-1[^\n]*Stale bakım scriptlerini temizle[\s\S]{0,180}\*\*Durum:\*\* 🟩 Tamamlandı ve doğrulandı/);
        assert.match(livingPlan, /# 18\. P3-2[^\n]*Güncel dokümantasyonu tek gerçekliğe getir[\s\S]{0,180}\*\*Durum:\*\* 🟩 Tamamlandı ve doğrulandı/);
        assert.match(livingPlan, /\| 0 \| Başlangıç baseline \/ test disiplini \| Zorunlu \| 🟩 \|/);
        assert.match(livingPlan, /\| 14 \| Stale bakım scriptleri \| P3 \| 🟩 \|/);
        assert.match(livingPlan, /\| 15 \| README\/context\/docs güncelleme \| P3 \| 🟩 \|/);
    });
});
