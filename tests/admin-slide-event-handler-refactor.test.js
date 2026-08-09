'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
const slides = fs.readFileSync(path.join(root, 'public/admin/js/slides.js'), 'utf8');

test('P3-5E4 slide form open and close controls use explicit data actions', () => {
    const showButton = html.match(/<button[^>]*data-slide-action="show-form"[^>]*>/)?.[0] || '';
    const closeButton = html.match(/<button[^>]*data-slide-action="close-form"[^>]*>/)?.[0] || '';

    assert.ok(showButton, 'missing slide show-form action hook');
    assert.ok(closeButton, 'missing slide close-form action hook');
    assert.doesNotMatch(showButton, /\son[a-zA-Z]+\s*=/);
    assert.doesNotMatch(closeButton, /\son[a-zA-Z]+\s*=/);
});

test('P3-5E4 rendered slide actions use delegated data hooks instead of inline onclick', () => {
    for (const action of ['edit', 'toggle-active', 'delete']) {
        assert.match(slides, new RegExp(`data-slide-action="${action}"`));
    }
    assert.match(slides, /data-slide-id="\$\{slide\.id\}"/);
    assert.doesNotMatch(slides, /\son[a-zA-Z]+\s*=/,
        'slides.js must not emit inline on* event attributes');
    assert.match(slides, /slidesList\.addEventListener\(['"]click['"]/);
    assert.match(slides, /dataset\.slideAction/);
    assert.match(slides, /dataset\.slideId/);
});

test('P3-5E4 slide image fallback is delegated and preserves the empty-media fallback', () => {
    assert.match(slides, /slidesList\.addEventListener\(['"]error['"][\s\S]*true\)/);
    assert.match(slides, /admin-slide-item__media-empty/);
    assert.match(slides, /Görsel yok/);
});
