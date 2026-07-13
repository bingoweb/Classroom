const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require('../public/js/config.js');
const { APIService } = require('../public/js/api-service.js');

test('1. config.js exports a same-origin-compatible API base', () => {
    assert.ok(typeof CONFIG.API_URL === 'string');
});

test('2. The exported API base does not contain localhost', () => {
    assert.strictEqual(CONFIG.API_URL.includes('localhost'), false);
});

test('3. The exported API base does not contain 127.0.0.1', () => {
    assert.strictEqual(CONFIG.API_URL.includes('127.0.0.1'), false);
});

test('4. APIService joins the base and endpoint correctly', async () => {
    // Override fetch globally for test
    const originalFetch = global.fetch;
    let fetchedUrl = '';
    global.fetch = async (url) => {
        fetchedUrl = url;
        return {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({})
        };
    };

    const api = new APIService(CONFIG.API_URL);
    await api.get('/students');
    assert.strictEqual(fetchedUrl, '/api/students');

    await api.get('/settings');
    assert.strictEqual(fetchedUrl, '/api/settings');

    global.fetch = originalFetch;
});

test('5. Node.js import works when window is unavailable', () => {
    assert.ok(CONFIG);
    assert.ok(APIService);
    const api = new APIService();
    assert.ok(api);
});

test('6. Representative endpoints resolve correctly', async () => {
    const originalFetch = global.fetch;
    const resolvedUrls = [];
    global.fetch = async (url) => {
        resolvedUrls.push(url);
        return {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({})
        };
    };

    const api = new APIService(CONFIG.API_URL);
    await api.get('/students');
    await api.get('/settings');
    await api.get('/slides/active');
    await api.get('/schedule/normalized');

    assert.deepEqual(resolvedUrls, [
        '/api/students',
        '/api/settings',
        '/api/slides/active',
        '/api/schedule/normalized'
    ]);

    global.fetch = originalFetch;
});
