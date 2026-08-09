'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
const roles = fs.readFileSync(path.join(root, 'public/admin/js/roles.js'), 'utf8');
const attendance = fs.readFileSync(path.join(root, 'public/admin/js/attendance.js'), 'utf8');

test('P3-5E3 role assign buttons use data hooks instead of inline onclick', () => {
    for (const roleType of ['president', 'vice_president', 'duty', 'star']) {
        const button = html.match(new RegExp(`<button[^>]*data-role-type="${roleType}"[^>]*>`))?.[0] || '';
        assert.ok(button, `missing assign button hook for ${roleType}`);
        assert.match(button, /class="[^"]*assign-role-btn[^"]*"/);
        assert.doesNotMatch(button, /\son[a-zA-Z]+\s*=/);
    }

    assert.match(roles, /rolesSection\.addEventListener\(['"]click['"]/);
    assert.match(roles, /closest\(['"]\.assign-role-btn['"]\)/);
    assert.match(roles, /dataset\.roleType/);
});

test('P3-5E3 attendance toolbar and save controls use delegated data actions', () => {
    for (const action of ['load', 'today', 'save']) {
        const button = html.match(new RegExp(`<button[^>]*data-attendance-action="${action}"[^>]*>`))?.[0] || '';
        assert.ok(button, `missing attendance action hook for ${action}`);
        assert.doesNotMatch(button, /\son[a-zA-Z]+\s*=/);
    }

    assert.match(attendance, /attendanceSection\.addEventListener\(['"]click['"]/);
    assert.match(attendance, /dataset\.attendanceAction/);
});

test('P3-5E3 attendance avatars use delegated fallback without inline onerror', () => {
    assert.doesNotMatch(attendance, /\son[a-zA-Z]+\s*=/,
        'attendance templates must not emit inline on* event attributes');
    assert.match(attendance, /data-default-avatar=/);
    assert.match(attendance, /attendanceList\.addEventListener\(['"]error['"][\s\S]*true\)/);
});
