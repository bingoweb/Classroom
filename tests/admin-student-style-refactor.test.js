'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const studentModulePath = path.join(root, 'public', 'admin', 'js', 'students.js');
const adminCssPath = path.join(root, 'public', 'admin', 'style.css');

const source = fs.readFileSync(studentModulePath, 'utf8');
const css = fs.readFileSync(adminCssPath, 'utf8');

test('P3-5C2 moves student template style attributes into admin CSS', () => {
    const inlineStyleAttributes = source.match(/\sstyle="[^"]*"/g) || [];

    assert.equal(inlineStyleAttributes.length, 0,
        `expected zero student template style attributes, found ${inlineStyleAttributes.length}`);

    for (const className of [
        'admin-student-empty',
        'admin-student-card',
        'admin-student-card--male',
        'admin-student-card--female',
        'admin-student-card__badge',
        'admin-student-card__visual',
        'admin-student-card__avatar',
        'admin-student-card__name',
        'admin-student-card__actions',
        'admin-student-card__photo-button',
        'admin-student-card__delete-button',
        'admin-excel-selected',
        'admin-excel-preview-table',
        'admin-excel-preview-cell--header',
        'admin-excel-preview-cell--body',
        'admin-photo-preview__image',
        'admin-excel-result--error',
        'admin-excel-result--success'
    ]) {
        assert.match(source, new RegExp(`\\b${className}\\b`),
            `${className} must be emitted by students.js`);
        assert.match(css, new RegExp(`\\.${className.replace(/--/g, '\\-\\-')}\\b`),
            `${className} must be styled by public/admin/style.css`);
    }
});

test('P3-5C2 keeps male/female colors and existing hover runtime behavior explicit', () => {
    assert.match(source, /s\.gender === 'M'\s*\?\s*'admin-student-card--male'\s*:\s*'admin-student-card--female'/,
        'student gender must map to explicit male/female modifier classes');

    assert.match(css, /\.admin-student-card--male\s+\.admin-student-card__badge\s*\{[^}]*background:\s*#2196F3;/s);
    assert.match(css, /\.admin-student-card--female\s+\.admin-student-card__badge\s*\{[^}]*background:\s*#E91E63;/s);
    assert.match(css, /\.admin-student-card--male\s+\.admin-student-card__visual\s*\{[^}]*#2196F320[^}]*#2196F310/s);
    assert.match(css, /\.admin-student-card--female\s+\.admin-student-card__visual\s*\{[^}]*#E91E6320[^}]*#E91E6310/s);

    assert.match(source, /this\.style\.transform='translateY\(-4px\)'/,
        'existing card hover transform must remain runtime-owned in C2');
    assert.match(source, /this\.style\.boxShadow='0 4px 16px rgba\(0,0,0,0\.15\)'/,
        'existing card hover shadow must remain runtime-owned in C2');
    assert.match(source, /this\.style\.borderColor='var\(--primary\)'/,
        'existing card hover border must remain runtime-owned in C2');
    assert.match(source, /this\.style\.opacity='0\.9'/,
        'existing action-button hover opacity must remain runtime-owned in C2');
});

test('P3-5C2 preserves the photo-preview runtime cssText boundary for a later state-class wave', () => {
    assert.match(source,
        /container\.style\.cssText\s*=\s*'margin-top: 15px; padding: 15px; background: rgba\(0,0,0,0\.05\); border-radius: 8px;';/,
        'C2 must not silently change the runtime-created photo preview container state boundary');
});
