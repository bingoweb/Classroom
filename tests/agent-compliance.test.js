const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECKER_PATH = path.resolve(__dirname, '../scripts/verify-agent-compliance.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function runChecker(cwd) {
    try {
        const output = execSync(`node ${CHECKER_PATH} --scan`, { cwd, encoding: 'utf8', stdio: 'pipe' });
        return { code: 0, output, error: '' };
    } catch (e) {
        return { code: e.status, output: e.stdout, error: e.stderr };
    }
}

function createFixtureDir(name) {
    const dir = path.join(FIXTURES_DIR, name);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    
    // Copy the checker and policy to simulate the environment
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.copyFileSync(CHECKER_PATH, path.join(dir, 'scripts/verify-agent-compliance.js'));
    fs.copyFileSync(path.resolve(__dirname, '../agent-policy.json'), path.join(dir, 'agent-policy.json'));
    
    fs.mkdirSync(path.join(dir, '.agent'), { recursive: true });
    if (fs.existsSync(path.resolve(__dirname, '../.agent/quality-baseline.json'))) {
        fs.copyFileSync(path.resolve(__dirname, '../.agent/quality-baseline.json'), path.join(dir, '.agent/quality-baseline.json'));
    } else {
        fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');
    }

    // Default package.json to avoid missing-package-script errors
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        scripts: {
            "policy:scan": "node scripts/verify-agent-compliance.js --scan",
            "policy:staged": "node scripts/verify-agent-compliance.js --staged",
            "policy:repository": "node scripts/verify-agent-compliance.js --repository",
            "policy:ci": "node scripts/verify-agent-compliance.js --ci",
            "test:agent-compliance": "node --test tests/agent-compliance.test.js",
            "gate:commit": "npm run policy:staged",
            "gate:project": "npm run policy:repository && npm run test:core",
            "gate:ci": "npm run policy:ci && npm run test:core",
            "test:core": "tests/agent-compliance.test.js"
        }
    }));
    
    return dir;
}

test('clean fixture exits zero', () => {
    const dir = createFixtureDir('valid_project');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0, result.error + '\n' + result.output);
    assert.ok(result.output.includes('Tüm uygunluk kontrolleri başarıyla geçildi.'));
});

test('new innerHTML fails', () => {
    const dir = createFixtureDir('forbidden_innerhtml');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), 'element.' + 'innerHTML = "x";');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unsafe-dom-inner-html'));
});

test('unapproved network use fails', () => {
    const dir = createFixtureDir('forbidden_network');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), 'fe' + 'tch("https://api.example.com");');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-network-storage'));
});

test('unapproved storage use fails', () => {
    const dir = createFixtureDir('forbidden_storage');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), 'local' + 'Storage.setItem("x", "y");');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-network-storage'));
});

test('unconditional assertion fails', () => {
    const dir = createFixtureDir('unconditional_assert');
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/bad.test.js'), 'assert.' + 'equal(true, true);');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('prohibited-test-pattern'));
});

test('skipped test fails', () => {
    const dir = createFixtureDir('skipped_test');
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/bad.test.js'), 'test.' + 'skip("skipped", () => {});');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('prohibited-test-pattern'));
});

test('missing required ID fails', () => {
    const dir = createFixtureDir('missing_id');
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), '<html></html>');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('missing-required-id'));
});

test('duplicate HTML ID fails', () => {
    const dir = createFixtureDir('duplicate_id');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), '<div id="test"><div id="test"></div></div>');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('duplicate-id'));
});

test('malformed HTML attribute fails', () => {
    const dir = createFixtureDir('malformed_table');
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), '<thead style="color:red; <h' + '3>Title</h3>"></thead>');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('malformed-html-attribute'));
});

test('incorrect script order fails', () => {
    const dir = createFixtureDir('incorrect_script_order');
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/index.html'), `
        <script src="admin.js"></script>
        <script src="schedule-diagnostics.js"></script>
    `);
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('incorrect-script-order'));
});

test('missing package script fails', () => {
    const dir = createFixtureDir('missing_package_script');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('missing-package-script'));
});

test('meaningful assert.ok passes', () => {
    const dir = createFixtureDir('meaningful_assert');
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/good.test.js'), 'assert.ok(myVar === 1);');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0);
});

test('invalid JSON fails', () => {
    const dir = createFixtureDir('invalid_json');
    fs.writeFileSync(path.join(dir, 'bad.json'), '{ "a": 1, }');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('invalid-json'));
});

test('invalid JavaScript fails', () => {
    const dir = createFixtureDir('invalid_js');
    fs.writeFileSync(path.join(dir, 'bad.js'), 'const a = ;');
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('invalid-js'));
});

test('false no-innerHTML claim fails', () => {
    const dir = createFixtureDir('false_claim');
    fs.writeFileSync(path.join(dir, 'AI_PROJECT_CONTEXT.md'), 'inner' + 'HTML kullanımı engellendi');
    // Inject innerHTML in baseline to trigger the rule
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), JSON.stringify([
        { ruleId: 'unsafe-dom-inner-html', path: 'public/admin/admin.js' }
    ]));
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('documentation-contradicts-code'));
});
