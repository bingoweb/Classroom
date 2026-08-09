'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('public/admin/index.html');
const errorLogs = read('public/admin/error-logs.js');
const students = read('public/admin/js/students.js');

test('P3-5E5 leaves no inline on*= event attributes in admin HTML/templates', () => {
    const sources = [
        ['index.html', html],
        ['students.js', students],
        ['roles.js', read('public/admin/js/roles.js')],
        ['attendance.js', read('public/admin/js/attendance.js')],
        ['slides.js', read('public/admin/js/slides.js')]
    ];

    for (const [label, source] of sources) {
        assert.doesNotMatch(source, /\son[a-zA-Z]+\s*=\s*['"]/, `${label} still emits an inline event attribute`);
    }
});

test('P3-5E5 Error Logs controller owns debug, actions and filter listeners', () => {
    assert.match(errorLogs, /debugModeToggle\.addEventListener\(['"]change['"],\s*toggleDebugMode\)/);
    assert.match(errorLogs, /refreshErrorLogsButton\.addEventListener\(['"]click['"],\s*refreshErrorLogs\)/);
    assert.match(errorLogs, /exportErrorLogsButton\.addEventListener\(['"]click['"],\s*exportErrorLogs\)/);
    assert.match(errorLogs, /clearOldLogsButton\.addEventListener\(['"]click['"],\s*clearOldLogs\)/);
    for (const id of ['logLevelFilter', 'logComponentFilter', 'logTimeFilter']) {
        assert.match(errorLogs, new RegExp(`${id}\\.addEventListener\\(['"]change['"],\\s*filterErrorLogs\\)`));
    }
});

test('P3-5E5 Students module owns photo modal cancel binding', () => {
    const cancel = html.match(/<button[^>]*id="closePhotoUploadModalButton"[^>]*>/)?.[0] || '';
    assert.ok(cancel, 'photo modal cancel hook must exist');
    assert.doesNotMatch(cancel, /\son[a-zA-Z]+\s*=/);
    assert.match(students, /closePhotoUploadModalButton\.addEventListener\(['"]click['"],\s*closePhotoUploadModal\)/);
});
