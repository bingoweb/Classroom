const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '../public/js/script.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

function createVmHarness() {
    const logs = [];
    const scheduledTimeouts = [];
    let nextTimeoutId = 1;
    const appliedTransitions = [];
    const querySelectorCalls = [];

    function createTrackedClassList(initialClasses = []) {
        const classes = new Set(initialClasses);

        return {
            add(...names) {
                names.forEach(name => classes.add(name));
            },
            remove(...names) {
                names.forEach(name => classes.delete(name));
            },
            contains(name) {
                return classes.has(name);
            },
            values() {
                return [...classes];
            }
        };
    }

    function createMockElement(id, initialClasses = []) {
        return {
            id,
            classList: createTrackedClassList(initialClasses),
            querySelector: () => null,
            querySelectorAll: () => [],
            style: {}
        };
    }

    let mockElements = {};

    const documentMock = {
        addEventListener: (event, cb) => {},
        querySelector: (selector) => {
            querySelectorCalls.push(selector);
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
            const idx = scheduledTimeouts.findIndex(t => t.id === id);
            if (idx !== -1) {
                scheduledTimeouts.splice(idx, 1);
            }
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
        SLIDESHOW: 'SLIDESHOW',
        TRANSITIONS: 'TRANSITIONS',
        MEDIA: 'MEDIA'
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
    getSlideMediaLayoutMode,

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
        createMockElement,
        getQuerySelectorCalls: () => querySelectorCalls,
        clearQuerySelectorCalls: () => { querySelectorCalls.length = 0; }
    };
}

test('Slideshow Transition Lock', async (t) => {
    await t.test('Source scope guards', () => {
        assert.ok(scriptSource.includes('function nextSlide()'), 'function nextSlide() still exists');
        assert.ok(scriptSource.includes('function scheduleNextSlide()'), 'function scheduleNextSlide() still exists');
        assert.ok(scriptSource.includes('Skipping nextSlide: transition already in progress'), 'concurrent guard message still exists');

        const regex = /\/\/\s*Clear transition flag after transition completes\s*isTransitioning\s*=\s*false;\s*\/\/\s*Schedule next slide\s*scheduleNextSlide\(\);/m;
        assert.match(scriptSource, regex, 'normal success sequence remains');

        assert.ok(!scriptSource.includes('module.exports'), 'no module.exports was added');
        assert.ok(!scriptSource.includes('__slideshowTestApi'), 'no production __slideshowTestApi symbol was added');
    });

    await t.test('Explicit function exposure', () => {
        const harness = createVmHarness();
        assert.strictEqual(typeof harness.api.nextSlide, 'function', 'nextSlide is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.scheduleNextSlide, 'function', 'scheduleNextSlide is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.getSlideMediaLayoutMode, 'function', 'slide media layout helper is explicitly exposed as a function');
    });

    await t.test('Uploaded image layout adapts to the card aspect ratio', () => {
        const { api } = createVmHarness();

        assert.strictEqual(api.getSlideMediaLayoutMode(3840, 2160, 2025, 1350), 'cover', '16:9 images fill the frame');
        assert.strictEqual(api.getSlideMediaLayoutMode(1600, 1200, 2025, 1350), 'cover', '4:3 images fill the frame');
        assert.strictEqual(api.getSlideMediaLayoutMode(1200, 1200, 2025, 1350), 'contain', 'square images keep their full composition');
        assert.strictEqual(api.getSlideMediaLayoutMode(1080, 1920, 2025, 1350), 'contain', 'portrait images keep their full composition');
        assert.strictEqual(api.getSlideMediaLayoutMode(0, 0, 2025, 1350), 'contain', 'invalid dimensions use the lossless fallback');
    });

    await t.test('A. Initial concurrent-transition guard remains locked', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions, getQuerySelectorCalls } = harness;
        
        api.setSlidesData([{ id: 1 }]);
        harness.setMockElements({ 1: harness.createMockElement(1) });
        api.setIsTransitioning(true);
        api.setCurrentSlideIndex(0);

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(getQuerySelectorCalls().length, 0, 'document-level querySelector() call count is exactly zero');
        assert.strictEqual(scheduledTimeouts.length, 0, 'no timeout is captured');
        assert.strictEqual(state.isTransitioning, true, 'the lock remains true');
        assert.strictEqual(state.currentSlideIndex, 0);
        assert.strictEqual(appliedTransitions.length, 0, 'no transition is applied');
        
        const debugLog = logs.find(l => l.msg === 'Skipping nextSlide: transition already in progress');
        assert.ok(debugLog, 'logger receives the existing debug message');
    });

    await t.test('B. Empty slide data remains an unlocked no-op', () => {
        const harness = createVmHarness();
        const { api, logs, scheduledTimeouts, appliedTransitions, getQuerySelectorCalls } = harness;

        api.setSlidesData([]);
        api.setIsTransitioning(false);
        api.setCurrentSlideIndex(0);

        api.nextSlide();

        const state = api.getState();
        assert.strictEqual(getQuerySelectorCalls().length, 0, 'document-level querySelector() call count is exactly zero');
        assert.strictEqual(scheduledTimeouts.length, 0, 'no timeout is captured');
        assert.strictEqual(state.isTransitioning, false, 'the lock remains false');
        assert.strictEqual(appliedTransitions.length, 0, 'no transition is applied');

        const warnLog = logs.find(l => l.msg === 'Cannot advance: no slides');
        assert.ok(warnLog, 'the exact warning message is preserved');
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

        const currentElement = harness.createMockElement(1, ['slide', 'active']);
        const nextElement = harness.createMockElement(2, ['slide']);

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 800 },
            { id: 2, display_duration: 2200, transition_duration: 900 }
        ]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);
        harness.setMockElements({ 1: currentElement, 2: nextElement });

        assert.strictEqual(currentElement.classList.contains('active'), true);
        assert.strictEqual(nextElement.classList.contains('active'), false);

        api.nextSlide();

        let state = api.getState();
        assert.strictEqual(state.isTransitioning, true, 'isTransitioning is true before callback');
        assert.strictEqual(state.currentSlideIndex, 0, 'currentSlideIndex is still 0 before callback');
        assert.strictEqual(currentElement.classList.contains('active'), true, 'current element still has active');
        assert.strictEqual(nextElement.classList.contains('active'), false, 'next element still does not have active');
        assert.strictEqual(appliedTransitions.length, 0, 'applyTransition has not yet been called');

        const transitionTimeout = scheduledTimeouts.find(t => t.delay === 400);
        assert.ok(transitionTimeout, 'exactly one transition-start timeout with delay 400 exists');

        // Execute only the captured 400ms callback
        scheduledTimeouts.length = 0; // Clear to only track the new ones
        transitionTimeout.cb();

        assert.strictEqual(appliedTransitions.length, 1, 'applyTransition is called exactly once');
        assert.strictEqual(appliedTransitions[0].currEl, currentElement, 'the first argument is exactly currentElement');
        assert.strictEqual(appliedTransitions[0].nextEl, nextElement, 'the second argument is exactly nextElement');
        assert.strictEqual(appliedTransitions[0].type, 'fade', 'transition type is exactly the controlled expected type');
        assert.strictEqual(appliedTransitions[0].duration, 800, 'transition duration is exactly the configured slide transition duration');
        
        assert.strictEqual(currentElement.classList.contains('active'), false, 'currentElement loses active');
        assert.strictEqual(nextElement.classList.contains('active'), true, 'nextElement gains active');

        state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 1, 'currentSlideIndex becomes 1');
        assert.strictEqual(state.isTransitioning, false, 'isTransitioning becomes false');
        
        const nextSlideTimeout = scheduledTimeouts.find(t => t.delay === 2200);
        assert.ok(nextSlideTimeout, 'a future slideshow timeout is captured using the second slide’s display_duration');
    });
});
