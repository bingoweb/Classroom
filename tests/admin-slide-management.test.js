const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement() {
    return {
        innerHTML: '',
        value: '',
        textContent: '',
        style: {},
        dataset: {},
        addEventListener() {},
        querySelectorAll() { return []; },
        classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
        }
    };
}

function loadAdminSandbox(fetchImpl) {
    const slideList = createElement();
    const genericElements = new Map();
    genericElements.set('slidesList', slideList);
    genericElements.set('addStudentForm', createElement());

    const document = {
        addEventListener() {},
        querySelectorAll() { return []; },
        getElementById(id) {
            if (!genericElements.has(id)) genericElements.set(id, createElement());
            return genericElements.get(id);
        }
    };

    const logger = {
        debug() {},
        info() {},
        warn() {},
        error() {}
    };

    const sandbox = {
        console,
        document,
        fetch: fetchImpl,
        CONFIG: { API_URL: '/api' },
        COMPONENTS: { ADMIN: 'ADMIN', SYSTEM: 'SYSTEM' },
        logger,
        Utils: {
            normalizePath(value) { return value; },
            escapeHtml(value) { return String(value ?? ''); },
            getAvatarPath() { return '/assets/default_boy.png'; },
            showError() {},
            showSuccess() {}
        },
        confirm() { return true; },
        FileReader: class {},
        FormData: class {
            append() {}
        },
        XMLHttpRequest: class {},
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval
    };
    sandbox.window = sandbox;
    sandbox.window.addEventListener = () => {};

    vm.createContext(sandbox);
    const source = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
    vm.runInContext(source, sandbox, { filename: 'public/admin/admin.js' });

    return { sandbox, slideList };
}

test('Admin slide management frontend', async (t) => {
    await t.test('fetchSlides uses the authenticated management-list endpoint', async () => {
        let requestedUrl = null;
        const slides = [
            {
                id: 5,
                title: 'Pasif örnek',
                content_type: 'photo',
                media_type: 'image',
                media_path: '/uploads/slides/passive.jpg',
                transition_mode: 'auto',
                display_order: 1,
                is_active: 0
            }
        ];

        const { sandbox, slideList } = loadAdminSandbox(async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                async json() { return slides; }
            };
        });

        await sandbox.fetchSlides();

        assert.strictEqual(requestedUrl, '/api/admin/slides');
        assert.match(slideList.innerHTML, /Pasif örnek/);
    });

    await t.test('renderSlides keeps inactive slides visible and gives explicit activation labels', () => {
        const { sandbox, slideList } = loadAdminSandbox(async () => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            async json() { return []; }
        }));

        sandbox.renderSlides([
            {
                id: 1,
                title: 'Aktif slayt',
                content_type: 'photo',
                media_type: 'image',
                media_path: '',
                transition_mode: 'auto',
                display_order: 1,
                is_active: 1
            },
            {
                id: 2,
                title: 'Pasif slayt',
                content_type: 'photo',
                media_type: 'image',
                media_path: '',
                transition_mode: 'auto',
                display_order: 2,
                is_active: 0
            }
        ]);

        assert.match(slideList.innerHTML, /Aktif slayt/);
        assert.match(slideList.innerHTML, /Pasif slayt/);
        assert.match(slideList.innerHTML, /slide-item is-inactive/);
        assert.match(slideList.innerHTML, />Pasif Yap<\/button>/);
        assert.match(slideList.innerHTML, />Aktif Yap<\/button>/);
    });
});
