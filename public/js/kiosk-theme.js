(function () {
    'use strict';

    const STORAGE_KEY = 'classroom_kiosk_theme';
    const MIGRATION_KEY = 'classroom_kiosk_theme_migration';
    const MIGRATION_VERSION = 'magic-park-2.2-default-v1';
    const REGISTRY_URL = 'themes/registry.json';
    const SAFE_THEME = Object.freeze({
        id: 'magic-park',
        css: 'themes/magic-park/theme.css',
        themeClass: 'theme-magic-park'
    });

    let registryPromise = null;
    const manifestPromises = new Map();
    let switcherBound = false;

    function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    async function fetchJson(url) {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Theme resource failed with HTTP ${response.status}`);
        }
        return response.json();
    }

    function validateRegistry(registry) {
        if (!isPlainObject(registry) || registry.schemaVersion !== 1 || !Array.isArray(registry.themes)) {
            throw new Error('Invalid theme registry');
        }

        const ids = new Set();
        for (const entry of registry.themes) {
            if (!isPlainObject(entry) || typeof entry.id !== 'string' || typeof entry.manifest !== 'string') {
                throw new Error('Invalid theme registry entry');
            }
            if (ids.has(entry.id)) {
                throw new Error('Duplicate theme registry id');
            }
            ids.add(entry.id);
        }

        if (!ids.has(registry.defaultThemeId) || !ids.has(registry.fallbackThemeId)) {
            throw new Error('Theme registry default/fallback is not registered');
        }

        return registry;
    }

    function validateManifest(manifest, expectedId) {
        if (!isPlainObject(manifest) || manifest.schemaVersion !== 1 || manifest.id !== expectedId) {
            throw new Error('Invalid theme manifest');
        }

        for (const key of ['name', 'version', 'description', 'css', 'themeClass']) {
            if (typeof manifest[key] !== 'string' || !manifest[key].trim()) {
                throw new Error(`Theme manifest is missing ${key}`);
            }
        }

        if (!/^theme-[a-z0-9-]+$/.test(manifest.themeClass)) {
            throw new Error('Invalid themeClass');
        }

        if (!isPlainObject(manifest.capabilities) || manifest.capabilities.dynamicContent !== true) {
            throw new Error('Theme must preserve dynamic content');
        }

        return manifest;
    }

    function loadRegistry() {
        if (!registryPromise) {
            registryPromise = fetchJson(REGISTRY_URL).then(validateRegistry);
        }
        return registryPromise;
    }

    async function loadManifest(id) {
        const registry = await loadRegistry();
        const entry = registry.themes.find(theme => theme.id === id);
        if (!entry) {
            throw new Error('Unknown theme id');
        }

        if (!manifestPromises.has(id)) {
            manifestPromises.set(
                id,
                fetchJson(entry.manifest).then(manifest => validateManifest(manifest, id))
            );
        }

        return manifestPromises.get(id);
    }

    async function getSupportedThemeIds() {
        const registry = await loadRegistry();
        return registry.themes.map(theme => theme.id);
    }

    function readStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (_) {
            // Theme persistence is optional; rendering must continue.
        }
    }

    function getStoredTheme() {
        return readStorage(STORAGE_KEY);
    }

    function storeTheme(id) {
        writeStorage(STORAGE_KEY, id);
    }

    function migrateStoredTheme() {
        const stored = getStoredTheme();
        if (readStorage(MIGRATION_KEY) === MIGRATION_VERSION) return stored;

        const migrated = stored === 'school-garden' || stored === 'school-science'
            ? SAFE_THEME.id
            : stored;

        if (migrated !== stored) storeTheme(migrated);
        writeStorage(MIGRATION_KEY, MIGRATION_VERSION);
        return migrated;
    }

    function getActiveStylesheet() {
        return document.querySelector('#active-theme-stylesheet');
    }

    function emitThemeChange(themeId) {
        if (typeof window.dispatchEvent !== 'function' || typeof window.CustomEvent !== 'function') return;
        window.dispatchEvent(new window.CustomEvent('classroom:theme-change', {
            detail: { themeId }
        }));
    }

    function applyManifestToDom(manifest, persist) {
        const body = document.body;
        if (!body) return manifest.id;

        const previousThemeClass = body.dataset.themeClass;
        if (previousThemeClass) body.classList.remove(previousThemeClass);
        body.classList.remove(SAFE_THEME.themeClass);

        body.classList.add('magic-park-theme');
        body.classList.add(manifest.themeClass);
        body.dataset.theme = manifest.id;
        body.dataset.themeClass = manifest.themeClass;

        const stylesheet = getActiveStylesheet();
        if (stylesheet && stylesheet.getAttribute('href') !== manifest.css) {
            stylesheet.setAttribute('href', manifest.css);
        }

        if (persist) storeTheme(manifest.id);
        updateSwitcherSelection(manifest.id);
        emitThemeChange(manifest.id);
        return manifest.id;
    }

    function applySafeMagicPark() {
        const body = document.body;
        if (body) {
            const previousThemeClass = body.dataset.themeClass;
            if (previousThemeClass) body.classList.remove(previousThemeClass);
            body.classList.add('magic-park-theme');
            body.classList.add(SAFE_THEME.themeClass);
            body.dataset.theme = SAFE_THEME.id;
            body.dataset.themeClass = SAFE_THEME.themeClass;
        }

        const stylesheet = getActiveStylesheet();
        if (stylesheet) stylesheet.setAttribute('href', SAFE_THEME.css);
        updateSwitcherSelection(SAFE_THEME.id);
        emitThemeChange(SAFE_THEME.id);
        return SAFE_THEME.id;
    }

    async function resolveRequestedTheme(id) {
        const registry = await loadRegistry();
        const valid = typeof id === 'string' && registry.themes.some(theme => theme.id === id);
        return valid ? id : registry.fallbackThemeId;
    }

    async function applyTheme(id, options = {}) {
        const persist = options.persist !== false;
        try {
            const resolvedId = await resolveRequestedTheme(id);
            const manifest = await loadManifest(resolvedId);
            return applyManifestToDom(manifest, persist);
        } catch (_) {
            return applySafeMagicPark();
        }
    }

    function setSwitcherOpen(open) {
        const toggle = document.querySelector('#theme-switcher-toggle');
        const panel = document.querySelector('#theme-switcher-panel');
        if (!toggle || !panel) return;

        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function updateSwitcherSelection(activeId) {
        const choices = document.querySelector('#theme-switcher-choices');
        if (!choices || typeof choices.querySelectorAll !== 'function') return;

        for (const button of choices.querySelectorAll('[data-theme-choice]')) {
            const selected = button.dataset.themeChoice === activeId;
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
            button.dataset.selected = selected ? 'true' : 'false';
        }
    }

    async function renderSwitcherChoices() {
        const choices = document.querySelector('#theme-switcher-choices');
        if (!choices) return;

        const registry = await loadRegistry();
        const manifests = await Promise.all(registry.themes.map(theme => loadManifest(theme.id)));
        choices.innerHTML = '';

        for (const manifest of manifests) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'theme-switcher__choice';
            button.dataset.themeChoice = manifest.id;
            button.setAttribute('aria-pressed', 'false');
            button.textContent = manifest.name;
            button.addEventListener('click', async () => {
                await applyTheme(manifest.id);
                setSwitcherOpen(false);
            });
            choices.appendChild(button);
        }

        updateSwitcherSelection(document.body?.dataset.theme || SAFE_THEME.id);
    }

    function bindSwitcher() {
        if (switcherBound) return;

        const toggle = document.querySelector('#theme-switcher-toggle');
        const panel = document.querySelector('#theme-switcher-panel');
        if (!toggle || !panel) return;

        toggle.addEventListener('click', () => {
            setSwitcherOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') setSwitcherOpen(false);
        });

        document.addEventListener('click', event => {
            if (toggle.contains(event.target) || panel.contains(event.target)) return;
            setSwitcherOpen(false);
        });

        switcherBound = true;
    }

    async function initTheme() {
        try {
            const registry = await loadRegistry();
            const stored = migrateStoredTheme();
            const storedIsValid = typeof stored === 'string' && registry.themes.some(theme => theme.id === stored);
            const targetId = stored === null
                ? registry.defaultThemeId
                : (storedIsValid ? stored : registry.fallbackThemeId);

            const manifest = await loadManifest(targetId);
            const applied = applyManifestToDom(manifest, false);
            await renderSwitcherChoices();
            bindSwitcher();
            return applied;
        } catch (_) {
            bindSwitcher();
            return applySafeMagicPark();
        }
    }

    const api = {
        STORAGE_KEY,
        MIGRATION_KEY,
        MIGRATION_VERSION,
        loadRegistry,
        loadManifest,
        getSupportedThemeIds,
        getStoredTheme,
        applyTheme,
        initTheme,
        ready: null
    };

    window.ClassroomTheme = api;

    function start() {
        if (!api.ready) api.ready = initTheme();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
