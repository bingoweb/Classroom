const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CHECKER_PATH = path.resolve(__dirname, '../scripts/verify-agent-compliance.js');

function runChecker(cwd, mode = '--staged', env = {}) {
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
    fs.copyFileSync(path.resolve(__dirname, '../.agent/task-contract.schema.json'), path.join(dir, '.agent/task-contract.schema.json'));
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), '[]');

    fs.mkdirSync(path.join(dir, '.github/workflows'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.github/workflows/agent-compliance.yml'), 'fetch-depth: 0\n');

    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/agent-compliance.test.js'), 'test();');

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
    
    execSync('git init && git config user.email "test@example.com" && git config user.name "Test" && git add . && git commit -m "init"', { cwd: dir });

    return dir;
}

function cleanup(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function writeContract(dir, overrides = {}) {
    const baseCommit = execSync('git rev-parse HEAD', { cwd: dir }).toString().trim();
    const contract = {
        taskId: "test-task",
        featureName: "Test",
        changeType: "bugfix",
        baseCommit: baseCommit,
        newFeaturesAllowed: false,
        allowedExistingFiles: [],
        allowedNewFiles: [],
        protectedFiles: [],
        behavioursToPreserve: [],
        knownDefectsToAddress: [],
        forbiddenChanges: [],
        requiredStaticChecks: [],
        requiredTestCommands: [],
        browserVerificationRequired: false,
        documentationRequired: false,
        allowedSensitiveChanges: [],
        allowedUiStructureChanges: [],
        allowedBackendChanges: [],
        allowedDatabaseChanges: [],
        allowedDependencyChanges: [],
        ...overrides
    };
    fs.writeFileSync(path.join(dir, '.agent/task-contract.json'), JSON.stringify(contract, null, 2));
    return baseCommit;
}

test('clean fixture exits zero', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));


    writeContract(dir, { allowedNewFiles: ['public/test.js'] });
    execSync('git add .agent/task-contract.json && git commit -m "contract"', { cwd: dir });

    fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'console.log();');
    execSync('git add public/test.js', { cwd: dir });
    const result = runChecker(dir);
    assert.strictEqual(result.code, 0, result.error);
});

test('staged scope rule: modified file outside allowlist fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/existing.js'), 'a');
    execSync('git add . && git commit -m "add"', { cwd: dir });
    
    writeContract(dir, { allowedExistingFiles: [] });
    fs.writeFileSync(path.join(dir, 'public/existing.js'), 'b');
    execSync('git add .', { cwd: dir });
    
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('staged scope rule: added file outside allowlist fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: [] });
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/new.js'), 'a');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('deletion handling: file deletion without permission fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/existing.js'), 'a');
    execSync('git add . && git commit -m "add"', { cwd: dir });
    
    writeContract(dir, { allowedExistingFiles: [] });
    execSync('git rm public/existing.js', { cwd: dir });
    execSync('git add .agent/task-contract.json', { cwd: dir });
    
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('rename handling: file rename without permission fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/existing.js'), 'a');
    execSync('git add . && git commit -m "add"', { cwd: dir });
    
    writeContract(dir, { allowedExistingFiles: [], allowedNewFiles: [] });
    execSync('git mv public/existing.js public/renamed.js', { cwd: dir });
    execSync('git add .agent/task-contract.json', { cwd: dir });
    
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('tests outside allowlist fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: [] });
    fs.writeFileSync(path.join(dir, 'tests/new.test.js'), 'test();');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('documentation outside allowlist fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: [] });
    fs.writeFileSync(path.join(dir, 'AI_PROJECT_CONTEXT.md'), 'docs');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('out-of-scope-file'));
});

test('contract-only commit enforcement', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: ['public/test.js'] });
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'code');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir);
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('mixed-commit'));
});

test('missing CI range fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    const result = runChecker(dir, '--ci');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('geçerli BASE_SHA ve HEAD_SHA bulunamadı'));
});

test('diff failure exits closed', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    // Provide invalid SHAs
    const result = runChecker(dir, '--ci', { BASE_SHA: 'invalid', HEAD_SHA: 'invalid' });
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Git diff çalıştırılamadı'));
});

test('new route with valid contract still failing unless in backend changes', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: ['public/test.js'] });
    execSync('git add .agent/task-contract.json && git commit -m "contract"', { cwd: dir });
    
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'app.get("/route");');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-backend-change'));
});

test('network change without explicit permission fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedNewFiles: ['public/test.js'] });
    execSync('git add .agent/task-contract.json && git commit -m "contract"', { cwd: dir });
    
    fs.mkdirSync(path.join(dir, 'public'));
    fs.writeFileSync(path.join(dir, 'public/test.js'), 'fetch("url");');
    execSync('git add .', { cwd: dir });
    const result = runChecker(dir, '--staged');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('unapproved-network-storage'));
});

test('baseline growth rejected', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    writeContract(dir, { allowedExistingFiles: ['.agent/quality-baseline.json'] });
    const base = execSync('git rev-parse HEAD', { cwd: dir }).toString().trim();
    execSync('git add .agent/task-contract.json && git commit -m "contract"', { cwd: dir });
    
    fs.writeFileSync(path.join(dir, '.agent/quality-baseline.json'), JSON.stringify([
        { ruleId: 'fake-rule', path: 'public/test.js', fingerprint: '0'.repeat(64), line: 1 }
    ]));
    execSync('git add .', { cwd: dir });
    
    const result = runChecker(dir, '--ci', { BASE_SHA: base, HEAD_SHA: 'HEAD' });
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('Baseline büyüyemez') || result.error.includes('Baseline\'a yeni kayıt eklenemez'));
});

test('policy weakening fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    const policy = JSON.parse(fs.readFileSync(path.join(dir, 'agent-policy.json')));
    policy.maintenanceMode = false;
    fs.writeFileSync(path.join(dir, 'agent-policy.json'), JSON.stringify(policy));
    const result = runChecker(dir, '--scan');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('policy-weakening'));
});

test('.only pattern fails', t => {
    const dir = createFixtureDir();
    t.after(() => cleanup(dir));
    fs.writeFileSync(path.join(dir, 'tests/test.test.js'), 'test.' + 'only("test");');
    const result = runChecker(dir, '--scan');
    assert.strictEqual(result.code, 1);
    assert.ok(result.error.includes('prohibited-test-pattern'));
});
