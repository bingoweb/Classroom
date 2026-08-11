const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Magic Park returns to a layered DOM theme with no shared WebGL cavity stage', () => {
    const html = read('public/index.html');
    const layout = read('public/themes/magic-park/magic-layout.css');
    const runtimePath = path.join(root, 'public/js/magic-3d-scene.js');

    assert.doesNotMatch(html, /id="magic-3d-stage"|magic-3d-scene\.js/,
        'the kiosk must not mount or load a Magic Park WebGL cavity stage');
    assert.doesNotMatch(layout, /#magic-3d-stage|--magic-cavity-content-inset|cavity|recess/i,
        'the Magic Park layout must not retain cavity-stage geometry or depth contracts');
    assert.equal(fs.existsSync(runtimePath), false,
        'the obsolete Magic Park Three.js cavity runtime should be removed rather than left dormant');
});

test('Magic Park content fills the artwork openings directly under the baked alpha foreground', () => {
    const layout = read('public/themes/magic-park/magic-layout.css');
    const components = read('public/themes/magic-park/magic-components.css');

    const sceneRule = layout.match(/body\.magic-park-theme\.theme-magic-park \.magic-scene\s*\{([^}]*)\}/s)?.[1] || '';
    assert.match(sceneRule, /inset:\s*0\s*!important/,
        'semantic content planes must fill their positioned card opening directly');
    assert.doesNotMatch(sceneRule, /--magic-cavity|box-shadow|filter|backdrop-filter/i,
        'the layout content plane must not depend on depth or shadow effects');

    const sharedSceneRule = components.match(/body\.magic-park-theme\.theme-magic-park \.magic-scene\s*\{([^}]*)\}/s)?.[1] || '';
    assert.doesNotMatch(sharedSceneRule, /box-shadow|backdrop-filter|filter/i,
        'the shared Magic Park scene surface must stay visually flat and effect-free');

    for (const selector of ['#president-container', '#duty-container', '#stars-container']) {
        const escaped = selector.replace('#', '#');
        const rootRule = components.match(new RegExp(`body\\.magic-park-theme\\.theme-magic-park ${escaped}\\s*\\{([^}]*)\\}`, 's'))?.[1] || '';
        assert.doesNotMatch(rootRule, /box-shadow|backdrop-filter|filter/i,
            `${selector} must not add a recessed or shadowed root surface`);
    }

    const foregroundRule = layout.match(/\.bento-grid::after\s*\{([^}]*)\}/s)?.[1] || '';
    assert.match(foregroundRule, /sontema-foreground\.png/,
        'the baked transparent foreground artwork remains the top decorative layer');
    assert.match(foregroundRule, /z-index:\s*20/,
        'the foreground artwork must remain above all live content');
});

test('Class TV remains a flat DOM plane after the 3D rollback', () => {
    const components = read('public/themes/magic-park/magic-components.css');

    const planeRule = components.match(/body\.magic-park-theme\.theme-magic-park #class-tv-content-plane\s*\{([^}]*)\}/s)?.[1] || '';
    assert.match(planeRule, /inset:\s*0\s*;/,
        'Class TV must fill the curtained opening without a cavity-computed inset');
    assert.match(planeRule, /transform:\s*none\s*;/,
        'Class TV must remain geometrically flat');
    assert.match(planeRule, /filter:\s*none\s*;/,
        'Class TV must remain free of visual warp filters');
    assert.doesNotMatch(planeRule, /--magic-cavity|perspective|scale\(/i,
        'no recessed or curved-screen positioning may survive the rollback');

    const classTvRule = components.match(/body\.magic-park-theme\.theme-magic-park #class-tv-layer\s*\{([^}]*)\}/s)?.[1] || '';
    assert.match(classTvRule, /border:\s*0\s*;/);
    assert.match(classTvRule, /box-shadow:\s*none\s*;/);
});
