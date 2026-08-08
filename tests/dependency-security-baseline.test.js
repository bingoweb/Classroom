const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const lockJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));

function lockedVersion(name) {
    return lockJson.packages[`node_modules/${name}`]?.version;
}

test('Dependency security baseline for the non-major remediation wave', async (t) => {
    await t.test('Express stays on the audited 4.22.2 line', () => {
        assert.equal(packageJson.dependencies.express, '^4.22.2');
        assert.equal(lockJson.packages[''].dependencies.express, '^4.22.2');
        assert.equal(lockedVersion('express'), '4.22.2');
    });

    await t.test('Express parser and routing dependencies remain on remediated versions', () => {
        assert.equal(lockedVersion('body-parser'), '1.20.6');
        assert.equal(lockedVersion('qs'), '6.15.3');
        assert.equal(lockedVersion('path-to-regexp'), '0.1.13');
        assert.equal(lockedVersion('raw-body'), '2.5.3');
    });

    await t.test('non-major transitive audit fixes remain locked', () => {
        assert.equal(lockedVersion('brace-expansion'), '1.1.18');
        assert.equal(lockedVersion('minimatch'), '3.1.5');
        assert.equal(lockedVersion('ip-address'), '10.4.0');
        assert.equal(lockedVersion('side-channel'), '1.1.1');
        assert.equal(lockedVersion('side-channel-list'), '1.0.1');
    });

    await t.test('the remaining sqlite3 major migration is not silently mixed into this wave', () => {
        assert.equal(packageJson.dependencies.sqlite3, '^5.1.6');
        assert.equal(lockedVersion('sqlite3'), '5.1.7');
    });
});
