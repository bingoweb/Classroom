const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const analyzerPath = path.join(projectRoot, 'scripts', 'analyze-kiosk-css.js');

function loadAnalyzer() {
    delete require.cache[require.resolve(analyzerPath)];
    return require(analyzerPath);
}

test('kiosk CSS analyzer exposes the dependency-free analysis contract', () => {
    assert.strictEqual(fs.existsSync(analyzerPath), true, 'scripts/analyze-kiosk-css.js must exist');
    const analyzer = loadAnalyzer();
    assert.strictEqual(typeof analyzer.parseCssRules, 'function');
    assert.strictEqual(typeof analyzer.buildKioskCssAnalysis, 'function');
    assert.strictEqual(typeof analyzer.renderMarkdown, 'function');
});

test('parseCssRules keeps nested grouping context and ignores keyframe frames as selectors', () => {
    const { parseCssRules } = loadAnalyzer();
    const css = `
        .base, #hero { color: red; padding: 4px; }
        @media (min-width: 900px) {
            .base { color: blue; }
            @supports (display: grid) {
                .grid > .item:hover { display: grid; }
            }
        }
        @keyframes pulse {
            from { opacity: 0; }
            50% { opacity: .5; }
            to { opacity: 1; }
        }
    `;

    const rules = parseCssRules(css, 'fixture.css');
    assert.deepStrictEqual(
        rules.map(rule => rule.selector),
        ['.base, #hero', '.base', '.grid > .item:hover']
    );
    assert.deepStrictEqual(rules[0].selectors, ['.base', '#hero']);
    assert.deepStrictEqual(rules[1].atRules, ['@media (min-width: 900px)']);
    assert.deepStrictEqual(rules[2].atRules, [
        '@media (min-width: 900px)',
        '@supports (display: grid)'
    ]);
    assert.deepStrictEqual(
        rules[0].declarations.map(item => [item.property, item.value, item.important]),
        [['color', 'red', false], ['padding', '4px', false]]
    );
});

test('analysis preserves stylesheet load order, duplicate declarations, and important winners', () => {
    const { buildKioskCssAnalysis } = loadAnalyzer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-kiosk-css-analysis-'));

    try {
        fs.mkdirSync(path.join(tempRoot, 'public', 'css'), { recursive: true });
        fs.mkdirSync(path.join(tempRoot, 'public', 'js'), { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'public', 'index.html'), '<div class="used"></div>');
        fs.writeFileSync(path.join(tempRoot, 'public', 'js', 'script.js'), "el.classList.add('dynamic-used');\n");
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'style.css'), `
            .used { color: red; padding: 4px; }
            .same-block-a { margin: 0; display: block; }
            .unused-static { color: purple; }
        `);
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-mode.css'), `
            .used { color: orange !important; }
            .same-block-b { margin: 0; display: block; }
        `);
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-magic-park.css'), `
            .used { color: blue; padding: 8px; }
            .dynamic-used { opacity: .8; }
        `);

        const analysis = buildKioskCssAnalysis(tempRoot);
        assert.deepStrictEqual(
            analysis.stylesheets.map(item => item.path),
            [
                'public/css/style.css',
                'public/css/kiosk-mode.css',
                'public/css/kiosk-magic-park.css'
            ]
        );

        const duplicate = analysis.duplicateSelectors.find(item => item.selector === '.used');
        assert.ok(duplicate, '.used duplicate selector chain must exist');
        assert.deepStrictEqual(
            duplicate.occurrences.map(item => item.file),
            [
                'public/css/style.css',
                'public/css/kiosk-mode.css',
                'public/css/kiosk-magic-park.css'
            ]
        );

        const colorChain = analysis.overrideChains.find(
            item => item.selector === '.used' && item.property === 'color'
        );
        assert.ok(colorChain, '.used color override chain must exist');
        assert.strictEqual(colorChain.winner.file, 'public/css/kiosk-mode.css');
        assert.strictEqual(colorChain.winner.important, true);
        assert.strictEqual(colorChain.winner.value, 'orange');

        const paddingChain = analysis.overrideChains.find(
            item => item.selector === '.used' && item.property === 'padding'
        );
        assert.ok(paddingChain, '.used padding override chain must exist');
        assert.strictEqual(paddingChain.winner.file, 'public/css/kiosk-magic-park.css');
        assert.strictEqual(paddingChain.winner.value, '8px');

        assert.ok(
            analysis.duplicateDeclarationBlocks.some(group => {
                const selectors = group.occurrences.map(item => item.selector);
                return selectors.includes('.same-block-a') && selectors.includes('.same-block-b');
            }),
            'identical declaration blocks must be grouped'
        );
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('unused-selector output is conservative and explicitly candidate-only', () => {
    const { buildKioskCssAnalysis } = loadAnalyzer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-kiosk-css-unused-'));

    try {
        fs.mkdirSync(path.join(tempRoot, 'public', 'css'), { recursive: true });
        fs.mkdirSync(path.join(tempRoot, 'public', 'js'), { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'public', 'index.html'), '<div class="used"></div>');
        fs.writeFileSync(path.join(tempRoot, 'public', 'js', 'script.js'), "node.classList.add('dynamic-used');\n");
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'style.css'), `
            .used { color: red; }
            .dynamic-used:hover { color: blue; }
            .unused-static > #unused-child { color: purple; }
            body { margin: 0; }
        `);
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-mode.css'), '');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-magic-park.css'), '');

        const analysis = buildKioskCssAnalysis(tempRoot);
        const selectors = analysis.unusedSelectorCandidates.map(item => item.selector);
        assert.ok(selectors.includes('.unused-static > #unused-child'));
        assert.ok(!selectors.includes('.used'));
        assert.ok(!selectors.includes('.dynamic-used:hover'));
        assert.ok(!selectors.includes('body'), 'generic element-only selectors are not static dead candidates');
        assert.ok(
            analysis.unusedSelectorCandidates.every(item => item.classification === 'candidate'),
            'static analysis must never call a selector definitively dead'
        );
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('one comma-separated selector rule is not misreported as duplicate declaration blocks', () => {
    const { buildKioskCssAnalysis } = loadAnalyzer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-kiosk-css-selector-list-'));

    try {
        fs.mkdirSync(path.join(tempRoot, 'public', 'css'), { recursive: true });
        fs.mkdirSync(path.join(tempRoot, 'public', 'js'), { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'public', 'index.html'), '<h1></h1><h2></h2>');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'style.css'), 'h1, h2 { color: red; font-weight: 700; }\n');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-mode.css'), '');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-magic-park.css'), '');

        const analysis = buildKioskCssAnalysis(tempRoot);
        assert.strictEqual(analysis.duplicateDeclarationBlocks.length, 0);
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('production kiosk analysis scans the three current stylesheets and returns a non-empty inventory', () => {
    const { buildKioskCssAnalysis } = loadAnalyzer();
    const analysis = buildKioskCssAnalysis(projectRoot);

    assert.strictEqual(analysis.stylesheets.length, 3);
    assert.deepStrictEqual(
        analysis.stylesheets.map(item => item.path),
        [
            'public/css/style.css',
            'public/css/kiosk-mode.css',
            'public/css/kiosk-magic-park.css'
        ]
    );
    assert.ok(analysis.summary.ruleCount > 100);
    assert.ok(analysis.summary.selectorCount > 100);
    assert.ok(analysis.summary.declarationCount > 500);
    assert.ok(analysis.summary.unusedSelectorUniqueCount > 0);
    assert.ok(analysis.summary.unusedSelectorUniqueCount <= analysis.summary.unusedSelectorCandidateCount);
    assert.strictEqual(analysis.unusedSelectorCandidates.every(item => item.classification === 'candidate'), true);
});

test('stylesheet line counts match wc -l newline-count semantics used by the project inventory', () => {
    const { buildKioskCssAnalysis } = loadAnalyzer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-kiosk-css-lines-'));

    try {
        fs.mkdirSync(path.join(tempRoot, 'public', 'css'), { recursive: true });
        fs.mkdirSync(path.join(tempRoot, 'public', 'js'), { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'public', 'index.html'), '');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'style.css'), '.a { color: red; }\n.b { color: blue; }\n');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-mode.css'), '');
        fs.writeFileSync(path.join(tempRoot, 'public', 'css', 'kiosk-magic-park.css'), '.c { color: green; }');

        const analysis = buildKioskCssAnalysis(tempRoot);
        assert.deepStrictEqual(
            analysis.stylesheets.map(item => item.lineCount),
            [2, 0, 0]
        );
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
});
