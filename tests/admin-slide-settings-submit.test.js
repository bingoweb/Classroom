const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement(value = '') {
    return {
        value,
        innerHTML: '',
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

function makeResponse({ ok, status = 200, statusText = 'OK', jsonValue = {} }) {
    return {
        ok,
        status,
        statusText,
        async json() {
            if (jsonValue instanceof Error) throw jsonValue;
            return jsonValue;
        }
    };
}

function loadAdminSandbox(fetchImpl) {
    const elements = new Map([
        ['defaultDuration', createElement('10')],
        ['defaultTransitionMode', createElement('auto')],
        ['defaultTransitionDuration', createElement('1.2')],
        ['addStudentForm', createElement()],
        ['slidesList', createElement()],
        ['attendanceDate', createElement()]
    ]);

    const notifications = { success: [], error: [] };
    const logErrors = [];
    const document = {
        addEventListener() {},
        querySelectorAll() { return []; },
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, createElement());
            return elements.get(id);
        }
    };

    const sandbox = {
        console,
        document,
        fetch: fetchImpl,
        CONFIG: { API_URL: '/api' },
        COMPONENTS: { ADMIN: 'ADMIN', SYSTEM: 'SYSTEM' },
        logger: {
            debug() {},
            info() {},
            warn() {},
            error(...args) { logErrors.push(args); }
        },
        Utils: {
            normalizePath(value) { return value; },
            escapeHtml(value) { return String(value ?? ''); },
            getAvatarPath() { return '/assets/default_boy.png'; },
            getIstanbulDateKey() { return '2026-08-08'; },
            showError(message) { notifications.error.push(message); },
            showSuccess(message) { notifications.success.push(message); }
        },
        confirm() { return true; },
        FileReader: class {},
        FormData: class { append() {} },
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

    return { sandbox, elements, notifications, logErrors };
}

function submitEvent() {
    return { preventDefault() {} };
}

test('Admin slide settings atomic submit', async (t) => {
    await t.test('successful save uses exactly one PUT with the three normalized settings', async () => {
        const calls = [];
        const { sandbox, notifications } = loadAdminSandbox(async (url, options) => {
            calls.push({ url, options });
            return makeResponse({ ok: true, jsonValue: { message: 'ok' } });
        });

        await sandbox.handleSlideSettingsSubmit(submitEvent());

        assert.equal(calls.length, 1, 'settings must be persisted with one atomic HTTP request');
        assert.equal(calls[0].url, '/api/slide-settings');
        assert.equal(calls[0].options.method, 'PUT');
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            default_duration: 10000,
            default_transition_mode: 'auto',
            default_transition_duration: 1200
        });
        assert.deepEqual(notifications.error, []);
        assert.deepEqual(notifications.success, ['Ayarlar başarıyla kaydedildi!']);
    });

    await t.test('HTTP 500 shows the safe server error and never shows success', async () => {
        const calls = [];
        const { sandbox, notifications } = loadAdminSandbox(async (url, options) => {
            calls.push({ url, options });
            return makeResponse({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                jsonValue: { error: 'Slayt ayarları güncellenirken hata oluştu' }
            });
        });

        await sandbox.handleSlideSettingsSubmit(submitEvent());

        assert.equal(calls.length, 1);
        assert.equal(calls[0].options.method, 'PUT');
        assert.deepEqual(notifications.success, []);
        assert.deepEqual(notifications.error, ['Slayt ayarları güncellenirken hata oluştu']);
    });

    await t.test('HTTP 400 validation error is surfaced and no success appears', async () => {
        const calls = [];
        const { sandbox, notifications } = loadAdminSandbox(async (url, options) => {
            calls.push({ url, options });
            return makeResponse({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                jsonValue: { error: 'Geçiş modu geçersiz' }
            });
        });

        await sandbox.handleSlideSettingsSubmit(submitEvent());

        assert.equal(calls.length, 1);
        assert.deepEqual(notifications.success, []);
        assert.deepEqual(notifications.error, ['Geçiş modu geçersiz']);
    });

    await t.test('malformed 503 response uses a bounded generic HTTP error and no success', async () => {
        const calls = [];
        const { sandbox, notifications } = loadAdminSandbox(async (url, options) => {
            calls.push({ url, options });
            return makeResponse({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                jsonValue: new Error('malformed-json')
            });
        });

        await sandbox.handleSlideSettingsSubmit(submitEvent());

        assert.equal(calls.length, 1);
        assert.deepEqual(notifications.success, []);
        assert.deepEqual(notifications.error, ['Ayarlar kaydedilirken hata oluştu (503 Service Unavailable).']);
    });

    await t.test('network failure logs diagnostics and shows only the generic user message', async () => {
        const calls = [];
        const networkError = new Error('ECONNRESET internal detail');
        const { sandbox, notifications, logErrors } = loadAdminSandbox(async (url, options) => {
            calls.push({ url, options });
            throw networkError;
        });

        await sandbox.handleSlideSettingsSubmit(submitEvent());

        assert.equal(calls.length, 1);
        assert.deepEqual(notifications.success, []);
        assert.deepEqual(notifications.error, ['Ayarlar kaydedilirken hata oluştu.']);
        assert.ok(logErrors.some(args => args.includes(networkError)), 'network error should remain in logger diagnostics');
        assert.ok(!notifications.error.some(message => message.includes('ECONNRESET')), 'internal network detail must not leak to UI');
    });

    await t.test('non-string or blank server error does not become a user-facing message', async () => {
        for (const serverError of [null, '', '   ', 42, { detail: 'internal' }]) {
            const calls = [];
            const { sandbox, notifications } = loadAdminSandbox(async (url, options) => {
                calls.push({ url, options });
                return makeResponse({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    jsonValue: { error: serverError }
                });
            });

            await sandbox.handleSlideSettingsSubmit(submitEvent());
            assert.equal(calls.length, 1);
            assert.deepEqual(notifications.success, []);
            assert.deepEqual(notifications.error, ['Ayarlar kaydedilirken hata oluştu (500 Internal Server Error).']);
        }
    });

    await t.test('source contract contains a single PUT and no per-setting POST loop', () => {
        const source = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        const start = source.indexOf('async function handleSlideSettingsSubmit');
        const end = source.indexOf('// Attendance Functions', start);
        const fnSource = source.slice(start, end);

        assert.ok(start >= 0 && end > start, 'slide settings submit function should exist');
        assert.match(fnSource, /method:\s*['"]PUT['"]/);
        assert.doesNotMatch(fnSource, /updateSetting\s*\(/);
        assert.doesNotMatch(fnSource, /method:\s*['"]POST['"]/);
    });
});
