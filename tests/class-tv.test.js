const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const classTvPath = path.join(__dirname, '../public/js/class-tv.js');
const source = fs.existsSync(classTvPath) ? fs.readFileSync(classTvPath, 'utf8') : '';
const dashboardSource = fs.readFileSync(path.join(__dirname, '../public/js/script.js'), 'utf8');
const kioskHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const magicComponents = fs.readFileSync(path.join(__dirname, '../public/themes/magic-park/magic-components.css'), 'utf8');

function classList() {
    const values = new Set();
    return {
        add: (...items) => items.forEach(item => values.add(item)),
        remove: (...items) => items.forEach(item => values.delete(item)),
        toggle: (item, force) => force ? values.add(item) : values.delete(item),
        contains: item => values.has(item)
    };
}

function element() {
    return {
        hidden: false,
        innerHTML: '',
        textContent: '',
        dataset: {},
        classList: classList(),
        style: {},
        replaceChildren(...children) { this.children = children; },
        setAttribute() {},
        removeAttribute() {}
    };
}

function createHarness() {
    const elements = {
        'class-tv-layer': element(),
        'class-tv-programme': element(),
        'class-tv-mascot-pip': element(),
        'class-tv-takeover': element(),
        'slideshow-container': element()
    };
    const timers = new Map();
    let timerId = 0;
    let now = 1_000;
    const listeners = new Map();

    const document = {
        body: { dataset: { theme: 'magic-park' } },
        addEventListener() {},
        getElementById: id => elements[id] || null,
        createElement() { return element(); }
    };
    const window = {
        document,
        addEventListener(type, handler) { listeners.set(type, handler); },
        removeEventListener(type) { listeners.delete(type); },
        setTimeout(handler, delay) {
            const id = ++timerId;
            timers.set(id, { handler, delay });
            return id;
        },
        clearTimeout(id) { timers.delete(id); },
        Date: { now: () => now },
        Math,
        gsap: null
    };
    window.window = window;

    const sandbox = { window, document, console, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
    vm.createContext(sandbox);
    if (source) vm.runInContext(source, sandbox);

    return {
        window,
        elements,
        timers,
        listeners,
        advance(ms) { now += ms; },
        runTimer(id) {
            const timer = timers.get(id);
            if (!timer) return;
            timers.delete(id);
            timer.handler();
        }
    };
}

test('Class TV exposes a director factory and programme data API', () => {
    assert.ok(fs.existsSync(classTvPath), 'public/js/class-tv.js must exist');
    assert.match(source, /createClassTV/);
    assert.match(source, /updateStats/);
    assert.match(source, /updateRoles/);
    assert.match(source, /showNextProgramme/);
    assert.match(source, /handleNoise/);
});

test('vice presidents leave the narrow president panel and remain available to Class TV', () => {
    assert.doesNotMatch(dashboardSource, /vice-presidents-container/,
        'the president panel must not render vice-president markup anymore');
    assert.match(dashboardSource, /ClassTV[^\n]*updateRoles|ClassTV\?\.updateRoles/,
        'the complete roles snapshot must be forwarded to Class TV');
    assert.match(dashboardSource, /ClassTV[^\n]*updateStats|ClassTV\?\.updateStats/,
        'attendance statistics must be forwarded to Class TV');
    assert.match(source, /role_type\s*===\s*['"]vice_president['"]/);
    assert.match(source, /role_type\s*===\s*['"]duty['"]/);
});

test('Class TV keeps attendance and absence programmes but never duplicates the box-owned gender counts', () => {
    const harness = createHarness();
    const director = harness.window.createClassTV({
        document: harness.window.document,
        setTimeout: harness.window.setTimeout,
        clearTimeout: harness.window.clearTimeout
    });
    director.init();
    director.updateStats({
        total: 24,
        girls: 12,
        boys: 12,
        todayPresent: 22,
        todayAbsent: 2,
        absentStudents: [{ name: 'Ada' }]
    });

    const families = director.getProgrammeFamilies();
    assert.ok(families.includes('attendance'));
    assert.ok(families.includes('absent'));
    assert.ok(!families.includes('gender'));
    assert.equal(director.renderProgramme('gender'), '');
    assert.doesNotMatch(source, /class-tv-card--gender/);
});

test('high noise takeover is coalesced and restores the interrupted programme', () => {
    const harness = createHarness();
    assert.equal(typeof harness.window.createClassTV, 'function');
    const director = harness.window.createClassTV({
        document: harness.window.document,
        setTimeout: harness.window.setTimeout,
        clearTimeout: harness.window.clearTimeout,
        now: () => 1_000
    });
    director.init();
    director.updateStats({ total: 8, girls: 4, boys: 4, todayPresent: 7, todayAbsent: 1, absentStudents: [] });
    director.showProgramme('attendance');
    const before = harness.elements['class-tv-programme'].innerHTML;

    director.handleNoise({ level: 'high', score: 92, micState: 'listening' });
    const firstTimer = director.takeoverTimer;
    director.handleNoise({ level: 'high', score: 97, micState: 'listening' });

    assert.equal(director.takeoverTimer, firstTimer, 'repeated high samples must not spawn another takeover timer');
    assert.equal(harness.elements['class-tv-takeover'].hidden, false);
    harness.runTimer(firstTimer);
    assert.equal(harness.elements['class-tv-takeover'].hidden, true);
    assert.equal(harness.elements['class-tv-programme'].innerHTML, before);
});

test('programme selection skips unavailable families and avoids immediate family repetition', () => {
    const harness = createHarness();
    assert.equal(typeof harness.window.createClassTV, 'function');
    const director = harness.window.createClassTV({
        document: harness.window.document,
        setTimeout: harness.window.setTimeout,
        clearTimeout: harness.window.clearTimeout,
        random: () => 0
    });
    director.init();
    director.updateStats({ total: 8, girls: 4, boys: 4, todayPresent: 8, todayAbsent: 0, absentStudents: [] });

    director.showProgramme('attendance');
    const next = director.pickNextProgramme();

    assert.notEqual(next, 'attendance');
    assert.ok(['ataturk', 'base-media'].includes(next));
});

test('Class TV escapes role names before rendering vice-president programme HTML', () => {
    const harness = createHarness();
    const director = harness.window.createClassTV({
        document: harness.window.document,
        setTimeout: harness.window.setTimeout,
        clearTimeout: harness.window.clearTimeout
    });
    director.init();
    director.updateRoles([
        { role_type: 'vice_president', id: 2, name: '<script>globalThis.__xss=1</script>' }
    ]);

    director.showProgramme('vice-presidents');
    const html = harness.elements['class-tv-programme'].innerHTML;

    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;globalThis.__xss=1&lt;\/script&gt;/);
});

test('Class TV pauses broadcast timers outside Magic Park and resumes idempotently', () => {
    const harness = createHarness();
    const director = harness.window.createClassTV({
        document: harness.window.document,
        setTimeout: harness.window.setTimeout,
        clearTimeout: harness.window.clearTimeout
    });

    director.init();
    assert.equal(director.themeActive, true);
    assert.ok(director.programmeTimer, 'Magic Park starts one programme timer');

    const themeListener = harness.listeners.get('classroom:theme-change');
    assert.equal(typeof themeListener, 'function');
    themeListener({ detail: { themeId: 'school-garden' } });

    assert.equal(director.themeActive, false);
    assert.equal(director.programmeTimer, null, 'alternate themes pause programme rotation');
    assert.equal(director.mascotRepeatTimer, null, 'alternate themes pause mascot interventions');

    themeListener({ detail: { themeId: 'magic-park' } });
    const resumedTimer = director.programmeTimer;
    assert.equal(director.themeActive, true);
    assert.ok(resumedTimer, 'returning to Magic Park resumes one programme timer');

    themeListener({ detail: { themeId: 'magic-park' } });
    assert.equal(director.programmeTimer, resumedTimer,
        'duplicate Magic Park events must not create duplicate programme loops');
});

test('Class TV owns playful broadcast chrome and automatic transition families', () => {
    assert.match(kioskHtml, /class="class-tv__broadcast-bug"[^>]*>[\s\S]*?2\/D[\s\S]*?TV/,
        'the centre screen needs a persistent classroom channel identity');
    assert.match(kioskHtml, /class="class-tv__channel-rail"/,
        'the television needs a compact child-friendly channel rail');
    assert.match(magicComponents, /--class-tv-purple:/);
    assert.match(magicComponents, /--class-tv-yellow:/);
    assert.match(magicComponents, /\.class-tv__broadcast-bug\s*\{/);
    assert.match(magicComponents, /\.class-tv__channel-dot\s*\{/);
    assert.match(source, /PROGRAMME_TRANSITIONS\s*=\s*\[[^\]]*'tune'[^\]]*'sweep'[^\]]*'pop'/s,
        'programme changes should rotate through multiple automatic broadcast transitions');
    assert.match(source, /dataset\.transition\s*=\s*transitionName/,
        'the active transition should be exposed as semantic presentation state');
});
