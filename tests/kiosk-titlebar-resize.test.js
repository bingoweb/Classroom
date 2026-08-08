'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const motionPath = path.join(__dirname, '..', 'public', 'js', 'kiosk-motion.js');
const motionSource = fs.readFileSync(motionPath, 'utf8');

function runMotionHarness({ reducedMotion = false } = {}) {
    const setCalls = [];
    const timelineCalls = [];
    let timelineConfig = null;

    const timeline = {
        from(target, vars, position) {
            timelineCalls.push({ target, vars, position });
            return timeline;
        },
        kill() {}
    };

    const gsap = {
        matchMedia() {
            return {
                add(conditions, callback) {
                    callback({
                        conditions: {
                            fullMotion: !reducedMotion,
                            reduceMotion: reducedMotion
                        }
                    });
                },
                revert() {}
            };
        },
        timeline(config) {
            timelineConfig = config;
            return timeline;
        },
        set(target, vars) {
            setCalls.push({ target, vars });
        },
        to() {},
        from() {},
        fromTo() {},
        utils: {
            toArray() {
                return [];
            }
        }
    };

    const document = {
        readyState: 'complete',
        body: {
            prepend() {}
        },
        querySelector(selector) {
            if (selector === '.park-ambient') {
                return {};
            }
            return null;
        },
        createElement() {
            throw new Error('ambient layer should already exist in this harness');
        },
        getElementById() {
            return null;
        },
        addEventListener() {}
    };

    const windowObject = {
        gsap,
        matchMedia() {
            return { matches: reducedMotion };
        },
        addEventListener() {}
    };

    const context = vm.createContext({
        window: windowObject,
        document,
        MutationObserver: class {
            observe() {}
            disconnect() {}
        }
    });

    vm.runInContext(motionSource, context, { filename: motionPath });

    return { setCalls, timelineCalls, timelineConfig };
}

test('Kiosk titlebar resize regression', async (t) => {
    await t.test('full-motion entrance restores CSS-owned titlebar transforms after the timeline completes', () => {
        const harness = runMotionHarness();

        assert.ok(harness.timelineConfig, 'full-motion mode must create an entrance timeline');
        assert.equal(typeof harness.timelineConfig.onComplete, 'function', 'entrance timeline must clean layout transforms on completion');

        harness.timelineConfig.onComplete();

        const cleanup = harness.setCalls.find((call) => call.target === '.card-titlebar');
        assert.ok(cleanup, 'timeline completion must clear card titlebar motion transforms');
        assert.equal(cleanup.vars.clearProps, 'transform,translate,rotate,scale');
    });

    await t.test('the entrance still animates titlebars with y/scale before cleanup', () => {
        const harness = runMotionHarness();
        const titleTween = harness.timelineCalls.find((call) => call.target === '.card-titlebar');

        assert.ok(titleTween, 'titlebar entrance tween must remain present');
        assert.equal(titleTween.vars.y, '-1.2vh');
        assert.equal(titleTween.vars.scale, 0.92);
    });

    await t.test('reduced-motion mode clears all titlebar motion styles immediately', () => {
        const harness = runMotionHarness({ reducedMotion: true });
        const cleanup = harness.setCalls.find((call) => call.target === '.card-titlebar, .park-spark');

        assert.ok(cleanup);
        assert.equal(cleanup.vars.clearProps, 'all');
        assert.equal(harness.timelineConfig, null);
    });
});
