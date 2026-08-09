'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const helperPath = path.join(root, 'tests', 'helpers', 'database-test-utils.js');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('SQLite-backed test suites share one readiness helper before use or teardown', async () => {
    assert.strictEqual(
        fs.existsSync(helperPath),
        true,
        'tests/helpers/database-test-utils.js must exist'
    );

    const { awaitDatabaseReady } = require(helperPath);
    assert.strictEqual(typeof awaitDatabaseReady, 'function');

    let resolveSchedule;
    let resolveLogs;
    const fakeDb = {
        scheduleMigrationPromise: new Promise(resolve => { resolveSchedule = resolve; }),
        errorLogsReadyPromise: new Promise(resolve => { resolveLogs = resolve; })
    };

    let ready = false;
    const readyPromise = awaitDatabaseReady(fakeDb).then(() => { ready = true; });
    await Promise.resolve();
    assert.strictEqual(ready, false, 'readiness waits for both database signals');
    resolveSchedule();
    await Promise.resolve();
    assert.strictEqual(ready, false, 'error-log schema readiness must still be pending');
    resolveLogs();
    await readyPromise;
    assert.strictEqual(ready, true);

    for (const file of [
        'tests/admin-rate-limit.test.js',
        'tests/student-import-error-redaction.test.js',
        'tests/students-read-error-redaction.test.js',
        'tests/logs-create-response.test.js',
        'tests/logs-read-json-parsing.test.js',
        'tests/logs-read-limit-validation.test.js',
        'tests/role-delete.test.js',
        'tests/roles-read-error-redaction.test.js',
        'tests/role-create.test.js',
        'tests/role-limit-atomicity.test.js',
        'tests/slides-create-cache.test.js',
        'tests/slides-update-cache.test.js',
        'tests/student-create-photo.test.js'
    ]) {
        const source = read(file);
        assert.match(source, /require\(['"]\.\/helpers\/database-test-utils\.js['"]\)|require\(['"]\.\/helpers\/database-test-utils['"]\)/,
            `${file} imports the shared readiness helper`);
        assert.match(source, /await\s+awaitDatabaseReady\(db\)/,
            `${file} waits for database readiness`);
    }
});

test('role handler watchdogs separate deliberate no-response checks from real SQLite latency', () => {
    const roleCreate = read('tests/role-create.test.js');
    const roleAtomicity = read('tests/role-limit-atomicity.test.js');

    assert.match(roleCreate, /function createPromiseHelper\(testHandler,\s*timeoutMs\s*=\s*5000\)/);
    assert.match(roleCreate, /createPromiseHelper\(\(\)\s*=>\s*\{\},\s*50\)/,
        'role-create no-response self-test keeps a deliberately short watchdog');

    assert.match(roleAtomicity, /function invokeHandler\(reqOverrides,\s*timeoutMs\s*=\s*5000\)/);
    assert.match(roleAtomicity, /invokeHandler\(\{\},\s*50\)/,
        'role-limit no-response self-test keeps a deliberately short watchdog');
});
