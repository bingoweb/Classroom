const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '../public/js/script.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
const styleSource = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
const mediaAnalyzer = require('../public/js/media-analyzer.js');
const transitionEngine = require('../public/js/transitions.js');

function createVmHarness() {
    const logs = [];
    const scheduledTimeouts = [];
    let nextTimeoutId = 1;
    const appliedTransitions = [];
    const querySelectorCalls = [];
    let reducedMotion = false;

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
            dataset: {},
            classList: createTrackedClassList(initialClasses),
            querySelector: () => null,
            querySelectorAll: () => [],
            style: {}
        };
    }

    function createDomElement() {
        const attributes = {};
        const children = [];

        return {
            className: '',
            classList: createTrackedClassList(),
            textContent: '',
            attributes,
            children,
            dataset: {},
            style: {},
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
            appendChild(child) {
                child.parentElement = this;
                children.push(child);
                return child;
            },
            setAttribute(name, value) {
                attributes[name] = value;
            }
        };
    }

    let mockElements = {};
    let fetchedSlides = [];
    const slideshowContainer = createDomElement();
    let containerHtml = '';
    Object.defineProperty(slideshowContainer, 'innerHTML', {
        get() {
            return containerHtml;
        },
        set(value) {
            containerHtml = value;
            slideshowContainer.children.length = 0;
        }
    });

    const documentMock = {
        addEventListener: (event, cb) => {},
        createElement: () => createDomElement(),
        getElementById: (id) => id === 'slideshow-container' ? slideshowContainer : null,
        querySelector: (selector) => {
            querySelectorCalls.push(selector);
            const match = selector.match(/data-slide-id="([^"]+)"/);
            if (match && mockElements[match[1]]) {
                return mockElements[match[1]];
            }
            return null;
        },
        querySelectorAll: (selector) => selector === '.slide' ? slideshowContainer.children : []
    };

    const windowMock = {
        addEventListener: () => {},
        matchMedia: () => ({ matches: reducedMotion })
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
        fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(fetchedSlides) }),
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
    createSlideCaptionElement,
    getSlidesSnapshot,
    refreshSlideshow,

    setSlidesData(value) {
        slidesData = value;
    },

    setCurrentSlideIndex(value) {
        currentSlideIndex = value;
    },

    setIsTransitioning(value) {
        isTransitioning = value;
    },

    setSlideshowGeneration(value) {
        slideshowGeneration = value;
    },

    getState() {
        return {
            slidesData,
            currentSlideIndex,
            isTransitioning,
            slideshowInterval,
            slideshowGeneration
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
        setFetchedSlides: (slides) => { fetchedSlides = slides; },
        setReducedMotion: (value) => { reducedMotion = value; },
        createMockElement,
        slideshowContainer,
        getQuerySelectorCalls: () => querySelectorCalls,
        clearQuerySelectorCalls: () => { querySelectorCalls.length = 0; }
    };
}

test('Slideshow Transition Lock', async (t) => {
    await t.test('Source scope guards', () => {
        assert.ok(scriptSource.includes('function nextSlide()'), 'function nextSlide() still exists');
        assert.ok(scriptSource.includes('function scheduleNextSlide()'), 'function scheduleNextSlide() still exists');
        assert.ok(scriptSource.includes('Skipping nextSlide: transition already in progress'), 'concurrent guard message still exists');

        const regex = /currentSlideIndex\s*=\s*nextIndex;\s*isTransitioning\s*=\s*false;\s*scheduleNextSlide\(\);/m;
        assert.match(scriptSource, regex, 'index, lock and timer are finalized together after the effect');

        assert.ok(!scriptSource.includes('module.exports'), 'no module.exports was added');
        assert.ok(!scriptSource.includes('__slideshowTestApi'), 'no production __slideshowTestApi symbol was added');
    });

    await t.test('Explicit function exposure', () => {
        const harness = createVmHarness();
        assert.strictEqual(typeof harness.api.nextSlide, 'function', 'nextSlide is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.scheduleNextSlide, 'function', 'scheduleNextSlide is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.getSlideMediaLayoutMode, 'function', 'slide media layout helper is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.createSlideCaptionElement, 'function', 'slide caption helper is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.getSlidesSnapshot, 'function', 'slide refresh snapshot helper is explicitly exposed as a function');
        assert.strictEqual(typeof harness.api.refreshSlideshow, 'function', 'slide refresh function is explicitly exposed as a function');
    });

    await t.test('Periodic refresh does not restart an unchanged seven-slide rotation', async () => {
        const harness = createVmHarness();
        const slides = Array.from({ length: 7 }, (_, index) => ({
            id: index + 1,
            title: `Slide ${index + 1}`,
            media_type: 'image',
            media_path: `/slide-${index + 1}.webp`,
            text_content: `Message ${index + 1}`,
            display_duration: 12000,
            display_order: index + 1
        }));

        harness.api.setSlidesData(slides);
        harness.setFetchedSlides(slides);
        harness.api.setCurrentSlideIndex(3);
        await harness.api.refreshSlideshow();

        const state = harness.api.getState();
        assert.strictEqual(state.slidesData.length, 7);
        assert.strictEqual(state.currentSlideIndex, 3, 'unchanged refresh preserves the current slide');
        assert.ok(
            harness.logs.some(log => log.msg === 'Slide data unchanged; keeping current rotation'),
            'refresh reports that the existing rotation was preserved'
        );
    });

    await t.test('Automatic and random selection stay professional without adjacent family repetition', () => {
        const slides = Array.from({ length: 7 }, (_, index) => ({
            id: index + 1,
            content_type: 'rule',
            media_type: 'image',
            transition_mode: index % 2 === 0 ? 'random' : 'auto'
        }));
        const approved = new Set(mediaAnalyzer.PROFESSIONAL_TRANSITIONS);

        mediaAnalyzer.resetTransitionHistory();
        const selected = slides.map((slide, index) => (
            mediaAnalyzer.getSmartTransition(slide, slides, index)
        ));

        selected.forEach(transition => {
            assert.ok(approved.has(transition), `${transition} belongs to the curated professional pool`);
        });
        for (let index = 1; index < selected.length; index += 1) {
            assert.notStrictEqual(selected[index], selected[index - 1], 'the exact effect does not repeat');
            assert.notStrictEqual(
                mediaAnalyzer.getTransitionFamily(selected[index]),
                mediaAnalyzer.getTransitionFamily(selected[index - 1]),
                'the same motion family does not repeat'
            );
        }
        assert.strictEqual(
            new Set(selected.map(mediaAnalyzer.getTransitionFamily)).size,
            3,
            'a seven-slide cycle uses all three professional motion families'
        );
    });

    await t.test('Changed slide data rebuilds the rotation and invalidates old callbacks', async () => {
        const harness = createVmHarness();
        const initialSlides = Array.from({ length: 7 }, (_, index) => ({
            id: index + 1,
            title: `Initial ${index + 1}`,
            content_type: 'photo',
            media_type: 'image',
            media_path: `/initial-${index + 1}.webp`,
            text_content: `Initial message ${index + 1}`,
            display_duration: 12000,
            transition_duration: 1000,
            display_order: index + 1
        }));
        const replacementSlides = initialSlides.map((slide, index) => ({
            ...slide,
            title: `Replacement ${index + 1}`,
            text_content: `Replacement message ${index + 1}`
        }));

        harness.api.setSlidesData(initialSlides);
        harness.api.setCurrentSlideIndex(3);
        const oldGeneration = harness.api.getState().slideshowGeneration;
        harness.setFetchedSlides(replacementSlides);

        await harness.api.refreshSlideshow();

        const state = harness.api.getState();
        assert.strictEqual(state.slidesData[0].title, 'Replacement 1');
        assert.strictEqual(state.currentSlideIndex, 0, 'replacement rotation starts from its first slide');
        assert.ok(state.slideshowGeneration > oldGeneration, 'generation advances to invalidate stale callbacks');
        assert.strictEqual(harness.slideshowContainer.children.length, 7, 'all replacement slides are rebuilt');
        assert.ok(
            harness.logs.some(log => log.msg === 'Slideshow refreshed successfully'),
            'successful replacement is observable in logs'
        );
    });

    await t.test('Transition engine composites both slides and releases temporary GPU hints', async () => {
        const container = { style: {} };
        const currentSlide = { style: {}, parentElement: container };
        const nextSlide = { style: {}, parentElement: container };

        const duration = transitionEngine.applyTransition(currentSlide, nextSlide, 'fade', 100);

        assert.strictEqual(duration, 350, 'too-short effects are clamped to a readable duration');
        assert.strictEqual(currentSlide.style.display, 'block');
        assert.strictEqual(nextSlide.style.display, 'block', 'incoming slide is composited before animation starts');
        assert.strictEqual(currentSlide.style.willChange, 'transform, opacity');
        assert.strictEqual(nextSlide.style.willChange, 'transform, opacity');
        assert.strictEqual(currentSlide.style.zIndex, '1');
        assert.strictEqual(nextSlide.style.zIndex, '2', 'incoming composition stays above the outgoing slide');

        await new Promise(resolve => setTimeout(resolve, 470));
        assert.strictEqual(currentSlide.style.willChange, '', 'temporary GPU hint is removed after cleanup');
        assert.strictEqual(nextSlide.style.willChange, '', 'incoming slide GPU hint is removed after cleanup');
        assert.strictEqual(nextSlide.style.zIndex, '', 'temporary stacking order is removed after cleanup');
    });

    await t.test('Optional slide messages render as safe media subtitles', () => {
        const { api } = createVmHarness();

        assert.strictEqual(api.createSlideCaptionElement('   '), null, 'empty messages do not create an overlay');

        const caption = api.createSlideCaptionElement('“Hayatta en hakiki mürşit ilimdir.”\n— Mustafa Kemal Atatürk');
        assert.strictEqual(caption.className, 'slide-text-content');
        assert.strictEqual(caption.attributes.role, 'note');
        assert.strictEqual(caption.attributes['aria-label'], 'Slayt mesajı');
        assert.strictEqual(caption.children.length, 1);
        assert.strictEqual(caption.children[0].className, 'slide-caption-text');
        assert.strictEqual(caption.children[0].textContent, '“Hayatta en hakiki mürşit ilimdir.”\n— Mustafa Kemal Atatürk');

        const unsafeLooking = api.createSlideCaptionElement('<img src=x onerror=alert(1)>');
        assert.strictEqual(unsafeLooking.children[0].textContent, '<img src=x onerror=alert(1)>', 'message stays text-only');

        const longCaption = api.createSlideCaptionElement('a'.repeat(221));
        assert.ok(longCaption.children[0].classList.contains('slide-caption-text--compact'), 'very long captions use the compact TV profile');

        assert.ok(!scriptSource.includes('rainbowColors'), 'caption words no longer use prototype rainbow coloring');
        assert.match(styleSource, /\.slideshow-card > \.card-titlebar\s*\{[^}]*width:\s*100%/s, 'slideshow title spans the same width as the noise title');
        assert.match(styleSource, /\.slideshow-container \.slide-text-content\s*\{[^}]*inset:\s*auto 0 0/s, 'caption is anchored over the bottom of the media');
    });

    await t.test('Uploaded image layout adapts to the card aspect ratio', () => {
        const { api } = createVmHarness();

        assert.strictEqual(api.getSlideMediaLayoutMode(3840, 2160, 2025, 1350), 'cover', '16:9 images fill the frame');
        assert.strictEqual(api.getSlideMediaLayoutMode(3840, 2160, 2025, 1394), 'contain', '16:9 images keep their full composition in the taller live 4K card');
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

    await t.test('G. Healthy transition remains locked until the visual effect completes', () => {
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
        
        assert.strictEqual(currentElement.classList.contains('active'), true, 'currentElement stays active while fading out');
        assert.strictEqual(nextElement.classList.contains('active'), true, 'nextElement gains active');
        assert.strictEqual(nextElement.style.display, 'block', 'incoming slide is visible while the effect runs');
        assert.strictEqual(nextElement.dataset.transitionType, 'fade', 'the chosen effect is observable during QA');

        state = api.getState();
        assert.strictEqual(state.currentSlideIndex, 0, 'index is not committed before the effect completes');
        assert.strictEqual(state.isTransitioning, true, 'transition lock stays active for the full effect');

        const completionTimeout = scheduledTimeouts.find(t => t.delay === 800);
        assert.ok(completionTimeout, 'completion is scheduled for the normalized effect duration');
        scheduledTimeouts.length = 0;
        completionTimeout.cb();

        state = api.getState();
        assert.strictEqual(currentElement.classList.contains('active'), false, 'currentElement loses active after completion');
        assert.strictEqual(nextElement.dataset.transitionType, undefined, 'temporary transition metadata is cleaned up');
        assert.strictEqual(state.currentSlideIndex, 1, 'currentSlideIndex commits after completion');
        assert.strictEqual(state.isTransitioning, false, 'isTransitioning releases after completion');

        const nextSlideTimeout = scheduledTimeouts.find(t => t.delay === 2200);
        assert.ok(nextSlideTimeout, 'a future slideshow timeout is captured using the second slide’s display_duration');
    });

    await t.test('H. Replaced slide data cannot be overwritten by a stale completion callback', () => {
        const harness = createVmHarness();
        const { api, scheduledTimeouts } = harness;
        const currentElement = harness.createMockElement(1, ['slide', 'active']);
        const nextElement = harness.createMockElement(2, ['slide']);

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 800 },
            { id: 2, display_duration: 2200, transition_duration: 900 }
        ]);
        harness.setMockElements({ 1: currentElement, 2: nextElement });

        api.nextSlide();
        const transitionTimeout = scheduledTimeouts.find(timeout => timeout.delay === 400);
        scheduledTimeouts.length = 0;
        transitionTimeout.cb();

        const staleCompletion = scheduledTimeouts.find(timeout => timeout.delay === 800);
        assert.ok(staleCompletion, 'old rotation has a pending completion callback');

        api.setSlidesData([{ id: 101, display_duration: 5000 }]);
        api.setCurrentSlideIndex(0);
        api.setIsTransitioning(false);
        api.setSlideshowGeneration(api.getState().slideshowGeneration + 1);
        scheduledTimeouts.length = 0;
        staleCompletion.cb();

        const state = api.getState();
        assert.strictEqual(state.slidesData[0].id, 101);
        assert.strictEqual(state.currentSlideIndex, 0, 'stale callback cannot commit its old next index');
        assert.strictEqual(state.isTransitioning, false);
        assert.strictEqual(scheduledTimeouts.length, 0, 'stale callback cannot schedule another old-rotation timer');
    });

    await t.test('I. Reduced-motion viewers receive a short fade', () => {
        const harness = createVmHarness();
        const { api, scheduledTimeouts, appliedTransitions } = harness;

        api.setSlidesData([
            { id: 1, display_duration: 1200, transition_duration: 1400 },
            { id: 2, display_duration: 2200, transition_duration: 1400 }
        ]);
        harness.setMockElements({
            1: harness.createMockElement(1, ['slide', 'active']),
            2: harness.createMockElement(2, ['slide'])
        });
        harness.setReducedMotion(true);

        api.nextSlide();
        const transitionTimeout = scheduledTimeouts.find(timeout => timeout.delay === 400);
        scheduledTimeouts.length = 0;
        transitionTimeout.cb();

        assert.strictEqual(appliedTransitions.length, 1);
        assert.strictEqual(appliedTransitions[0].type, 'fade');
        assert.strictEqual(appliedTransitions[0].duration, 500, 'long effects are capped at 500ms');
    });
});
