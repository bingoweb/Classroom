const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../scripts/verify-agent-compliance.js');
const realPolicyPath = path.resolve(__dirname, '../agent-policy.json');

function runChecker(fixtureDir) {
    const env = { ...process.env, COMPLIANCE_TEST_ROOT: fixtureDir };
    try {
        const output = execSync(`node ${scriptPath}`, { encoding: 'utf8', stdio: 'pipe', env });
        return { code: 0, output, error: null };
    } catch (err) {
        return { code: err.status, output: err.stdout, error: err.stderr };
    }
}

function createFixtureDir(name) {
    const dir = path.join(__dirname, 'fixtures', name);
    fs.mkdirSync(dir, { recursive: true });
    // Copy real policy
    fs.copyFileSync(realPolicyPath, path.join(dir, 'agent-policy.json'));
    // Create necessary dirs
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    
    // Create base valid files
    fs.writeFileSync(path.join(dir, 'tests/test1.test.js'), 'assert.ok(expression);');
    fs.writeFileSync(path.join(dir, 'public/admin/schedule-review-panel.js'), 'const a = 1;');
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), `
        <thead id="sdeEditableTable">
        <tbody id="sdeEditableTableBody"></tbody>
        <tbody id="sdePreviewTableBody"></tbody>
        <div id="srpContainer"></div>
        # Tür Ad Başlangıç Bitiş İşlem
        schedule-diagnostics.js schedule-draft-editor.js schedule-review-panel.js admin.js
    `);
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        scripts: {
            "test:admin-schedule-review": "...",
            "test:admin-schedule-draft": "...",
            "test:core": "tests/schedule-manager.test.js tests/dev-time-simulator.test.js tests/backend-date-utils.test.js tests/backend-schedule.test.js tests/dashboard-schedule-loader.test.js tests/admin-schedule-diagnostics.test.js tests/admin-schedule-draft-editor.test.js tests/admin-schedule-review-panel.test.js tests/agent-compliance.test.js",
            "test:policy": "...",
            "test:gate": "..."
        }
    }));
    return dir;
}

test('successful result exits with code zero', () => {
    // Current valid project should pass
    const dir = createFixtureDir('valid_project');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0, result.error || result.output);
    assert.ok(result.output.includes("Tüm uygunluk kontrolleri başarıyla geçildi."));
});

test('forbidden innerHTML fails and violation output identifies the file', () => {
    const dir = createFixtureDir('forbidden_innerhtml');
    fs.writeFileSync(path.join(dir, 'public/admin/schedule-review-panel.js'), 'element.innerHTML = "x";');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('İHLAL'));
    assert.ok(result.error.includes('schedule-review-panel.js'));
});

test('forbidden network API fails', () => {
    const dir = createFixtureDir('forbidden_network');
    fs.writeFileSync(path.join(dir, 'public/admin/schedule-review-panel.js'), 'fetch("/api")');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('fetch('));
});

test('forbidden storage API fails', () => {
    const dir = createFixtureDir('forbidden_storage');
    fs.writeFileSync(path.join(dir, 'public/admin/schedule-review-panel.js'), 'localStorage.setItem("x", "y")');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('localStorage'));
});

test('unconditional assertion fails', () => {
    const dir = createFixtureDir('unconditional_assert');
    fs.writeFileSync(path.join(dir, 'tests/bad.test.js'), 'assert.' + 'ok(true);');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('assert.' + 'ok(true)'));
});

test('skipped test fails', () => {
    const dir = createFixtureDir('skipped_test');
    fs.writeFileSync(path.join(dir, 'tests/bad.test.js'), 'test.' + 'skip("skipped", () => {});');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('.' + 'skip('));
});

test('missing required HTML ID fails', () => {
    const dir = createFixtureDir('missing_id');
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), '<div id="srpContainer"></div> # Tür Ad Başlangıç Bitiş İşlem schedule-diagnostics.js schedule-draft-editor.js schedule-review-panel.js admin.js');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('sdeEditableTable'));
});

test('duplicate required HTML ID fails', () => {
    const dir = createFixtureDir('duplicate_id');
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), '<div id="srpContainer"></div><div id="srpContainer"></div> <tbody id="sdeEditableTableBody"></tbody> <tbody id="sdePreviewTableBody"></tbody> <thead id="sdeEditableTable"></thead> # Tür Ad Başlangıç Bitiş İşlem schedule-diagnostics.js schedule-draft-editor.js schedule-review-panel.js admin.js');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Tekrarlanan HTML ID'));
    assert.ok(result.error.includes('srpContainer'));
});

test('malformed editable table fails', () => {
    const dir = createFixtureDir('malformed_table');
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), `
        <thead id="sdeEditableTable">
        <tbody id="sdeEditableTableBody"></tbody>
        <tbody id="sdePreviewTableBody"></tbody>
        <div id="srpContainer"></div>
        # Tür Ad Başlangıç Bitiş İşlem
        schedule-diagnostics.js schedule-draft-editor.js schedule-review-panel.js admin.js
        <thead style="color:red; <h3>Title</h3>"></thead>
    `);
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Bozuk veya yasaklı HTML'));
});

test('incorrect script order fails', () => {
    const dir = createFixtureDir('incorrect_script_order');
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), `
        <thead id="sdeEditableTable">
        <tbody id="sdeEditableTableBody"></tbody>
        <tbody id="sdePreviewTableBody"></tbody>
        <div id="srpContainer"></div>
        # Tür Ad Başlangıç Bitiş İşlem
        admin.js schedule-diagnostics.js schedule-draft-editor.js schedule-review-panel.js
    `);
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Yanlış script sırası'));
});

test('missing required package script fails', () => {
    const dir = createFixtureDir('missing_package_script');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Eksik package.json betiği'));
});

test('meaningful assert.ok(expression) remains allowed', () => {
    const dir = createFixtureDir('meaningful_assert');
    fs.writeFileSync(path.join(dir, 'tests/good.test.js'), 'assert.ok(myVar === true);');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0, result.error);
});
