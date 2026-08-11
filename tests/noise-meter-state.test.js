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
        set innerHTML(value) {
            children.length = 0;
        },
        get innerHTML() {
            return '';
        }
    };
}

function createHarness() {
    const card = createElement();
    const levelMeter = createElement();
    const meterBar = createElement();
    const fill = createElement();
    const status = createElement();
    const statusIcon = createElement();
    const statusTitle = createElement();
    const statusSubtitle = createElement();
    const startButton = createElement();
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
        'noise-meter-card': card,
        'noise-level-meter': levelMeter,
        'noise-meter-fill': fill,
        'noise-status-text': status,
        'mic-start-btn': startButton,
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
            return Promise.resolve();
        }
    }

    const sandbox = {
        console: {
            log() {},
            info: (...args) => logs.info.push(args),
            error: (...args) => logs.error.push(args)
        },
        document: {
            addEventListener() {},
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
                getUserMedia: async () => ({
                    getTracks: () => [{ stop() {} }]
                })
            }
        },
        requestAnimationFrame() {},
        clearTimeout() {},
        setTimeout() {
            return 1;
        },
        CustomEvent: TestCustomEvent,
        Uint8Array,
        window: {
            addEventListener() {},
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
            startButton,
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
    assert.strictEqual(harness.elements.startButton.hidden, true);
    assert.strictEqual(harness.elements.equalizerWrapper.children.length, 128);
    assert.strictEqual(harness.elements.equalizerWrapper.appendCalls, 1);
    assert.strictEqual(meter.isStarting, false);
    assert.strictEqual(meter.currentLevel, null);
    assert.ok(harness.elements.scaleLabels.every(label => !label.classList.contains('is-active')));
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

test('missing microphone becomes a calm retryable state without an error log', async () => {
    const harness = createHarness();
    harness.sandbox.navigator.mediaDevices.getUserMedia = async () => {
        const error = new Error('No microphone');
        error.name = 'NotFoundError';
        throw error;
    };
    const meter = new harness.NoiseMeter();

    await meter.startListening();

    assert.strictEqual(harness.elements.card.dataset.micState, 'unavailable');
    assert.ok(harness.elements.card.classList.contains('mic-state-unavailable'));
    assert.strictEqual(harness.elements.statusTitle.textContent, 'Ses Ölçer Dinlenmede');
    assert.strictEqual(
        harness.elements.statusSubtitle.textContent,
        'Mikrofon bağlanınca yeniden deneyin'
    );
    assert.strictEqual(harness.elements.startButton.hidden, false);
    assert.strictEqual(harness.elements.startButton.textContent, 'Tekrar Dene');
    assert.strictEqual(harness.elements.startButton.disabled, false);
    assert.strictEqual(harness.logs.error.length, 0);
    assert.strictEqual(harness.logs.info.length, 1);
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
    assert.strictEqual(harness.elements.startButton.hidden, true);
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
