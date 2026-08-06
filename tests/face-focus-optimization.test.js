const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../public/js/face-focus.js'),
    'utf8'
);

function loadFaceFocus(createCanvas) {
    const sandbox = {
        console: { warn() {} },
        document: { createElement: createCanvas, querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem() {} },
        setTimeout,
        window: { addEventListener() {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(`${source}\nglobalThis.__FaceFocusEngine = FaceFocusEngine;`, sandbox);
    return sandbox.__FaceFocusEngine;
}

test('face analysis downsamples large photos before reading pixels', async () => {
    let canvas;
    let drawArguments;
    const FaceFocusEngine = loadFaceFocus(tagName => {
        assert.equal(tagName, 'canvas');
        canvas = {
            width: 0,
            height: 0,
            getContext: () => ({
                drawImage: (...args) => { drawArguments = args; },
                getImageData: (x, y, width, height) => ({
                    data: new Uint8ClampedArray(width * height * 4).fill(128)
                })
            })
        };
        return canvas;
    });

    const engine = new FaceFocusEngine();
    const result = await engine.detectFaceWithCanvas({ naturalWidth: 2816, naturalHeight: 1536 });

    assert.ok(canvas.width <= 320);
    assert.ok(canvas.height <= 320);
    assert.equal(Math.max(canvas.width, canvas.height), 320);
    assert.equal(drawArguments[3], canvas.width);
    assert.equal(drawArguments[4], canvas.height);
    assert.ok(result && Number.isFinite(result.x) && Number.isFinite(result.y));
});

test('the same photo shares one pending face detection across role cards', async () => {
    const FaceFocusEngine = loadFaceFocus(() => ({ getContext: () => null }));
    const engine = new FaceFocusEngine();
    let detectionCalls = 0;
    let finishDetection;
    engine.detectFaceWithCanvas = () => {
        detectionCalls += 1;
        return new Promise(resolve => { finishDetection = resolve; });
    };

    const createImage = () => ({
        style: {},
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
    });
    const firstImage = createImage();
    const secondImage = createImage();

    const first = engine.advancedDetection({
        imgElement: firstImage,
        imageSrc: '/uploads/student.jpg',
        containerSize: 'duty'
    });
    const second = engine.advancedDetection({
        imgElement: secondImage,
        imageSrc: '/uploads/student.jpg',
        containerSize: 'star'
    });

    assert.equal(detectionCalls, 1);
    finishDetection({ x: 50, y: 32 });
    await Promise.all([first, second]);

    assert.deepEqual(engine.faceCache.get('/uploads/student.jpg'), { x: 50, y: 32 });
    assert.equal(firstImage.attributes['data-face-focused'], 'true');
    assert.equal(secondImage.attributes['data-face-focused'], 'true');
});

test('a later role card reuses the cached face position without re-entering the canvas queue', async () => {
    const FaceFocusEngine = loadFaceFocus(() => ({ getContext: () => null }));
    const engine = new FaceFocusEngine();
    const image = {
        style: {},
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
    };

    engine.faceCache.set('/uploads/student.jpg', { x: 52, y: 31 });
    engine.detectFaceWithCanvas = () => {
        throw new Error('cached photos must not be analysed again');
    };

    await engine.queueDetection(image, '/uploads/student.jpg', 'star');

    assert.equal(engine.maxConcurrent, 1, 'pixel reads are spread across event-loop turns');
    assert.equal(engine.detectionQueue.length, 0);
    assert.equal(image.attributes['data-face-focused'], 'true');
});

test('duplicate portraits waiting in the queue collapse into one pixel-read job', async () => {
    const FaceFocusEngine = loadFaceFocus(() => ({ getContext: () => null }));
    const engine = new FaceFocusEngine();
    let finishFirst;
    engine.detectFaceWithCanvas = image => {
        if (image.key === 'first') {
            return new Promise(resolve => { finishFirst = resolve; });
        }
        return Promise.resolve({ x: 50, y: 32 });
    };
    const createImage = key => ({
        key,
        style: {},
        setAttribute() {}
    });

    engine.queueDetection(createImage('first'), '/uploads/first.jpg', 'duty');
    engine.queueDetection(createImage('duplicate-a'), '/uploads/shared.jpg', 'duty');
    engine.queueDetection(createImage('duplicate-b'), '/uploads/shared.jpg', 'star');

    assert.equal(engine.detectionQueue.length, 1, 'only one shared-photo job waits behind the active analysis');
    assert.equal(engine.detectionQueue[0].linkedTargets.length, 1, 'the second role card joins the shared job');

    finishFirst({ x: 50, y: 32 });
});
