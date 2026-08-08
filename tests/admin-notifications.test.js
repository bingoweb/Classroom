const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const utilsPath = require.resolve('../public/js/utils.js');

function createFakeElement(tagName = 'div') {
    return {
        tagName: String(tagName).toUpperCase(),
        className: '',
        textContent: '',
        attributes: {},
        children: [],
        listeners: {},
        parentNode: null,
        setAttribute(name, value) {
            this.attributes[name] = String(value);
        },
        getAttribute(name) {
            return this.attributes[name];
        },
        addEventListener(type, handler) {
            this.listeners[type] = handler;
        },
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        replaceChildren(...children) {
            for (const child of this.children) child.parentNode = null;
            this.children = children;
            for (const child of this.children) child.parentNode = this;
        },
        remove() {
            if (!this.parentNode) return;
            const index = this.parentNode.children.indexOf(this);
            if (index !== -1) this.parentNode.children.splice(index, 1);
            this.parentNode = null;
        },
        click() {
            if (this.listeners.click) this.listeners.click({ currentTarget: this });
        }
    };
}

function loadUtils({ region = createFakeElement('div') } = {}) {
    const originalDocument = global.document;
    const originalLogger = global.logger;
    const originalComponents = global.COMPONENTS;
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;

    let createElementCalls = 0;
    let nextTimerId = 1;
    const timers = new Map();
    const clearedTimers = [];
    const loggerCalls = [];

    global.document = {
        getElementById(id) {
            return id === 'adminNotificationRegion' ? region : null;
        },
        createElement(tagName) {
            createElementCalls++;
            return createFakeElement(tagName);
        }
    };

    global.logger = {
        error(...args) {
            loggerCalls.push(args);
        }
    };
    global.COMPONENTS = { SYSTEM: 'SYSTEM', API: 'API' };

    global.setTimeout = (callback, delay) => {
        const id = nextTimerId++;
        timers.set(id, { callback, delay });
        return id;
    };
    global.clearTimeout = (id) => {
        clearedTimers.push(id);
        timers.delete(id);
    };

    delete require.cache[utilsPath];
    const Utils = require(utilsPath);

    return {
        Utils,
        region,
        timers,
        clearedTimers,
        loggerCalls,
        get createElementCalls() {
            return createElementCalls;
        },
        restore() {
            delete require.cache[utilsPath];
            global.document = originalDocument;
            global.logger = originalLogger;
            global.COMPONENTS = originalComponents;
            global.setTimeout = originalSetTimeout;
            global.clearTimeout = originalClearTimeout;
        }
    };
}

test('Admin notification surface', async (t) => {
    await t.test('admin HTML exposes one accessible live notification region', () => {
        const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
        assert.match(html, /id=["']adminNotificationRegion["']/);
        assert.match(html, /id=["']adminNotificationRegion["'][^>]*aria-live=["']polite["']/);
        assert.match(html, /id=["']adminNotificationRegion["'][^>]*aria-atomic=["']true["']/);
    });

    await t.test('success message becomes visible text without interpreting HTML', () => {
        const harness = loadUtils();
        try {
            harness.Utils.showSuccess('Kaydedildi <img src=x onerror=alert(1)>');

            assert.strictEqual(harness.region.children.length, 1);
            const notice = harness.region.children[0];
            assert.strictEqual(notice.textContent, 'Kaydedildi <img src=x onerror=alert(1)>');
            assert.match(notice.className, /admin-notification--success/);
            assert.strictEqual(notice.getAttribute('role'), 'status');
            assert.strictEqual(harness.timers.size, 1);
        } finally {
            harness.restore();
        }
    });

    await t.test('error message remains logged and also becomes an alert', () => {
        const harness = loadUtils();
        const error = new Error('network failed');
        try {
            harness.Utils.showError('İşlem başarısız.', error);

            assert.strictEqual(harness.loggerCalls.length, 1);
            assert.deepStrictEqual(harness.loggerCalls[0], ['SYSTEM', 'İşlem başarısız.', error]);
            assert.strictEqual(harness.region.children.length, 1);
            const notice = harness.region.children[0];
            assert.strictEqual(notice.textContent, 'İşlem başarısız.');
            assert.match(notice.className, /admin-notification--error/);
            assert.strictEqual(notice.getAttribute('role'), 'alert');
        } finally {
            harness.restore();
        }
    });

    await t.test('a newer notification replaces the old one and clears its timer', () => {
        const harness = loadUtils();
        try {
            harness.Utils.showSuccess('Birinci');
            assert.strictEqual(harness.region.children.length, 1);
            const firstNotice = harness.region.children[0];
            const firstTimerId = [...harness.timers.keys()][0];

            harness.Utils.showSuccess('İkinci');

            assert.strictEqual(harness.region.children.length, 1);
            assert.notStrictEqual(harness.region.children[0], firstNotice);
            assert.strictEqual(harness.region.children[0].textContent, 'İkinci');
            assert.ok(harness.clearedTimers.includes(firstTimerId));
            assert.strictEqual(harness.timers.size, 1);
        } finally {
            harness.restore();
        }
    });

    await t.test('click and timeout both dismiss the current notification safely', () => {
        const harness = loadUtils();
        try {
            harness.Utils.showSuccess('Tıkla kapat');
            const clickNotice = harness.region.children[0];
            clickNotice.click();
            assert.strictEqual(harness.region.children.length, 0);

            harness.Utils.showError('Zaman aşımıyla kapat');
            assert.strictEqual(harness.region.children.length, 1);
            const [{ callback, delay }] = [...harness.timers.values()];
            assert.ok(delay >= 3000 && delay <= 10000);
            callback();
            assert.strictEqual(harness.region.children.length, 0);
        } finally {
            harness.restore();
        }
    });

    await t.test('pages without an admin notification region create no visual UI', () => {
        const harness = loadUtils({ region: null });
        try {
            assert.doesNotThrow(() => harness.Utils.showSuccess('Kiosk görünmez'));
            assert.doesNotThrow(() => harness.Utils.showError('Kiosk hata görünmez'));
            assert.strictEqual(harness.createElementCalls, 0);
            assert.strictEqual(harness.timers.size, 0);
            assert.strictEqual(harness.loggerCalls.length, 1);
        } finally {
            harness.restore();
        }
    });

    await t.test('admin stylesheet contains success and error notification states', () => {
        const css = fs.readFileSync(path.join(__dirname, '../public/admin/style.css'), 'utf8');
        assert.match(css, /\.admin-notification-region\b/);
        assert.match(css, /\.admin-notification--success\b/);
        assert.match(css, /\.admin-notification--error\b/);
    });
});
