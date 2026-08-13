const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../public/js/noise-meter.js'),
    'utf8'
);

function createClassList() {
    const values = new Set();
    return {
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        toggle: (name, force) => {
            const shouldAdd = force === undefined ? !values.has(name) : force;
            if (shouldAdd) values.add(name);
            else values.delete(name);
            return shouldAdd;
        },
        contains: name => values.has(name),
        values: () => [...values]
    };
}

function createElement() {
    const children = [];
    const attributes = {};
    const style = {
        setProperty(name, value) {
            this[name] = value;
        }
    };
    return {
        appendCalls: 0,
        children,
        attributes,
        className: '',
        classList: createClassList(),
        dataset: {},
        disabled: false,
        hidden: false,
        src: '',
        style,
        textContent: '',
        addEventListener() {},
        appendChild(child) {
            this.appendCalls += 1;
            if (child.isFragment) {
                child.children.forEach(fragmentChild => {
                    fragmentChild.parentElement = this;
                    children.push(fragmentChild);
                });
                child.children.length = 0;
                return child;
            }
            child.parentElement = this;
            children.push(child);
            return child;
        },
        setAttribute(name, value) {
            attributes[name] = String(value);
        },
        getAttribute(name) {
            if (name === 'src') return this.src;
            return attributes[name] ?? null;
        },
        removeAttribute(name) {
            delete attributes[name];
        },
        set innerHTML(value) {
            children.length = 0;
        },
        get innerHTML() {
            return '';
        }
    };
}

function createHarness(options = {}) {
    const card = createElement();
    const levelMeter = createElement();
    const meterBar = createElement();
    const fill = createElement();
    const status = createElement();
    const statusIcon = createElement();
    const statusTitle = createElement();
    const statusSubtitle = createElement();
    const equalizerWrapper = createElement();
    const equalizerContainer = createElement();
    const scaleLabels = ['low', 'medium', 'high'].map(level => {
        const label = createElement();
        label.dataset.level = level;
        return label;
    });
    const scaleLabelsContainer = createElement();
    scaleLabels.forEach(label => scaleLabelsContainer.appendChild(label));
    equalizerContainer.className = 'equalizer-container';

    const elementsById = {
        'noise-meter-card': options.withoutCard ? null : card,
        'noise-level-meter': levelMeter,
        'noise-meter-fill': fill,
        'noise-status-text': status,
        'equalizer-container': equalizerContainer
    };
    const selectorElements = {
        '#noise-status-text .noise-status-icon': statusIcon,
        '#noise-status-text .noise-status-copy strong': statusTitle,
        '#noise-status-text .noise-status-copy small': statusSubtitle,
        '.equalizer-bars': equalizerWrapper,
        '.noise-meter-bar': meterBar
    };
    const logs = { info: [], error: [] };
    const dispatchedEvents = [];

    class TestCustomEvent {
        constructor(type, options = {}) {
            this.type = type;
            this.detail = options.detail;
        }
    }

    class WorkingAudioContext {
        constructor() {
            this.state = 'running';
            this.suspendCalls = 0;
            this.resumeCalls = 0;
        }

        createAnalyser() {
            return {
                fftSize: 1024,
                frequencyBinCount: 512,
                getByteFrequencyData() {},
                getByteTimeDomainData(array) {
                    array.fill(128);
                }
            };
        }

        createMediaStreamSource() {
            return {
                connect() {}
            };
        }

        close() {
            this.state = 'closed';
            return Promise.resolve();
        }

        suspend() {
            this.suspendCalls += 1;
            this.state = 'suspended';
            return Promise.resolve();
        }

        resume() {
            this.resumeCalls += 1;
            this.state = 'running';
            return Promise.resolve();
        }
    }

    let animationFrameCallback = null;
    let animationFrameRequests = 0;
    let cancelledAnimationFrames = 0;
    let reducedMotion = false;
    const mediaDeviceListeners = new Map();
    const documentListeners = new Map();
    const windowListeners = new Map();
    const timeoutCallbacks = new Map();
    let nextTimeoutId = 1;
    let documentHidden = false;
    let performanceNow = 500;
    const sandbox = {
        console: {
            log() {},
            info: (...args) => logs.info.push(args),
            error: (...args) => logs.error.push(args)
        },
        document: {
            get hidden() {
                return documentHidden;
            },
            addEventListener(type, listener) {
                if (!documentListeners.has(type)) documentListeners.set(type, []);
                documentListeners.get(type).push(listener);
            },
            removeEventListener(type, listener) {
                const listeners = documentListeners.get(type) || [];
                documentListeners.set(type, listeners.filter(candidate => candidate !== listener));
            },
            createDocumentFragment() {
                const fragment = createElement();
                fragment.isFragment = true;
                return fragment;
            },
            createElement,
            getElementById: id => elementsById[id] || null,
            querySelector: selector => selectorElements[selector] || null,
            querySelectorAll: selector => selector === '.noise-scale-label' ? scaleLabels : []
        },
        navigator: {
            mediaDevices: {
                addEventListener(type, listener) {
                    if (!mediaDeviceListeners.has(type)) mediaDeviceListeners.set(type, []);
                    mediaDeviceListeners.get(type).push(listener);
                },
                removeEventListener(type, listener) {
                    const listeners = mediaDeviceListeners.get(type) || [];
                    mediaDeviceListeners.set(type, listeners.filter(candidate => candidate !== listener));
                },
                getUserMedia: async () => ({
                    getTracks: () => [{ stop() {} }]
                })
            }
        },
        requestAnimationFrame(callback) {
            animationFrameRequests += 1;
            animationFrameCallback = callback;
            return animationFrameRequests;
        },
        cancelAnimationFrame() {
            cancelledAnimationFrames += 1;
            animationFrameCallback = null;
        },
        clearTimeout(id) {
            timeoutCallbacks.delete(id);
        },
        setTimeout(callback) {
            const id = nextTimeoutId++;
            timeoutCallbacks.set(id, callback);
            return id;
        },
        performance: {
            now: () => performanceNow
        },
        CustomEvent: TestCustomEvent,
        Uint8Array,
        window: {
            addEventListener(type, listener) {
                if (!windowListeners.has(type)) windowListeners.set(type, []);
                windowListeners.get(type).push(listener);
            },
            removeEventListener(type, listener) {
                const listeners = windowListeners.get(type) || [];
                windowListeners.set(type, listeners.filter(candidate => candidate !== listener));
            },
            matchMedia() {
                return { matches: reducedMotion };
            },
            dispatchEvent(event) {
                dispatchedEvents.push(event);
                return true;
            },
            AudioContext: WorkingAudioContext
        }
    };
    sandbox.window.window = sandbox.window;

    vm.createContext(sandbox);
    vm.runInContext(`${source}\nglobalThis.__NoiseMeter = NoiseMeter;`, sandbox);

    return {
        NoiseMeter: sandbox.__NoiseMeter,
        sandbox,
        logs,
        dispatchedEvents,
        setReducedMotion(value) {
            reducedMotion = Boolean(value);
        },
        async dispatchMediaDeviceChange() {
            const listeners = mediaDeviceListeners.get('devicechange') || [];
            await Promise.all(listeners.map(listener => listener()));
        },
        dispatchDocumentEvent(type) {
            const listeners = documentListeners.get(type) || [];
            listeners.forEach(listener => listener());
        },
        setDocumentHidden(value) {
            documentHidden = Boolean(value);
        },
        setPerformanceNow(value) {
            performanceNow = Number(value);
        },
        get mediaDeviceChangeListenerCount() {
            return (mediaDeviceListeners.get('devicechange') || []).length;
        },
        get visibilityChangeListenerCount() {
            return (documentListeners.get('visibilitychange') || []).length;
        },
        get pageHideListenerCount() {
            return (windowListeners.get('pagehide') || []).length;
        },
        get pendingTimeoutCount() {
            return timeoutCallbacks.size;
        },
        runAnimationFrame(timestamp = 0) {
            const callback = animationFrameCallback;
            animationFrameCallback = null;
            if (callback) callback(timestamp);
        },
        get animationFrameRequests() {
            return animationFrameRequests;
        },
        get cancelledAnimationFrames() {
            return cancelledAnimationFrames;
        },
        elements: {
            card,
            levelMeter,
            meterBar,
            fill,
            scaleLabels,
            scaleLabelsContainer,
            statusIcon,
            statusTitle,
            statusSubtitle,
            equalizerWrapper
        }
    };
}

test('noise meter starts in a neutral, non-interactive preparation state', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    assert.strictEqual(harness.elements.card.dataset.micState, 'idle');
    assert.ok(harness.elements.card.classList.contains('mic-state-idle'));
    assert.strictEqual(harness.elements.statusTitle.textContent, 'Ses Ölçer Hazırlanıyor');
    assert.strictEqual(harness.elements.equalizerWrapper.children.length, 128);
    assert.strictEqual(harness.elements.equalizerWrapper.appendCalls, 1);
    assert.strictEqual(meter.isStarting, false);
    assert.strictEqual(meter.currentLevel, null);
    assert.ok(harness.elements.scaleLabels.every(label => !label.classList.contains('is-active')));
});

test('ambient equalizer keeps the panel alive while real analyser data is unavailable', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    assert.strictEqual(meter.ambientEqualizerActive, true);
    meter.renderAmbientEqualizerFrame(1200);

    const heights = harness.elements.equalizerWrapper.children.map(column =>
        Number.parseFloat(column.children[1].style.height)
    );
    assert.strictEqual(heights.length, 128);
    assert.ok(heights.every(height => Number.isFinite(height) && height >= 4 && height <= 72));
    assert.ok(
        heights.slice(1).every((height, index) => Math.abs(height - heights[index]) <= 24),
        'komşu demo bantları kaotik sıçramamalı'
    );
});

test('ambient animation uses the same monotonic clock as requestAnimationFrame', () => {
    const harness = createHarness();
    harness.setPerformanceNow(500);
    const meter = new harness.NoiseMeter();

    assert.ok(meter.ambientNextShapeRefresh > 500);
    assert.ok(
        meter.ambientNextShapeRefresh < 5500,
        'shape refresh deadline must stay on the RAF/performance timeline instead of epoch milliseconds'
    );
});

test('ambient demo also animates the progress fill without publishing fake meter values', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.renderAmbientEqualizerFrame(1200);
    const firstWidth = Number.parseFloat(harness.elements.fill.style.width);
    meter.renderAmbientEqualizerFrame(2600);
    const secondWidth = Number.parseFloat(harness.elements.fill.style.width);

    assert.ok(firstWidth >= 12 && firstWidth <= 58);
    assert.ok(secondWidth >= 12 && secondWidth <= 58);
    assert.notStrictEqual(secondWidth, firstWidth, 'demo progress should move naturally instead of staying frozen');
    assert.strictEqual(harness.elements.fill.dataset.demo, 'true');
    assert.strictEqual(harness.elements.levelMeter.attributes['aria-valuenow'], '0');
    assert.strictEqual(harness.elements.levelMeter.attributes['aria-hidden'], 'true');
    assert.strictEqual(meter.currentLevel, null);
});

test('ambient equalizer stops as soon as the real microphone analyser becomes active', async () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    assert.strictEqual(meter.ambientEqualizerActive, true);
    await meter.startListening();

    assert.strictEqual(meter.isListening, true);
    assert.strictEqual(meter.ambientEqualizerActive, false);
    assert.notStrictEqual(harness.elements.fill.dataset.demo, 'true');
    assert.strictEqual(harness.elements.levelMeter.attributes['aria-hidden'], undefined);
    assert.ok(harness.cancelledAnimationFrames >= 1);
});

test('prefers-reduced-motion uses a calm static equalizer instead of scheduling demo motion', () => {
    const harness = createHarness();
    harness.setReducedMotion(true);
    const meter = new harness.NoiseMeter();

    meter.stopAmbientEqualizer();
    meter.startAmbientEqualizer();

    assert.strictEqual(meter.ambientEqualizerActive, false);
    const heights = harness.elements.equalizerWrapper.children.map(column =>
        Number.parseFloat(column.children[1].style.height)
    );
    assert.ok(heights.some(height => height > 4));
});

test('progress bar activates only the label for the current threshold range', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.noiseScore = 70;
    meter.updateUI();

    assert.strictEqual(harness.elements.fill.style.width, '70%');
    assert.strictEqual(harness.elements.levelMeter.attributes['aria-valuenow'], '70');
    assert.strictEqual(harness.elements.levelMeter.attributes['aria-valuetext'], 'Dikkat: yüzde 70');
    assert.deepStrictEqual(
        harness.elements.scaleLabels.map(label => label.classList.contains('is-active')),
        [false, true, false]
    );

    meter.noiseScore = 85;
    meter.updateUI();

    assert.deepStrictEqual(
        harness.elements.scaleLabels.map(label => label.classList.contains('is-active')),
        [false, false, true]
    );
});

test('semantic noise changes are broadcast without owning mascot artwork', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.changeState('medium');
    meter.changeState('high');

    assert.strictEqual(meter.currentLevel, 'high');
    const semanticEvents = harness.dispatchedEvents.slice(-2);
    assert.deepStrictEqual(
        semanticEvents.map(event => event.type),
        ['classroom:noise-state', 'classroom:noise-state']
    );
    assert.deepStrictEqual(
        semanticEvents.map(event => event.detail.level),
        ['medium', 'high']
    );
    assert.ok(semanticEvents.every(event => Number.isFinite(event.detail.score)));
});

test('equalizer frequency bands are precomputed and reused between animation frames', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.configureEqualizerBands(512);
    const firstBands = meter.equalizerBands;

    assert.strictEqual(firstBands.length, 128);
    assert.ok(firstBands.every(band => Number.isInteger(band.startBin)));
    assert.ok(firstBands.every(band => Number.isInteger(band.endBin)));
    assert.ok(firstBands.every(band => band.endBin > band.startBin));

    meter.configureEqualizerBands(512);
    assert.strictEqual(meter.equalizerBands, firstBands);

    meter.configureEqualizerBands(1024);
    assert.notStrictEqual(meter.equalizerBands, firstBands);
});

test('equalizer responds to quiet analyser energy without 5-percent stepping and smooths frame changes', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.dataArray = new Uint8Array(512).fill(4);
    meter.updateEqualizerBars();

    const firstHeight = Number.parseFloat(harness.elements.equalizerWrapper.children[0].children[1].style.height);
    assert.ok(firstHeight > 0 && firstHeight < 5, 'quiet energy should remain visible below the old 5% quantization step');

    meter.dataArray.fill(180);
    meter.updateEqualizerBars();
    const secondHeight = Number.parseFloat(harness.elements.equalizerWrapper.children[0].children[1].style.height);
    assert.ok(secondHeight > firstHeight, 'louder analyser energy should raise the bar');
    assert.ok(secondHeight < 90, 'the display should ease toward a loud target instead of jumping in one frame');
});

test('automatic thresholds align the progress markers and label ranges', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    assert.strictEqual(harness.elements.meterBar.style['--warning-threshold'], '70%');
    assert.strictEqual(harness.elements.meterBar.style['--danger-threshold'], '85%');
    assert.strictEqual(
        harness.elements.scaleLabelsContainer.style.gridTemplateColumns,
        '70fr 15fr 15fr'
    );
});

test('ambient calibration learns a robust floor and normalizes relative loudness', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    for (let i = 0; i < meter.calibrationSampleLimit - 20; i++) {
        assert.strictEqual(meter.updateCalibration(-56), false);
    }
    for (let i = 0; i < 20; i++) {
        meter.updateCalibration(-30);
    }

    assert.strictEqual(meter.isCalibrated, true);
    assert.strictEqual(meter.noiseFloorDb, -56);
    assert.strictEqual(meter.calibrationSamples.length, 0);
    assert.strictEqual(meter.normalizeLoudness(-56), 0);
    assert.ok(meter.normalizeLoudness(-26) > 0.99);
});

test('time-domain loudness uses RMS instead of frequency-bin averages', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();
    const silence = new Uint8Array(32).fill(128);
    const loudSignal = Uint8Array.from({ length: 32 }, (_, index) => index % 2 ? 255 : 0);

    assert.strictEqual(meter.calculateDecibels(silence), -100);
    assert.ok(meter.calculateDecibels(loudSignal) > -1);
});

test('level hysteresis prevents flicker around warning and danger boundaries', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    meter.currentLevel = 'medium';
    assert.strictEqual(meter.resolveLevel(68), 'medium');
    assert.strictEqual(meter.resolveLevel(65), 'low');

    meter.currentLevel = 'high';
    assert.strictEqual(meter.resolveLevel(83), 'high');
    assert.strictEqual(meter.resolveLevel(80), 'medium');
});

test('sustained loudness raises the score smoothly without frame-time jumps', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    for (let i = 0; i < 20; i++) meter.updateNoiseScore(1, 0.25);
    assert.ok(meter.noiseScore > meter.dangerThreshold);

    const scoreBeforeJump = meter.noiseScore;
    meter.updateNoiseScore(0, 30);
    assert.ok(meter.noiseScore < scoreBeforeJump);
    assert.ok(meter.noiseScore > 80, 'uzun sekme duraklaması tek karede skoru sıfırlamamalı');
});

test('missing microphone stays in demo mode and reconnects automatically on devicechange', async () => {
    const harness = createHarness();
    let microphoneAvailable = false;
    harness.sandbox.navigator.mediaDevices.getUserMedia = async () => {
        if (!microphoneAvailable) {
            const error = new Error('No microphone');
            error.name = 'NotFoundError';
            throw error;
        }
        return { getTracks: () => [{ stop() {} }] };
    };
    const meter = new harness.NoiseMeter();

    await meter.startListening();

    assert.strictEqual(harness.elements.card.dataset.micState, 'unavailable');
    assert.ok(harness.elements.card.classList.contains('mic-state-unavailable'));
    assert.strictEqual(harness.elements.statusTitle.textContent, 'Ses Ölçer Dinlenmede');
    assert.strictEqual(
        harness.elements.statusSubtitle.textContent,
        'Mikrofon bağlanınca otomatik başlayacak'
    );
    assert.strictEqual(harness.mediaDeviceChangeListenerCount, 1);
    assert.strictEqual(meter.ambientEqualizerActive, true);
    assert.strictEqual(harness.logs.error.length, 0);
    assert.strictEqual(harness.logs.info.length, 1);

    microphoneAvailable = true;
    await harness.dispatchMediaDeviceChange();

    assert.strictEqual(meter.isListening, true);
    assert.strictEqual(harness.elements.card.dataset.micState, 'listening');
    assert.strictEqual(meter.ambientEqualizerActive, false);
});

test('a pending microphone request cannot be started twice', async () => {
    const harness = createHarness();
    let resolveStream;
    let requestCount = 0;
    harness.sandbox.navigator.mediaDevices.getUserMedia = () => {
        requestCount += 1;
        return new Promise(resolve => {
            resolveStream = resolve;
        });
    };
    const meter = new harness.NoiseMeter();

    const firstRequest = meter.startListening();
    const secondRequest = meter.startListening();
    assert.strictEqual(requestCount, 1);

    resolveStream({ getTracks: () => [{ stop() {} }] });
    await Promise.all([firstRequest, secondRequest]);

    assert.strictEqual(meter.isListening, true);
    assert.strictEqual(meter.isStarting, false);
    assert.strictEqual(harness.elements.card.dataset.micState, 'listening');
});

test('a stream is released when audio setup fails after permission succeeds', async () => {
    const harness = createHarness();
    let stopped = false;
    harness.sandbox.navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => { stopped = true; } }]
    });
    harness.sandbox.window.AudioContext = class {
        constructor() {
            throw new Error('Audio setup failed');
        }
    };
    const meter = new harness.NoiseMeter();

    await meter.startListening();

    assert.strictEqual(stopped, true);
    assert.strictEqual(meter.isListening, false);
    assert.strictEqual(meter.isStarting, false);
    assert.strictEqual(harness.elements.card.dataset.micState, 'unavailable');
    assert.strictEqual(harness.logs.error.length, 1);
});

test('an externally ended microphone track releases the analyser and returns to demo mode', async () => {
    const harness = createHarness();
    const listeners = new Map();
    const track = {
        readyState: 'live',
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        removeEventListener(type, listener) {
            if (listeners.get(type) === listener) listeners.delete(type);
        },
        stop() {
            this.readyState = 'ended';
        }
    };
    harness.sandbox.navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [track],
        getAudioTracks: () => [track]
    });
    const meter = new harness.NoiseMeter();

    await meter.startListening();
    assert.strictEqual(meter.isListening, true);
    assert.strictEqual(typeof listeners.get('ended'), 'function');

    track.readyState = 'ended';
    listeners.get('ended')();

    assert.strictEqual(meter.isListening, false);
    assert.strictEqual(meter.analyser, null);
    assert.strictEqual(meter.stream, null);
    assert.strictEqual(meter.ambientEqualizerActive, true);
    assert.strictEqual(harness.elements.card.dataset.micState, 'unavailable');
    assert.strictEqual(harness.elements.statusTitle.textContent, 'Ses Ölçer Dinlenmede');
});

test('a microphone request that resolves after stopListening cannot reactivate the meter', async () => {
    const harness = createHarness();
    let resolveStream;
    let stopped = false;
    harness.sandbox.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
        resolveStream = resolve;
    });
    const meter = new harness.NoiseMeter();

    const pendingStart = meter.startListening();
    meter.stopListening();
    resolveStream({
        getTracks: () => [{ stop: () => { stopped = true; } }]
    });
    await pendingStart;

    assert.strictEqual(stopped, true, 'stale permission results must release their track immediately');
    assert.strictEqual(meter.isListening, false);
    assert.strictEqual(meter.isStarting, false);
    assert.strictEqual(meter.stream, null);
    assert.strictEqual(meter.analyser, null);
});

test('a microphone request that rejects after destroy cannot revive demo or unavailable state', async () => {
    const harness = createHarness();
    let rejectStream;
    harness.sandbox.navigator.mediaDevices.getUserMedia = () => new Promise((resolve, reject) => {
        rejectStream = reject;
    });
    const meter = new harness.NoiseMeter();

    const pendingStart = meter.startListening();
    meter.destroy();
    const error = new Error('Permission request ended with the page');
    error.name = 'AbortError';
    rejectStream(error);
    await pendingStart;

    assert.strictEqual(meter.isDestroyed, true);
    assert.strictEqual(meter.isListening, false);
    assert.strictEqual(meter.ambientEqualizerActive, false);
    assert.strictEqual(meter.ambientAnimationFrameId, null);
    assert.strictEqual(harness.logs.info.length, 0);
    assert.strictEqual(harness.logs.error.length, 0);
});

test('missing noise meter DOM does not install microphone listeners, timers, or equalizer work', () => {
    const harness = createHarness({ withoutCard: true });
    const meter = new harness.NoiseMeter();

    assert.strictEqual(meter.elements.card, null);
    assert.strictEqual(meter.elements.eqBars.length, 0);
    assert.strictEqual(meter.ambientEqualizerActive, false);
    assert.strictEqual(harness.mediaDeviceChangeListenerCount, 0);
    assert.strictEqual(harness.visibilityChangeListenerCount, 0);
    assert.strictEqual(harness.pageHideListenerCount, 0);
    assert.strictEqual(harness.pendingTimeoutCount, 0);
});

test('destroy releases active audio and removes global lifecycle listeners and startup timers', async () => {
    const harness = createHarness();
    let trackStopped = false;
    harness.sandbox.navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => { trackStopped = true; } }]
    });
    const meter = new harness.NoiseMeter();

    await meter.startListening();
    const audioContext = meter.audioContext;
    assert.strictEqual(harness.mediaDeviceChangeListenerCount, 1);
    assert.strictEqual(harness.pageHideListenerCount, 1);
    assert.ok(harness.pendingTimeoutCount >= 1);
    assert.strictEqual(typeof meter.destroy, 'function');

    meter.destroy();

    assert.strictEqual(trackStopped, true);
    assert.strictEqual(audioContext.state, 'closed');
    assert.strictEqual(meter.isListening, false);
    assert.strictEqual(meter.stream, null);
    assert.strictEqual(meter.analyser, null);
    assert.strictEqual(harness.mediaDeviceChangeListenerCount, 0);
    assert.strictEqual(harness.pageHideListenerCount, 0);
    assert.strictEqual(harness.pendingTimeoutCount, 0);
});

test('background visibility suspends live analysis and resumes one visual loop when visible again', async () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    await meter.startListening();
    const audioContext = meter.audioContext;
    assert.strictEqual(harness.visibilityChangeListenerCount, 1);
    assert.notStrictEqual(meter.animationFrameId, null);

    harness.setDocumentHidden(true);
    harness.dispatchDocumentEvent('visibilitychange');
    await Promise.resolve();

    assert.strictEqual(audioContext.suspendCalls, 1);
    assert.strictEqual(meter.animationFrameId, null);

    harness.setDocumentHidden(false);
    harness.dispatchDocumentEvent('visibilitychange');
    await Promise.resolve();

    assert.strictEqual(audioContext.resumeCalls, 1);
    assert.notStrictEqual(meter.animationFrameId, null);

    meter.destroy();
    assert.strictEqual(harness.visibilityChangeListenerCount, 0);
});

test('background demo becomes static instead of leaving RAF or restart timers running', () => {
    const harness = createHarness();
    const meter = new harness.NoiseMeter();

    assert.strictEqual(meter.ambientEqualizerActive, true);
    harness.setDocumentHidden(true);
    harness.dispatchDocumentEvent('visibilitychange');

    assert.strictEqual(meter.ambientEqualizerActive, false);
    assert.strictEqual(meter.ambientAnimationFrameId, null);
    assert.strictEqual(meter.ambientRestartTimerId, null);
    assert.strictEqual(harness.elements.fill.dataset.demo, 'true');
    assert.strictEqual(harness.elements.fill.style.width, '28%');

    harness.setDocumentHidden(false);
    harness.dispatchDocumentEvent('visibilitychange');
    assert.strictEqual(meter.ambientEqualizerActive, true);
});
