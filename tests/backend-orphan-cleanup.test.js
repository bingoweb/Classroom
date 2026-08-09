'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const backendConfigPath = path.join(root, 'backend', 'config.js');
const backendUtilsPath = path.join(root, 'backend', 'utils.js');
const slideMediaPathsPath = path.join(root, 'backend', 'slide-media-paths.js');
const publicConfigPath = path.join(root, 'public', 'js', 'config.js');
const publicUtilsPath = path.join(root, 'public', 'js', 'utils.js');

test('P3-4 removes only the orphan backend config copy', () => {
    assert.equal(fs.existsSync(backendConfigPath), false,
        'backend/config.js is an unreferenced legacy copy and should be removed');
});

test('P3-4 preserves the active backend utils dependency', () => {
    assert.equal(fs.existsSync(backendUtilsPath), true,
        'backend/utils.js is still required by the backend slide media-path layer');
    assert.equal(fs.existsSync(slideMediaPathsPath), true,
        'backend/slide-media-paths.js must exist as the active normalizePath consumer');

    const slideMediaSource = fs.readFileSync(slideMediaPathsPath, 'utf8');
    assert.match(slideMediaSource, /const\s*\{\s*normalizePath\s*\}\s*=\s*require\(['"]\.\/utils['"]\)/);
    assert.match(slideMediaSource, /normalizePath\s*\(dbPath,\s*true\)/);

    const { normalizePath } = require(backendUtilsPath);
    assert.equal(normalizePath('uploads\\student.jpg'), '/uploads/student.jpg');
});

test('P3-4 does not confuse the live frontend config/utils with backend copies', () => {
    assert.equal(fs.existsSync(publicConfigPath), true);
    assert.equal(fs.existsSync(publicUtilsPath), true);

    const kioskHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
    const adminHtml = fs.readFileSync(path.join(root, 'public', 'admin', 'index.html'), 'utf8');

    assert.match(kioskHtml, /<script src="js\/config\.js"><\/script>/);
    assert.match(kioskHtml, /<script src="js\/utils\.js"><\/script>/);
    assert.match(adminHtml, /<script src="\.\.\/js\/config\.js"><\/script>/);
    assert.match(adminHtml, /<script src="\.\.\/js\/utils\.js"><\/script>/);
});
