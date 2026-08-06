const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/logger.js'), 'utf8');

function createLogger(pathname) {
    const requests = [];
    const sandbox = {
        CONFIG: { API_URL: 'http://localhost/api' },
        URLSearchParams,
        console: { debug() {}, error() {}, log() {}, warn() {} },
        fetch: async (...args) => {
            requests.push(args);
            return { ok: true };
        },
        localStorage: { getItem: () => null, setItem() {} },
        navigator: { userAgent: 'test' },
        window: {
            addEventListener() {},
            location: { href: `http://localhost${pathname}`, pathname, search: '' }
        }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(`${source}\nglobalThis.__logger = logger; globalThis.__components = COMPONENTS;`, sandbox);
    return { logger: sandbox.__logger, components: sandbox.__components, requests };
}

test('dashboard failures retain an explicit component label', () => {
    const { logger, components } = createLogger('/');

    assert.strictEqual(components.DASHBOARD, 'DASHBOARD');
    const entry = logger.formatLog('ERROR', components.DASHBOARD, 'Dashboard failed');
    assert.strictEqual(entry.component, 'DASHBOARD');
});

test('public kiosk keeps bounded local logs without calling the protected log API', async () => {
    const { logger, requests } = createLogger('/');

    await logger.info('SYSTEM', 'Page loaded');

    assert.strictEqual(logger.getLogs().length, 1);
    assert.strictEqual(requests.length, 0);
});

test('admin surface retains the existing server-log path', async () => {
    const { logger, requests } = createLogger('/admin/');

    await logger.info('ADMIN', 'Admin loaded');
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0][0], 'http://localhost/api/logs');
});
