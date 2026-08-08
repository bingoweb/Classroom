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

test('Dependency security baseline', async (t) => {
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
        assert.equal(lockedVersion('side-channel'), '1.1.1');
        assert.equal(lockedVersion('side-channel-list'), '1.0.1');
    });

    await t.test('Multer is pinned to the validated 2.2.0 upload runtime', () => {
        assert.equal(packageJson.dependencies.multer, '2.2.0');
        assert.equal(lockJson.packages[''].dependencies.multer, '2.2.0');
        assert.equal(lockedVersion('multer'), '2.2.0');
        assert.equal(lockedVersion('concat-stream'), '2.0.0');
        assert.equal(lockedVersion('readable-stream'), '3.6.2');
    });

    await t.test('Multer 1.x-only dependency baggage does not return', () => {
        assert.equal(lockedVersion('mkdirp'), undefined);
        assert.equal(lockedVersion('object-assign'), undefined);
        assert.equal(lockedVersion('xtend'), undefined);
        assert.equal(lockedVersion('process-nextick-args'), undefined);
        assert.equal(lockedVersion('core-util-is'), undefined);
        assert.equal(lockedVersion('isarray'), undefined);
    });

    await t.test('sqlite3 is pinned to the validated 6.0.1 major migration', () => {
        assert.equal(packageJson.dependencies.sqlite3, '6.0.1');
        assert.equal(lockJson.packages[''].dependencies.sqlite3, '6.0.1');
        assert.equal(lockedVersion('sqlite3'), '6.0.1');
    });

    await t.test('sqlite3 native build chain stays on the remediated toolchain', () => {
        assert.equal(lockedVersion('node-gyp'), '12.4.0');
        assert.equal(lockedVersion('tar'), '7.5.22');
    });

    await t.test('the vulnerable sqlite3 5.x build-chain packages do not return', () => {
        assert.equal(lockedVersion('make-fetch-happen'), undefined);
        assert.equal(lockedVersion('cacache'), undefined);
        assert.equal(lockedVersion('http-proxy-agent'), undefined);
        assert.equal(lockedVersion('@tootallnate/once'), undefined);
    });
});
