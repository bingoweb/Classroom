'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const students = fs.readFileSync(path.join(root, 'public/admin/js/students.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');

test('P3-5E2 student search and gender filter use module listeners instead of inline handlers', () => {
    const search = adminHtml.match(/<input[^>]*id="studentSearch"[^>]*>/)?.[0] || '';
    const gender = adminHtml.match(/<select[^>]*id="genderFilter"[^>]*>/)?.[0] || '';

    assert.ok(search, 'studentSearch control must exist');
    assert.ok(gender, 'genderFilter control must exist');
    assert.doesNotMatch(search, /\son[a-zA-Z]+\s*=/,
        'studentSearch must not use an inline event attribute');
    assert.doesNotMatch(gender, /\son[a-zA-Z]+\s*=/,
        'genderFilter must not use an inline event attribute');
    assert.match(students, /studentSearch\.addEventListener\(['"]keyup['"],\s*filterStudents\)/);
    assert.match(students, /genderFilter\.addEventListener\(['"]change['"],\s*filterStudents\)/);
});

test('P3-5E2 Students templates contain no inline event attributes', () => {
    assert.doesNotMatch(students, /\son[a-zA-Z]+\s*=/,
        'students.js must not emit inline on* event attributes');
});

test('P3-5E2 student cards keep hover and avatar fallback under delegated JS ownership', () => {
    assert.match(students, /studentList\.addEventListener\(['"]mouseover['"]/);
    assert.match(students, /studentList\.addEventListener\(['"]mouseout['"]/);
    assert.match(students, /studentList\.addEventListener\(['"]error['"][\s\S]*true\)/);
    assert.match(students, /data-default-avatar=/,
        'rendered avatars must carry a safe fallback path for the delegated error handler');
});

test('P3-5E2 dynamic Excel and photo clear buttons use explicit action hooks', () => {
    assert.match(students, /data-student-action="clear-excel-file"/);
    assert.match(students, /data-student-action="clear-photo-file"/);
    assert.match(students, /document\.addEventListener\(['"]click['"]/,
        'dynamic clear actions must be handled by explicit event delegation');
});
