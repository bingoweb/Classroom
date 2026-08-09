'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'public', 'admin', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const labelledControlIds = [
    'studentNameInput',
    'studentGenderSelect',
    'studentPhotoInput',
    'excelFileInput',
    'attendanceDate',
    'defaultDuration',
    'defaultTransitionMode',
    'defaultTransitionDuration',
    'logLevelFilter',
    'logComponentFilter',
    'logTimeFilter',
    'slideTitle',
    'slideContentType',
    'slideMedia',
    'slideTextContent',
    'slideDisplayDuration',
    'slideTransitionMode',
    'slideTransitionType',
    'slideTransitionDuration'
];

function openingControlTag(id) {
    const match = html.match(new RegExp(`<(?:input|select|textarea)\\b[^>]*\\bid="${id}"[^>]*>`, 'i'));
    return match ? match[0] : '';
}

test('admin visible form labels are programmatically associated with their controls', () => {
    assert.strictEqual(labelledControlIds.length, 19, 'Chrome issue baseline contains 19 label/control pairs');

    for (const id of labelledControlIds) {
        assert.match(
            html,
            new RegExp(`<label\\b[^>]*\\bfor="${id}"[^>]*>`, 'i'),
            `expected a label[for="${id}"]`
        );
        assert.notStrictEqual(
            openingControlTag(id),
            '',
            `expected a form control with id="${id}"`
        );
    }
});

test('student name field declares the correct browser autofill purpose', () => {
    const input = openingControlTag('studentNameInput');
    assert.notStrictEqual(input, '', 'student name input must have a stable id');
    assert.match(input, /\bname="name"/i);
    assert.match(input, /\bautocomplete="name"/i,
        'student name input should use the standard name autocomplete token');
});
