const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/admin/style.css'), 'utf8');

test('P3-5C1 moves static admin HTML presentation into style.css', () => {
    const inlineStyles = html.match(/\sstyle="[^"]*"/g) || [];
    assert.equal(inlineStyles.length, 0, `expected zero inline style attributes, found ${inlineStyles.length}`);
    assert.doesNotMatch(html, /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/i);

    const requiredHtmlClasses = [
        'admin-domain-hero',
        'student-stats',
        'student-action-grid',
        'role-assignment-grid',
        'attendance-toolbar',
        'slide-settings-form',
        'error-log-toolbar',
        'slide-form-shell',
        'slide-form-section',
        'slide-media-preview',
        'slide-progress-bar'
    ];

    for (const className of requiredHtmlClasses) {
        assert.match(html, new RegExp(`class="[^"]*\\b${className}\\b`), `${className} should be used by admin HTML`);
        assert.match(css, new RegExp(`\\.${className}(?:[\\s,{:.#]|$)`), `${className} should be defined in admin CSS`);
    }
});

test('P3-5C1 preserves runtime state hooks while CSS owns their initial presentation', () => {
    const runtimeIds = [
        'photoUploadModal',
        'slideFormModal',
        'slideUploadProgress',
        'slideProgressBar',
        'slideTextContentDiv',
        'slideVideoSettings',
        'slideTransitionManualDiv'
    ];

    for (const id of runtimeIds) {
        assert.match(html, new RegExp(`id="${id}"`), `${id} runtime hook must remain in the DOM`);
    }

    assert.match(css, /#slideUploadProgress\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /#slideProgressBar\s*\{[^}]*width:\s*0%;/s);
    assert.match(css, /#slideTextContentDiv\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /#slideVideoSettings\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /#slideTransitionManualDiv\s*\{[^}]*display:\s*none;/s);
});

test('P3-5C1 slide modal shell keeps the former 30px padding above the generic qr-content rule', () => {
    assert.match(css, /\.qr-content\.slide-form-shell\s*\{[^}]*padding:\s*30px;/s);
});
