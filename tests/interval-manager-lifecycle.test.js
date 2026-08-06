const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../public/js/interval-manager.js'),
    'utf8'
);

test('completed timeouts remove themselves from the manager', () => {
    const scheduledTimeouts = new Map();
    let nextId = 1;
    const sandbox = {
        clearInterval() {},
        clearTimeout(id) { scheduledTimeouts.delete(id); },
        logger: undefined,
        module: { exports: {} },
        setInterval: () => nextId++,
        setTimeout(callback) {
            const id = nextId++;
            scheduledTimeouts.set(id, callback);
            return id;
        },
        window: { addEventListener() {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);

    const { IntervalManager } = sandbox.module.exports;
    const manager = new IntervalManager();
    let callbackCount = 0;
    const timeoutId = manager.setTimeout(() => { callbackCount += 1; }, 100);

    assert.equal(manager.getStats().timeouts, 1);
    scheduledTimeouts.get(timeoutId)();
    assert.equal(callbackCount, 1);
    assert.equal(manager.getStats().timeouts, 0);
});
