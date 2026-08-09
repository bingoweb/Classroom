'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public', 'admin', 'admin.js');
const studentModulePath = path.join(root, 'public', 'admin', 'js', 'students.js');
const adminHtmlPath = path.join(root, 'public', 'admin', 'index.html');

test('P3-5B1 extracts admin student behavior into a classic-script module', () => {
    assert.equal(fs.existsSync(studentModulePath), true,
        'public/admin/js/students.js must exist');

    const moduleSource = fs.readFileSync(studentModulePath, 'utf8');
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const htmlSource = fs.readFileSync(adminHtmlPath, 'utf8');

    assert.match(moduleSource, /window\.AdminStudents\s*=\s*\{/,
        'student module must expose a classic-script namespace');
    assert.match(moduleSource, /\binit\s*:/,
        'student module must expose init');
    assert.match(moduleSource, /\brenderStudents\s*:/,
        'student module must expose renderStudents');

    for (const globalName of [
        'filterStudents',
        'deleteStudent',
        'showPhotoUploadModal',
        'closePhotoUploadModal',
        'clearExcelFile',
        'clearPhotoFile'
    ]) {
        assert.match(moduleSource, new RegExp(`window\\.${globalName}\\s*=`),
            `${globalName} must remain available for inline handlers/adapters`);
    }

    const studentScriptIndex = htmlSource.indexOf('<script src="js/students.js"></script>');
    const adminScriptIndex = htmlSource.indexOf('<script src="admin.js"></script>');
    assert.ok(studentScriptIndex >= 0, 'admin HTML must load js/students.js');
    assert.ok(adminScriptIndex >= 0, 'admin HTML must still load admin.js');
    assert.ok(studentScriptIndex < adminScriptIndex,
        'students.js must load before admin.js');

    assert.match(adminSource, /AdminStudents\.renderStudents\(students\)/,
        'fetchStudents must delegate student rendering to the module');
    assert.match(adminSource,
        /AdminStudents\.init\(\{[\s\S]*refreshStudents:\s*fetchStudents,[\s\S]*refreshRoles:\s*fetchRoles[\s\S]*\}\)/,
        'admin shell must initialize the student module with refresh callbacks');

    assert.doesNotMatch(adminSource, /function\s+renderStudents\s*\(/,
        'renderStudents implementation must no longer live in admin.js');
    assert.doesNotMatch(adminSource, /function\s+displayStudents\s*\(/,
        'displayStudents implementation must no longer live in admin.js');
    assert.doesNotMatch(adminSource, /function\s+filterStudents\s*\(/,
        'filterStudents implementation must no longer live in admin.js');
    assert.doesNotMatch(adminSource, /window\.deleteStudent\s*=/,
        'deleteStudent implementation must no longer live in admin.js');
    assert.doesNotMatch(adminSource, /window\.showPhotoUploadModal\s*=/,
        'photo modal implementation must no longer live in admin.js');
    assert.doesNotMatch(adminSource, /students\/import/,
        'Excel import implementation must no longer live in admin.js');
});
