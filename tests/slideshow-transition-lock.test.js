const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '../public/js/script.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

function createVmHarness() {
    const logs = [];
    let scheduledTimeouts = [];
    let nextTimeoutId = 1;
    let appliedTransitions = [];

    const mockClassList = {
        add: () => {},
        remove: () => {}
    };

    function createMockElement(id) {
        return {
            id,
            classList: mockClassList,
            querySelector: () => null,
            querySelectorAll: () => [],
            style: {}
        };
    }

    let mockElements = {};

    const documentMock = {
        addEventListener: (event, cb) => {},
        querySelector: (selector) => {
            const match = selector.match(/data-slide-id="([^"]+)"/);
            if (match && mockElements[match[1]]) {
                return mockElements[match[1]];
            }
            return null;
        }
    };

    const windowMock = {
        addEventListener: () => {}
    };

    const intervalManagerMock = {
        setInterval: (cb, delay) => 'interval-id-123',
        setTimeout: (cb, delay) => {
            const id = nextTimeoutId++;
            scheduledTimeouts.push({ id, cb, delay });
            return id;
        },
        clearInterval: () => {},
        clearTimeout: (id) => {
            scheduledTimeouts = scheduledTimeouts.filter(t => t.id !== id);
        }
    };

    const CONFIG_MOCK = {
        DEFAULT_SLIDE_DURATION: 5000,
        DEFAULT_TRANSITION_DURATION: 500,
        DEFAULT_TRANSITION_TYPE: 'fade'
    };

    const loggerMock = {
        debug: (comp, msg, err, ctx) => logs.push({ level: 'debug', comp, msg, ctx }),
        info: (comp, msg, err, ctx) => logs.push({ level: 'info', comp, msg, ctx }),
        warn: (comp, msg, err, ctx) => logs.push({ level: 'warn', comp, msg, ctx }),
        error: (comp, msg, err, ctx) => logs.push({ level: 'error', comp, msg, ctx })
    };

    const COMPONENTS_MOCK = {
        SLIDESHOW: 'SLIDESHOW'
    };

    const UtilsMock = {
        safeExecute: (fn) => {
            try { fn(); } catch(e) {}
        }
    };

    const sandbox = {
        window: windowMock,
        document: documentMock,
        navigator: {},
        console: { log: () => {}, error: () => {} },
        performance: { now: () => Date.now() },
        requestAnimationFrame: (cb) => { cb(); },
        fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
        CONFIG: CONFIG_MOCK,
        logger: loggerMock,
        COMPONENTS: COMPONENTS_MOCK,
        Utils: UtilsMock,
        intervalManager: intervalManagerMock,
        getSmartTransition: (curr, next) => 'fade',
        applyTransition: (currEl, nextEl, type, duration) => {
            appliedTransitions.push({ currEl, nextEl, type, duration });
        }
    };

    vm.createContext(sandbox);

    const instrumentation = `
globalThis.__slideshowTestApi = {
    nextSlide,
    scheduleNextSlide,

    setSlidesData(value) {
        slidesData = value;
    },

    setCurrentSlideIndex(value) {
        currentSlideIndex = value;
    },

    setIsTransitioning(value) {
        isTransitioning = value;
    },

    getState() {
        return {
            slidesData,
            currentSlideIndex,
            isTransitioning,
            slideshowInterval
        };
    }
};
`;

    vm.runInContext(scriptSource + instrumentation, sandbox);

    return {
        api: sandbox.__slideshowTestApi,
        logs,
        scheduledTimeouts,
        appliedTransitions,
        setMockElements: (elements) => { mockElements = elements; },
        createMockElement
    };
}

test('Slideshow Transition Lock', async (t) => {
    await t.test('Source scope guards', () => {
        assert.ok(scriptSource.includes('function nextSlide()'), 'function nextSlide() still exists');
        assert.ok(scriptSource.includes('function scheduleNextSlide()'), 'function scheduleNextSlide() still exists');
        assert.ok(scriptSource.includes('Skipping nextSlide: transition already in progress'), 'concurrent guard message still exists');
        assert.ok(scriptSource.includes('isTransitioning = false;'), 'the normal success-path statement that clears transition flag still exists');
        assert.ok(!scriptSource.includes('module.exports'), 'no module.exports was added');
        assert.ok(!scriptSource.includes('__slideshowTestApi'), 'no production __slideshowTestApi symbol was added');
    });

    await t.test('A. Initial concurrent-transition guard remains locked', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions } = harness;
        
        api.setSlidesData([{ id: 1 }]);
        harness.setMockElements({ 1: harness.createMockElement(1) });
        api.setIsTransitioning(true);
        api.setCurrentSlideIndex(0);

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(scheduledTimeouts.length, 0);
        assert.strictEqual(state.isTransitioning, true);
        assert.strictEqual(state.currentSlideIndex, 0);
        assert.strictEqual(appliedTransitions.length, 0);
        
        const debugLog = logs.find(l => l.msg === 'Skipping nextSlide: transition already in progress');
        assert.ok(debugLog, 'logger receives the existing debug message');
    });

    await t.test('B. Empty slide data remains an unlocked no-op', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions } = harness;

        api.setSlidesData([]);
        api.setIsTransitioning(false);
        api.setCurrentSlideIndex(0);

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(scheduledTimeouts.length, 0);
        assert.strictEqual(state.isTransitioning, false);
        assert.strictEqual(appliedTransitions.length, 0);

        const warnLog = logs.find(l => l.msg === 'Cannot advance: no slides');
        assert.ok(warnLog, 'the existing warning message is preserved');
    });

    await t.test('C. Invalid current slide releases the lock and permits recovery', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts } = harness;

        api.setSlidesData([null]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);

        api.nextSlide();

        let state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 0);
        assert.strictEqual(state.isTransitioning, false);

        const errLog = logs.find(l => l.msg === 'Invalid current slide');
        assert.ok(errLog, 'exact existing Invalid current slide error log is emitted');
        assert.strictEqual(errLog.ctx.currentIndex, 0);
        assert.strictEqual(errLog.ctx.slidesDataLength, 1);

        // Recovery phase
        api.setSlidesData([{ id: 1, display_duration: 1200 }, { id: 2, display_duration: 1500 }]);
        harness.setMockElements({
            1: harness.createMockElement(1),
            2: harness.createMockElement(2)
        });

        // Clear timeouts to track strictly
        scheduledTimeouts.length = 0;

        api.nextSlide();

        state = api.getState();
        const newDebugLog = logs.filter(l => l.msg === 'Skipping nextSlide: transition already in progress').length;
        assert.strictEqual(newDebugLog, 0, 'the second call is not rejected');
        assert.strictEqual(scheduledTimeouts.length, 1, 'the normal timeout is scheduled');
        assert.strictEqual(state.isTransitioning, true, 'isTransitioning becomes true while legitimate transition is pending');
    });

    await t.test('D. Invalid next slide releases the lock and reschedules', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions } = harness;

        api.setSlidesData([
            { id: 1, display_duration: 1500, transition_duration: 1000 },
            null
        ]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);
        harness.setMockElements({ 1: harness.createMockElement(1) });

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 0);
        assert.strictEqual(state.isTransitioning, false);

        const errLog = logs.find(l => l.msg === 'Invalid next slide');
        assert.ok(errLog, 'exact existing Invalid next slide error log is emitted');

        assert.strictEqual(scheduledTimeouts.length, 1, 'exactly one new slideshow timeout is captured');
        assert.strictEqual(scheduledTimeouts[0].delay, 1500, 'uses the current slide existing duration of 1500');
        assert.strictEqual(appliedTransitions.length, 0, 'no transition effect is applied');
    });

    await t.test('E. Missing current DOM element releases the lock', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions } = harness;

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 800 },
            { id: 2, display_duration: 2200, transition_duration: 900 }
        ]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);

        // Missing current, present next
        harness.setMockElements({ 2: harness.createMockElement(2) });

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 1);
        assert.strictEqual(state.isTransitioning, false);

        const errLog = logs.find(l => l.msg === 'Slide element not found');
        assert.ok(errLog);
        assert.strictEqual(errLog.ctx.currentSlideId, 1);
        assert.strictEqual(errLog.ctx.nextSlideId, 2);
        assert.strictEqual(errLog.ctx.currentIndex, 0);
        assert.strictEqual(errLog.ctx.nextIndex, 1);
        assert.strictEqual(errLog.ctx.currentElementFound, false);
        assert.strictEqual(errLog.ctx.nextElementFound, true);

        assert.strictEqual(scheduledTimeouts.length, 1);
        assert.strictEqual(scheduledTimeouts[0].delay, 2200, 'recovery timeout uses new current slide duration of 2200');
        assert.strictEqual(appliedTransitions.length, 0);
    });

    await t.test('F. Missing next DOM element releases the lock', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions } = harness;

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 800 },
            { id: 2, display_duration: 2200, transition_duration: 900 }
        ]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);

        // Present current, missing next
        harness.setMockElements({ 1: harness.createMockElement(1) });

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 1);
        assert.strictEqual(state.isTransitioning, false);

        const errLog = logs.find(l => l.msg === 'Slide element not found');
        assert.ok(errLog);
        assert.strictEqual(errLog.ctx.currentElementFound, true);
        assert.strictEqual(errLog.ctx.nextElementFound, false);

        assert.strictEqual(scheduledTimeouts.length, 1);
        assert.strictEqual(scheduledTimeouts[0].delay, 2200);
        assert.strictEqual(appliedTransitions.length, 0);
    });

    await t.test('G. Healthy transition lifecycle remains unchanged', () => {
        const harness = createVmHarness();
        const { api, scheduledTimeouts, appliedTransitions } = harness;

        let currentActiveRemoved = false;
        let nextActiveAdded = false;

        const currentEl = harness.createMockElement(1);
        currentEl.classList = {
            add: () => {},
            remove: (cls) => { if(cls === 'active') currentActiveRemoved = true; }
        };

        const nextEl = harness.createMockElement(2);
        nextEl.classList = {
            add: (cls) => { if(cls === 'active') nextActiveAdded = true; },
            remove: () => {}
        };

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 800 },
            { id: 2, display_duration: 2200, transition_duration: 900 }
        ]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);
        harness.setMockElements({ 1: currentEl, 2: nextEl });

        api.nextSlide();

        let state = api.getState();
        assert.strictEqual(state.isTransitioning, true, 'isTransitioning is true before callback');
        assert.strictEqual(state.currentSlideIndex, 0, 'currentSlideIndex is still 0 before callback');
        assert.strictEqual(scheduledTimeouts.length, 1, 'exactly one timeout exists');
        assert.strictEqual(appliedTransitions.length, 0, 'applyTransition has not yet been called');

        // Execute the captured timeout
        const timeoutCb = scheduledTimeouts[0].cb;
        scheduledTimeouts.length = 0; // clear to see what scheduleNextSlide does
        timeoutCb();

        assert.strictEqual(appliedTransitions.length, 1, 'applyTransition is called exactly once');
        assert.strictEqual(appliedTransitions[0].currEl.id, 1, 'receives current fake slide element');
        assert.strictEqual(appliedTransitions[0].nextEl.id, 2, 'receives next fake slide element');
        assert.strictEqual(appliedTransitions[0].type, 'fade', 'transition type is preserved');
        assert.strictEqual(appliedTransitions[0].duration, 800, 'transition duration is preserved');
        
        assert.strictEqual(currentActiveRemoved, true, 'the current slide loses active');
        assert.strictEqual(nextActiveAdded, true, 'the next slide gains active');

        state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 1, 'currentSlideIndex becomes 1');
        assert.strictEqual(state.isTransitioning, false, 'isTransitioning becomes false');
        
        const nextSlideTimeout = scheduledTimeouts.find(t => t.delay === 2200);
        assert.ok(nextSlideTimeout, 'scheduleNextSlide captures a future timeout using the second slide duration');
    });
});
