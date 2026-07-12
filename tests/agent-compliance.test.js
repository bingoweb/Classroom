const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CHECKER_PATH = path.resolve(__dirname, '../scripts/verify-agent-compliance.js');

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function runChecker(cwd, mode = '--scan', env = {}) {
    try {
        const output = execSync(`node ${CHECKER_PATH} ${mode}`, { cwd, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env } });
        return { code: 0, output, error: '' };
    } catch (e) {
        return { code: e.status, output: e.stdout, error: e.stderr };
    }
}

function createFixtureDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-guard-'));
    
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.copyFileSync(CHECKER_PATH, path.join(dir, 'scripts/verify-agent-compliance.js'));
    fs.copyFileSync(path.resolve(__dirname, '../agent-policy.json'), path.join(dir, 'agent-policy.json'));
    
    fs.mkdirSync(path.join(dir, '.agent'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');

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
    
    // Init git repo
    execSync('git init && git config user.email "test@example.com" && git config user.name "Test" && git add . && git commit -m "init"', { cwd: dir });

    return dir;
}

test('clean fixture exits zero', () => {
    const dir = createFixtureDir();
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0);
});

test('stale baseline entry fails', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), '');
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), JSON.stringify([
        { ruleId: 'fake-rule', path: 'public/admin/test.js', fingerprint: '0'.repeat(64), line: 1 }
    ]));
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('stale-baseline-entry'), 'Should flag stale baseline entry');
});

test('duplicate exact baseline fingerprint causes error', () => {
    const dir = createFixtureDir();
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), JSON.stringify([
        { ruleId: 'fake-rule', path: 'public/admin/test.js', fingerprint: '0'.repeat(64), line: 1 },
        { ruleId: 'fake-rule', path: 'public/admin/test.js', fingerprint: '0'.repeat(64), line: 1 }
    ]));
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('duplicate kayıt'), 'Should flag duplicate entry');
});

test('missing task contract when app files staged fails', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'console.log();');
    execSync('git add public/test.js', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('missing-task-contract'), 'Should require task contract');
});

test.only('mixed baseline and app commit fails', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'console.log();');
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), JSON.stringify([{ruleId:'x', path:'y', line:1, fingerprint:'0'.repeat(64)}]));
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('mixed-baseline-app-commit'), 'Should prevent mixed commit');
});

test('unapproved network use fails when staged', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), 'fetch("https://api.example.com");');
    execSync('git add public/admin/test.js', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-network-storage'));
});

test('unapproved maintenance feature fails', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), '<button>Yeni Ekle</button>');
    execSync('git add public/admin/test.js', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-maintenance-feature'));
});

test('task contract allows network if specified', () => {
    const dir = createFixtureDir();
    fs.mkdirSync(path.join(dir, 'public/admin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/admin/test.js'), 'fetch("https://api.example.com");');
    
    fs.writeFileSync(path.join(dir, '.agent/task-contract.json'), JSON.stringify({
        newFeaturesAllowed: false,
        changeType: 'bugfix',
        baseCommit: execSync('git rev-parse HEAD', { cwd: dir }).toString().trim(),
        allowedExistingFiles: [],
        allowedNewFiles: ['public/admin/test.js']
    }));
    
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 0, result.error);
});

test('policy self protection fails if weakened', () => {
    const dir = createFixtureDir();
    const policy = JSON.parse(fs.readFileSync(path.join(dir, 'agent-policy.json')));
    policy.maintenanceMode = false;
    fs.writeFileSync(path.join(dir, 'agent-policy.json'), JSON.stringify(policy));
    const result = runChecker(dir, '--scan');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('policy-weakening'));
});
