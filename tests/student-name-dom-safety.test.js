const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('Student Name DOM Safety Tests', async (t) => {
    
    await t.test('Utils.escapeHtml correctly escapes HTML entities', () => {
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        
        // Setup a basic mock window for Utils to attach to
        const sandbox = { window: {}, module: {} };
        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        
        const Utils = sandbox.window.Utils || sandbox.module.exports;
        
        assert.ok(Utils, 'Utils should be loaded');
        assert.strictEqual(typeof Utils.escapeHtml, 'function', 'escapeHtml should be exported');
        
        const input = '<script>alert("xss")</script> & "O\'Connor"';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;O&#039;Connor&quot;';
        
        assert.strictEqual(Utils.escapeHtml(input), expected, 'should successfully escape special characters');
        assert.strictEqual(Utils.escapeHtml(null), '', 'should handle null gracefully');
        assert.strictEqual(Utils.escapeHtml(undefined), '', 'should handle undefined gracefully');
        assert.strictEqual(Utils.escapeHtml('Normal Text'), 'Normal Text', 'should leave normal text untouched');
    });

    await t.test('Dashboard (script.js) safely escapes injected names', () => {
        const scriptSource = fs.readFileSync(path.join(__dirname, '../public/js/script.js'), 'utf8');
        
        // President & VP
        assert.ok(scriptSource.includes('Utils.escapeHtml(president.name || \'---\')'), 'President name should be escaped');
        assert.ok(scriptSource.includes('Utils.escapeHtml(vp.name || \'---\')'), 'VP name should be escaped');
        
        // Star student
        assert.ok(scriptSource.includes('Utils.escapeHtml(s.name || \'---\')'), 'Star student name should be escaped');
        
        // Absent student
        assert.ok(scriptSource.includes('Utils.escapeHtml(student.name)'), 'Absent student name should be escaped');
    });

    await t.test('Admin Panel (admin.js) safely escapes injected names and removes data-name attributes', () => {
        const adminSource = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        
        // Verify HTML Escaping
        assert.ok(adminSource.includes('title="${Utils.escapeHtml(s.name)}"'), 'Student card title should be escaped');
        assert.ok(adminSource.match(/<div[^>]*>\s*\$\{Utils\.escapeHtml\(s\.name\)\}\s*<\/div>/), 'Student card text should be escaped');
        
        assert.ok(adminSource.includes('<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>'), 'Role selects should be escaped');
        
        assert.ok(adminSource.includes('✅ ${Utils.escapeHtml(president.name)}'), 'President role display should be escaped');
        assert.ok(adminSource.includes('👑 ${Utils.escapeHtml(vp.name)}'), 'VP role display should be escaped');
        assert.ok(adminSource.includes('📋 ${Utils.escapeHtml(d.name)}'), 'Duty role display should be escaped');
        assert.ok(adminSource.includes('⭐ ${Utils.escapeHtml(s.name)}'), 'Star role display should be escaped');
        
        assert.ok(adminSource.includes('<span style="flex: 1;">${Utils.escapeHtml(s.name)} (${s.gender === \'M\' ? \'Erkek\' : \'Kız\'})</span>'), 'Attendance row should be escaped');
        
        // Verify Removal of vulnerable data-* attributes
        assert.ok(!adminSource.includes('data-student-name='), 'data-student-name attribute must be removed');
        assert.ok(!adminSource.includes('data-name="${s.name}"'), 'data-name attribute must be removed from photo upload button');
        
        // Verify that the photo upload lookup now uses allStudents instead of dataset
        const expectedLookup = "const student = allStudents.find(s => s.id == id);";
        assert.ok(adminSource.includes(expectedLookup), 'Photo upload handler should resolve name dynamically via allStudents');
    });
});
