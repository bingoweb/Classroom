'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const attendancePath = path.join(root, 'public', 'admin', 'js', 'attendance.js');
const cssPath = path.join(root, 'public', 'admin', 'style.css');

const attendanceSource = fs.readFileSync(attendancePath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');

test('P3-5C4 moves attendance template style attributes into admin CSS', () => {
    const styleAttributes = attendanceSource.match(/\sstyle=(?:"[^"]*"|'[^']*')/g) || [];
    assert.strictEqual(
        styleAttributes.length,
        0,
        `expected zero attendance template style attributes, found ${styleAttributes.length}`
    );

    for (const className of [
        'admin-attendance-student',
        'admin-attendance-avatar',
        'admin-attendance-name',
        'admin-attendance-choice',
        'admin-attendance-summary__present',
        'admin-attendance-summary__absent'
    ]) {
        assert.match(
            attendanceSource,
            new RegExp(`\\b${className}\\b`),
            `${className} must be emitted by attendance.js`
        );
        assert.match(
            cssSource,
            new RegExp(`\\.${className.replace(/--/g, '\\-\\-')}\\b`),
            `${className} must be styled by public/admin/style.css`
        );
    }
});

test('P3-5C4 preserves the attendance card and summary visual contract explicitly', () => {
    assert.match(cssSource, /\.admin-attendance-student\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*10px;[^}]*padding:\s*10px;[^}]*border:\s*1px solid rgba\(0,\s*0,\s*0,\s*0\.1\);[^}]*border-radius:\s*8px;[^}]*margin-bottom:\s*8px;/s);
    assert.match(cssSource, /\.admin-attendance-avatar\s*\{[^}]*width:\s*50px;[^}]*height:\s*50px;[^}]*border-radius:\s*50%;/s);
    assert.match(cssSource, /\.admin-attendance-name\s*\{[^}]*flex:\s*1;/s);
    assert.match(cssSource, /\.admin-attendance-choice\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*5px;[^}]*cursor:\s*pointer;/s);
    assert.match(cssSource, /\.admin-attendance-summary__present\s*\{[^}]*color:\s*green;/s);
    assert.match(cssSource, /\.admin-attendance-summary__absent\s*\{[^}]*color:\s*red;/s);
});

test('P3-5C4 keeps existing attendance behavior hooks while presentation moves to CSS', () => {
    assert.match(attendanceSource, /class="student-item[^\"]*admin-attendance-student/,
        'existing .student-item hook remains alongside the attendance-specific class');
    assert.match(attendanceSource, /class="student-thumb[^\"]*admin-attendance-avatar/,
        'existing .student-thumb hook remains alongside the attendance-specific class');
    assert.match(attendanceSource, /name="attendance_\$\{s\.id\}" value="present"/);
    assert.match(attendanceSource, /name="attendance_\$\{s\.id\}" value="absent"/);
    assert.match(attendanceSource, /data-student-id="\$\{s\.id\}"/);
    assert.match(attendanceSource, /Utils\.escapeHtml\(s\.name\)/,
        'student names must remain escaped during the style-only refactor');
});
