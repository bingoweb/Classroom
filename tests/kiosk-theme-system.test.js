const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const publicRoot = path.join(root, 'public');
const themeRoot = path.join(publicRoot, 'themes');
const registryPath = path.join(themeRoot, 'registry.json');
const schemaPath = path.join(themeRoot, 'theme.schema.json');
const themeScriptPath = path.join(publicRoot, 'js', 'kiosk-theme.js');
const themeSystemCssPath = path.join(publicRoot, 'css', 'kiosk-theme-system.css');
const schoolBoardContentCssPath = path.join(themeRoot, '_shared', 'school-board-content.css');
const indexPath = path.join(publicRoot, 'index.html');

const EXPECTED_THEME_IDS = [
    'magic-park',
    'school-garden',
    'school-science'
];

const EXPECTED_THEME_CLASSES = [
    'theme-magic-park',
    'theme-school-garden',
    'theme-school-science'
];

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        add(...tokens) { tokens.forEach(token => values.add(token)); },
        remove(...tokens) { tokens.forEach(token => values.delete(token)); },
        contains(token) { return values.has(token); },
        values() { return [...values]; }
    };
}

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        dump() { return Object.fromEntries(values); }
    };
}

function createFetch({ failRegistry = false } = {}) {
    return async (url) => {
        if (failRegistry && String(url).endsWith('themes/registry.json')) {
            return { ok: false, status: 503, json: async () => ({}) };
        }

        const normalized = String(url)
            .replace(/^https?:\/\/[^/]+\//, '')
            .replace(/^\//, '');
        const filePath = path.join(publicRoot, normalized);
        if (!fs.existsSync(filePath)) {
            return { ok: false, status: 404, json: async () => ({}) };
        }

        return {
            ok: true,
            status: 200,
            json: async () => readJson(filePath)
        };
    };
}

function createEventTarget(extra = {}) {
    const listeners = new Map();
    return {
        ...extra,
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
        },
        dispatch(type, event = {}) {
            for (const listener of listeners.get(type) || []) listener(event);
        }
    };
}

function loadThemeModule({ storedTheme, initialStorage, storageThrows = false, failRegistry = false } = {}) {
    assert.ok(fs.existsSync(themeScriptPath), 'public/js/kiosk-theme.js must exist');

    const source = fs.readFileSync(themeScriptPath, 'utf8');
    const classList = createClassList([
        'magic-park-theme',
        'theme-magic-park',
        'unrelated-body-class'
    ]);
    const body = createEventTarget({
        classList,
        dataset: { theme: 'magic-park' },
        contains() { return false; }
    });
    const seededStorage = initialStorage
        ? { ...initialStorage }
        : (storedTheme === undefined ? {} : { classroom_kiosk_theme: storedTheme });
    const storage = createStorage(seededStorage);
    const localStorage = storageThrows
        ? {
            getItem() { throw new Error('storage denied'); },
            setItem() { throw new Error('storage denied'); }
        }
        : storage;

    const activeStylesheet = {
        attributes: new Map([['href', 'themes/magic-park/theme.css']]),
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        getAttribute(name) { return this.attributes.get(name) || null; }
    };
    const themeToggle = createEventTarget({
        attributes: new Map([['aria-expanded', 'false']]),
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        getAttribute(name) { return this.attributes.get(name) || null; }
    });
    const themePanel = createEventTarget({
        hidden: true,
        contains() { return false; }
    });
    const themeChoices = createEventTarget({
        innerHTML: '',
        children: [],
        appendChild(child) { this.children.push(child); },
        querySelectorAll() { return this.children; }
    });

    const document = createEventTarget({
        body,
        readyState: 'loading',
        querySelector(selector) {
            if (selector === '#active-theme-stylesheet') return activeStylesheet;
            if (selector === '#theme-switcher-toggle') return themeToggle;
            if (selector === '#theme-switcher-panel') return themePanel;
            if (selector === '#theme-switcher-choices') return themeChoices;
            return null;
        },
        querySelectorAll() { return []; },
        createElement(tagName) {
            return createEventTarget({
                tagName: String(tagName).toUpperCase(),
                type: '',
                className: '',
                textContent: '',
                dataset: {},
                attributes: new Map(),
                setAttribute(name, value) { this.attributes.set(name, String(value)); },
                getAttribute(name) { return this.attributes.get(name) || null; }
            });
        }
    });
    const window = createEventTarget({ document, localStorage });
    window.window = window;

    const context = vm.createContext({
        window,
        document,
        localStorage,
        fetch: createFetch({ failRegistry }),
        console,
        Object,
        Array,
        Set,
        Map,
        Promise,
        URL,
        Error
    });
    vm.runInContext(source, context, { filename: themeScriptPath });

    return {
        theme: window.ClassroomTheme,
        body,
        classList,
        storage,
        activeStylesheet,
        themeChoices
    };
}

test('multi-theme package filesystem contract', async (t) => {
    await t.test('registry, schema and exact supported packages exist', () => {
        assert.ok(fs.existsSync(registryPath), 'public/themes/registry.json must exist');
        assert.ok(fs.existsSync(schemaPath), 'public/themes/theme.schema.json must exist');

        const registry = readJson(registryPath);
        assert.equal(registry.schemaVersion, 1);
        assert.equal(registry.defaultThemeId, 'magic-park');
        assert.equal(registry.fallbackThemeId, 'magic-park');
        assert.deepEqual(registry.themes.map(theme => theme.id), EXPECTED_THEME_IDS);
        assert.equal(new Set(registry.themes.map(theme => theme.id)).size, registry.themes.length);
    });

    await t.test('every registry entry owns a valid manifest and CSS entrypoint', () => {
        const registry = readJson(registryPath);
        const seenClasses = new Set();

        for (const entry of registry.themes) {
            const manifestPath = path.join(publicRoot, entry.manifest);
            assert.ok(fs.existsSync(manifestPath), `${entry.manifest} must exist`);
            const manifest = readJson(manifestPath);

            assert.equal(manifest.schemaVersion, 1);
            assert.equal(manifest.id, entry.id);
            assert.ok(typeof manifest.name === 'string' && manifest.name.length > 0);
            assert.ok(typeof manifest.version === 'string' && manifest.version.length > 0);
            assert.ok(typeof manifest.description === 'string' && manifest.description.length > 0);
            assert.ok(EXPECTED_THEME_CLASSES.includes(manifest.themeClass));
            assert.equal(seenClasses.has(manifest.themeClass), false, 'themeClass must be unique');
            seenClasses.add(manifest.themeClass);

            const cssPath = path.join(publicRoot, manifest.css);
            assert.ok(fs.existsSync(cssPath), `${manifest.css} must exist`);
            assert.ok(fs.statSync(cssPath).size > 0, `${manifest.css} must not be empty`);

            if (manifest.backgroundAsset) {
                const backgroundPath = path.join(publicRoot, manifest.backgroundAsset);
                assert.ok(fs.existsSync(backgroundPath), `${manifest.backgroundAsset} must exist`);
                assert.ok(fs.statSync(backgroundPath).size > 0, `${manifest.backgroundAsset} must not be empty`);
            }

            assert.equal(manifest.capabilities?.layoutGeometry, true,
                `${entry.id} must declare layoutGeometry capability`);
        }
    });

    await t.test('theme schema documents future package fields', () => {
        const schema = readJson(schemaPath);
        const required = schema.required || [];
        for (const field of [
            'schemaVersion',
            'id',
            'name',
            'version',
            'description',
            'css',
            'themeClass',
            'capabilities'
        ]) {
            assert.ok(required.includes(field), `theme.schema.json must require ${field}`);
        }
    });

    await t.test('school packages own artwork/material/layout tokens independently', () => {
        for (const id of ['school-garden', 'school-science']) {
            const cssPath = path.join(themeRoot, id, 'theme.css');
            const css = fs.readFileSync(cssPath, 'utf8');

            assert.match(css, /@import\s+url\(['"]\.\.\/\.\.\/css\/kiosk-magic-park\.css['"]\)/,
                `${id} must use the validated MP2 compatibility base`);
            assert.match(css, /@import\s+url\(['"]\.\.\/_shared\/school-board-content\.css['"]\)/,
                `${id} must use the shared short-wide school board content profile`);
            assert.match(css, /\.\/assets\/background\.png/);

            for (const token of [
                '--theme-left-col',
                '--theme-center-col',
                '--theme-right-col',
                '--theme-left-rows',
                '--theme-center-rows',
                '--theme-right-rows',
                '--theme-card-fill',
                '--theme-card-border',
                '--theme-card-shadow',
                '--theme-title-color'
            ]) {
                assert.match(css, new RegExp(token), `${id} must own ${token}`);
            }
        }
    });

    await t.test('short-wide school board profile prevents inherited vertical compositions from clipping', () => {
        assert.ok(fs.existsSync(schoolBoardContentCssPath),
            'public/themes/_shared/school-board-content.css must exist');
        const css = fs.readFileSync(schoolBoardContentCssPath, 'utf8');

        assert.match(css, /\.clock-content-wrapper\s*\{[^}]*grid-template-columns:/s,
            'clock must switch to a horizontal board composition');
        assert.match(css, /\.date-section\s*\{[^}]*grid-column:\s*1/s);
        assert.match(css, /\.clock-section\s*\{[^}]*grid-column:\s*2/s);
        assert.match(css, /\.weekend-section\s*\{[^}]*grid-column:\s*1/s);

        assert.match(css, /\.goodbye-mode:not\(\[style\*="display: none"\]\)\s*\{[^}]*display:\s*grid\s*!important/s,
            'visible goodbye/weekend state must own a compact grid layout');
        assert.match(css, /\.goodbye-visual\s*\{[^}]*grid-row:\s*1\s*\/\s*3/s);

        assert.match(css, /\.before-school-mode:not\(\[style\*="display: none"\]\)\s*\{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:/s,
            'visible before-school state must use a horizontal school-board grid');
        assert.match(css, /\.clock-visual\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*1\s*\/\s*4/s);
        assert.match(css, /\.before-school-mode \.countdown-text\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*3/s);

        assert.match(css, /\.countdown-mode:not\(\[style\*="display: none"\]\)\s*\{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:/s,
            'active lesson/break state must use a horizontal school-board grid');
        assert.doesNotMatch(css, /\.countdown-mode\s*\{[^}]*display:\s*grid\s*!important/s,
            'hidden countdown-mode must remain hideable by runtime inline state');
        assert.match(css, /\.countdown-mode h3\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*1/s);
        assert.match(css, /\.countdown-mode \.period-context\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*2/s);
        assert.match(css, /\.countdown-mode \.progress-bar-container\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*3/s);
        assert.match(css, /\.countdown-mode \.countdown-text\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*1\s*\/\s*4[^}]*min-height:\s*0/s);

        assert.match(css, /#president-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*45%\)\s+minmax\(0,\s*55%\)/s,
            'school president board must use a short-wide team layout');
        assert.match(css, /\.president-main\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto/s);
        assert.match(css, /\.president-avatar-large\s*\{[^}]*max-height:\s*100%/s);
        assert.match(css, /\.vice-presidents-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
        assert.match(css, /#president-container\s*>\s*\.role-empty-state\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s,
            'president empty state must span the complete school board');

        assert.match(css, /\.role-empty-state--president,\s*[\s\S]*?\.role-empty-state--stars\s*\{[^}]*grid-template-columns:/s,
            'short school role empty states must use a horizontal icon/copy layout');
        assert.match(css, /\.role-empty-state--president \.role-empty-icon,\s*[\s\S]*?\.role-empty-state--stars \.role-empty-icon\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*1\s*\/\s*3[^}]*max-height:\s*100%/s);
        assert.match(css, /\.role-empty-state--president \.role-empty-title,\s*[\s\S]*?\.role-empty-state--stars \.role-empty-title\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*1/s);
        assert.match(css, /\.role-empty-state--president \.role-empty-message,\s*[\s\S]*?\.role-empty-state--stars \.role-empty-message\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*2/s);

        assert.match(css, /\.star-slide\s*\{[^}]*grid-template-columns:/s,
            'star board must use a horizontal avatar/name composition');
        assert.match(css, /\.star-avatar\s*\{[^}]*max-height:\s*100%/s);
        assert.match(css, /\.star-name\s*\{[^}]*grid-column:\s*2/s);

        assert.match(css, /#noise-character-img\s*\{[^}]*width:\s*100%[^}]*height:\s*100%[^}]*object-fit:\s*contain/s,
            'school noise character must scale from available board height instead of width');
        assert.match(css, /\.noise-meter-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*58%\)\s+minmax\(0,\s*42%\)[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/s,
            'listening meter and equalizer must share the short-wide board horizontally');
        assert.match(css, /\.equalizer-container\s*\{[^}]*grid-column:\s*2[^}]*height:\s*100%[^}]*min-height:\s*0/s);
        assert.match(css, /\.equalizer-bars\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0/s);
        assert.match(css, /mic-state-idle \.noise-meter-container,[\s\S]*?mic-state-unavailable \.noise-meter-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
            'non-listening noise states must give the progress surface the full row');
    });

    await t.test('Magic Park package entrypoint preserves the existing validated stylesheet', () => {
        const css = fs.readFileSync(path.join(themeRoot, 'magic-park', 'theme.css'), 'utf8');
        const legacyCss = fs.readFileSync(path.join(publicRoot, 'css', 'kiosk-magic-park.css'), 'utf8');
        assert.match(css, /@import\s+url\(['"]\.\.\/\.\.\/css\/kiosk-magic-park\.css['"]\)/);
        assert.match(legacyCss, /body\.magic-park-theme \.bento-grid/);
    });

    await t.test('index uses a generic package stylesheet and registry-driven selector shell', () => {
        const html = fs.readFileSync(indexPath, 'utf8');
        assert.match(html, /<body[^>]*class="magic-park-theme[^"\n]*"[^>]*data-theme="magic-park"/);
        assert.match(html, /id="active-theme-stylesheet"[^>]*href="themes\/magic-park\/theme\.css"/);
        assert.match(html, /css\/kiosk-theme-system\.css/);
        assert.match(html, /js\/kiosk-theme\.js/);
        assert.match(html, /id="theme-switcher"/);
        assert.match(html, /id="theme-switcher-choices"/);
        assert.doesNotMatch(html, /data-theme-choice="(?:magic-park|school-garden|school-science)"/,
            'theme choices must be generated from manifests, not hard-coded in HTML');
        assert.doesNotMatch(html, /themes\/school-(?:garden|science)\/assets\/background\.png/,
            'theme-specific background assets must not be hard-coded or globally preloaded by index.html');
    });

    await t.test('runtime loads registry IDs/default/fallback from JSON rather than hard-coded constants', async () => {
        assert.ok(fs.existsSync(themeScriptPath), 'public/js/kiosk-theme.js must exist');
        const { theme } = loadThemeModule();
        assert.ok(theme, 'window.ClassroomTheme must be exposed');
        assert.equal(theme.STORAGE_KEY, 'classroom_kiosk_theme');
        assert.equal(theme.MIGRATION_KEY, 'classroom_kiosk_theme_migration');
        assert.equal(theme.MIGRATION_VERSION, 'magic-park-2.2-default-v1');
        const ids = await theme.getSupportedThemeIds();
        assert.deepEqual(Array.from(ids), EXPECTED_THEME_IDS);
        const registry = await theme.loadRegistry();
        assert.equal(registry.defaultThemeId, 'magic-park');
        assert.equal(registry.fallbackThemeId, 'magic-park');
    });

    await t.test('missing storage uses original Magic Park default and keeps its package stylesheet', async () => {
        const { theme, body, classList, activeStylesheet } = loadThemeModule();
        const applied = await theme.initTheme();

        assert.equal(applied, 'magic-park');
        assert.equal(body.dataset.theme, 'magic-park');
        assert.equal(classList.contains('magic-park-theme'), true, 'legacy MP2 bridge must remain');
        assert.equal(classList.contains('theme-school-garden'), false);
        assert.equal(classList.contains('theme-magic-park'), true);
        assert.equal(classList.contains('unrelated-body-class'), true);
        assert.equal(activeStylesheet.getAttribute('href'), 'themes/magic-park/theme.css');
    });

    await t.test('legacy Garden preference migrates to Magic Park exactly once', async () => {
        const first = loadThemeModule({ storedTheme: 'school-garden' });
        assert.equal(await first.theme.initTheme(), 'magic-park');
        assert.equal(first.body.dataset.theme, 'magic-park');
        assert.equal(first.storage.dump().classroom_kiosk_theme, 'magic-park');
        assert.equal(
            first.storage.dump().classroom_kiosk_theme_migration,
            'magic-park-2.2-default-v1'
        );

        first.storage.setItem('classroom_kiosk_theme', 'school-garden');
        const reloaded = loadThemeModule({ initialStorage: first.storage.dump() });
        assert.equal(await reloaded.theme.initTheme(), 'school-garden');
        assert.equal(reloaded.body.dataset.theme, 'school-garden');
    });

    await t.test('legacy Science preference migrates to Magic Park exactly once', async () => {
        const first = loadThemeModule({ storedTheme: 'school-science' });
        assert.equal(await first.theme.initTheme(), 'magic-park');
        assert.equal(first.storage.dump().classroom_kiosk_theme, 'magic-park');
        assert.equal(
            first.storage.dump().classroom_kiosk_theme_migration,
            'magic-park-2.2-default-v1'
        );
    });

    await t.test('existing Magic Park preference is retained while migration marker is recorded', async () => {
        const current = loadThemeModule({ storedTheme: 'magic-park' });
        assert.equal(await current.theme.initTheme(), 'magic-park');
        assert.equal(current.storage.dump().classroom_kiosk_theme, 'magic-park');
        assert.equal(
            current.storage.dump().classroom_kiosk_theme_migration,
            'magic-park-2.2-default-v1'
        );
    });

    await t.test('migration marker preserves an explicit alternate-theme selection across reloads', async () => {
        const first = loadThemeModule();
        assert.equal(await first.theme.initTheme(), 'magic-park');
        assert.equal(await first.theme.applyTheme('school-science'), 'school-science');
        assert.equal(first.storage.dump().classroom_kiosk_theme, 'school-science');
        assert.equal(
            first.storage.dump().classroom_kiosk_theme_migration,
            'magic-park-2.2-default-v1'
        );
        assert.equal(first.body.dataset.theme, 'school-science');
        assert.equal(first.activeStylesheet.getAttribute('href'), 'themes/school-science/theme.css');

        const reloaded = loadThemeModule({ initialStorage: first.storage.dump() });
        assert.equal(await reloaded.theme.initTheme(), 'school-science');
        assert.equal(reloaded.classList.contains('theme-school-science'), true);
    });

    await t.test('unknown/corrupt stored theme falls back to Magic Park package', async () => {
        const unknown = loadThemeModule({ storedTheme: 'definitely-not-a-theme' });
        assert.equal(await unknown.theme.initTheme(), 'magic-park');
        assert.equal(unknown.body.dataset.theme, 'magic-park');
        assert.equal(unknown.classList.contains('magic-park-theme'), true);
        assert.equal(unknown.classList.contains('theme-magic-park'), true);
        assert.equal(unknown.activeStylesheet.getAttribute('href'), 'themes/magic-park/theme.css');

        const direct = loadThemeModule();
        assert.equal(await direct.theme.applyTheme({ broken: true }), 'magic-park');
    });

    await t.test('storage denial does not block the registry default', async () => {
        const { theme, body } = loadThemeModule({ storageThrows: true });
        assert.equal(await theme.initTheme(), 'magic-park');
        assert.equal(body.dataset.theme, 'magic-park');
        assert.equal(await theme.applyTheme('school-science'), 'school-science');
    });

    await t.test('registry failure leaves/render-restores safe Magic Park without throwing', async () => {
        const { theme, body, classList, activeStylesheet } = loadThemeModule({ failRegistry: true });
        assert.equal(await theme.initTheme(), 'magic-park');
        assert.equal(body.dataset.theme, 'magic-park');
        assert.equal(classList.contains('magic-park-theme'), true);
        assert.equal(classList.contains('theme-magic-park'), true);
        assert.equal(activeStylesheet.getAttribute('href'), 'themes/magic-park/theme.css');
    });

    await t.test('theme system UI CSS is isolated from theme package CSS', () => {
        assert.ok(fs.existsSync(themeSystemCssPath), 'public/css/kiosk-theme-system.css must exist');
        const css = fs.readFileSync(themeSystemCssPath, 'utf8');
        assert.match(css, /#theme-switcher/);
        assert.doesNotMatch(css, /background\.png/,
            'system UI CSS must not own theme artwork');
    });

    await t.test('theme switcher treats clicks on toggle children as inside the toggle', () => {
        const source = fs.readFileSync(themeScriptPath, 'utf8');
        assert.match(
            source,
            /toggle\.contains\(event\.target\)\s*\|\|\s*panel\.contains\(event\.target\)/,
            'outside-click guard must use containment so clicking the toggle icon does not immediately close the panel'
        );
        assert.doesNotMatch(
            source,
            /toggle\s*===\s*event\.target\s*\|\|\s*panel\.contains\(event\.target\)/,
            'strict target equality is unsafe when the button contains an icon child'
        );
    });

    await t.test('theme system regression is part of the project-wide core gate', () => {
        const packageJson = readJson(path.join(root, 'package.json'));
        assert.match(
            packageJson.scripts['test:core'],
            /tests\/kiosk-theme-system\.test\.js/,
            'npm run test:core must include the multi-theme package regression'
        );
    });
});
