const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const slidesPath = path.join(root, 'public', 'admin', 'js', 'slides.js');
const cssPath = path.join(root, 'public', 'admin', 'style.css');

const slidesSource = fs.readFileSync(slidesPath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');

test('P3-5C3 moves slide template style attributes into admin CSS', () => {
    const styleAttributes = slidesSource.match(/\sstyle=(?:"[^"]*"|'[^']*')/g) || [];
    assert.strictEqual(styleAttributes.length, 0,
        `expected zero slide template style attributes, found ${styleAttributes.length}`);

    for (const className of [
        'admin-slide-empty',
        'admin-slide-item',
        'admin-slide-item__drag',
        'admin-slide-item__media',
        'admin-slide-item__media-object',
        'admin-slide-item__content',
        'admin-slide-item__meta',
        'admin-slide-item__order',
        'admin-slide-item__type',
        'admin-slide-item__title',
        'admin-slide-item__transition',
        'admin-slide-item__status',
        'admin-slide-item__text',
        'admin-slide-item__actions',
        'admin-slide-item__button',
        'admin-slide-media-preview',
        'admin-slide-media-preview__object',
        'admin-slide-media-preview__caption'
    ]) {
        assert.match(slidesSource, new RegExp(`class="[^"]*\\b${className}\\b`),
            `${className} must be used by slides.js`);
        assert.match(cssSource, new RegExp(`\\.${className}\\b`),
            `${className} must be owned by style.css`);
    }
});

test('P3-5C3 keeps real runtime slide state writes out of the static CSS extraction', () => {
    for (const runtimeWrite of [
        "this.style.opacity = '0.5'",
        "this.style.opacity = '1'",
        "modal.style.display = 'flex'",
        "modal.style.display = 'none'",
        "progressDiv.style.display = 'block'",
        "progressBar.style.width = '0%'",
        "progressBar.style.width = percentComplete + '%'"
    ]) {
        assert.ok(slidesSource.includes(runtimeWrite), `runtime state write must remain: ${runtimeWrite}`);
    }
});

test('P3-5C3 uses explicit active/passive modifier classes instead of inline action colors', () => {
    assert.match(slidesSource, /admin-slide-item__status--active/);
    assert.match(slidesSource, /admin-slide-item__status--passive/);
    assert.match(slidesSource, /admin-slide-item__button--deactivate/);
    assert.match(slidesSource, /admin-slide-item__button--activate/);
    assert.match(cssSource, /\.admin-slide-item__button--deactivate\b/);
    assert.match(cssSource, /\.admin-slide-item__button--activate\b/);
});
