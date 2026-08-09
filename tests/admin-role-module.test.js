const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public/admin/admin.js');
const htmlPath = path.join(root, 'public/admin/index.html');
const rolesPath = path.join(root, 'public/admin/js/roles.js');

test('P3-5B2 extracts admin role behavior into a classic-script module', () => {
    assert.strictEqual(
        fs.existsSync(rolesPath),
        true,
        'public/admin/js/roles.js must exist'
    );

    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const htmlSource = fs.readFileSync(htmlPath, 'utf8');
    const rolesSource = fs.readFileSync(rolesPath, 'utf8');

    const studentsScript = '<script src="js/students.js"></script>';
    const rolesScript = '<script src="js/roles.js"></script>';
    const adminScript = '<script src="admin.js"></script>';

    assert.ok(htmlSource.includes(rolesScript), 'admin HTML loads roles.js');
    assert.ok(
        htmlSource.indexOf(studentsScript) < htmlSource.indexOf(rolesScript),
        'roles.js loads after students.js'
    );
    assert.ok(
        htmlSource.indexOf(rolesScript) < htmlSource.indexOf(adminScript),
        'roles.js loads before admin.js'
    );

    assert.match(rolesSource, /window\.AdminRoles\s*=\s*\{/);
    assert.match(rolesSource, /updateRoleSelects/);
    assert.match(rolesSource, /renderRoles/);
    assert.match(rolesSource, /assignRole/);
    assert.match(rolesSource, /removeRole/);
    assert.match(rolesSource, /window\.assignRole\s*=\s*assignRole/);
    assert.match(rolesSource, /window\.removeRole\s*=\s*removeRole/);

    assert.match(adminSource, /AdminRoles\.updateRoleSelects\(students\)/);
    assert.match(adminSource, /AdminRoles\.renderRoles\(roles\)/);
    assert.match(adminSource, /AdminRoles\.init\(\{/);

    assert.doesNotMatch(adminSource, /function updateRoleSelects\(/);
    assert.doesNotMatch(adminSource, /function renderRoles\(/);
    assert.doesNotMatch(adminSource, /window\.assignRole\s*=/);
    assert.doesNotMatch(adminSource, /window\.removeRole\s*=/);
    assert.doesNotMatch(adminSource, /classList\.contains\(['"]remove-role-btn['"]\)/);
});
