const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Load the module under test using eval since it's UMD and we want to avoid polluting global or requiring JSDOM.
const code = fs.readFileSync(path.join(__dirname, '../public/admin/schedule-diagnostics.js'), 'utf8');
const moduleExports = {};
const mockModule = { exports: moduleExports };
const mockGlobal = { AdminScheduleDiagnostics: {} };
const factory = new Function('module', 'exports', 'global', `
    ${code}
    if (typeof module !== 'undefined' && module.exports) return module.exports;
    return global.AdminScheduleDiagnostics;
`);

const AdminScheduleDiagnostics = factory(mockModule, moduleExports, mockGlobal);

const {
    createScheduleDiagnosticsViewModel,
    createScheduleDiagnosticsController,
    createDomScheduleDiagnosticsView,
    translateDiagnosticCode,
    translatePeriodType,
    translateSource,
    translateDay
} = AdminScheduleDiagnostics;

// Mock dependencies
class MockAPI {
    constructor() {
        this.requests = [];
        this.nextResponse = null;
        this.nextError = null;
        this.nextDelay = 0;
    }
    request(endpoint, options) {
        this.requests.push({ endpoint, options });
        return new Promise((resolve, reject) => {
            const act = () => {
                if (options.signal && options.signal.aborted) {
                    reject(new Error('AbortError'));
                    return;
                }
                if (this.nextError) {
                    reject(this.nextError);
                } else {
                    resolve(this.nextResponse);
                }
            };
            if (this.nextDelay > 0) {
                setTimeout(act, this.nextDelay);
            } else {
                act();
            }
        });
    }
}

class MockView {
    constructor() {
        this.actions = [];
    }
    renderLoading() {
        this.actions.push({ type: 'loading' });
    }
    renderTransportError(error) {
        this.actions.push({ type: 'error', error });
    }
    renderResult(viewModel) {
        this.actions.push({ type: 'result', viewModel });
    }
}

class MockLogger {
    constructor() {
        this.errors = [];
    }
    error(component, msg, err) {
        this.errors.push({ component, msg, err });
    }
}

test('1. Valid database response creates valid model.', () => {
    const input = {
        day: 'weekday',
        source: 'database',
        valid: true,
        periods: [{ name: 'Math', type: 'class', start: '09:00', end: '09:40', duration: 40 }],
        warnings: [],
        errors: []
    };
    const vm = createScheduleDiagnosticsViewModel(input, 'weekday');
    assert.strictEqual(vm.state, 'valid');
    assert.strictEqual(vm.valid, true);
    assert.strictEqual(vm.source, 'database');
    assert.strictEqual(vm.periodCount, 1);
});

test('2. Valid model contains defensive period copies.', () => {
    const input = { day: 'weekday', source: 'database', valid: true, periods: [{ id: 1 }], warnings: [], errors: [] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.notStrictEqual(vm.periods[0], input.periods[0]);
    assert.deepEqual(vm.periods[0], input.periods[0]);
});

test('3. Warnings are defensive copies.', () => {
    const input = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [{ code: 'INVALID_ROW' }], errors: [] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.notStrictEqual(vm.warnings, input.warnings);
    assert.notStrictEqual(vm.warnings[0], input.warnings[0]);
    assert.strictEqual(vm.warnings[0].code, 'INVALID_ROW');
});

test('4. Errors are defensive copies.', () => {
    const input = { day: 'weekday', source: 'database', valid: false, periods: [], warnings: [], errors: [{ code: 'NO_CLASS_PERIOD' }] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.notStrictEqual(vm.errors, input.errors);
    assert.notStrictEqual(vm.errors[0], input.errors[0]);
});

test('5. Input is not mutated.', () => {
    const input = { day: 'weekday', source: 'database', valid: true, periods: [{ a: 1 }], warnings: [], errors: [] };
    const copy = JSON.parse(JSON.stringify(input));
    createScheduleDiagnosticsViewModel(input);
    assert.deepEqual(input, copy);
});

test('6. Empty source creates empty model preserving diagnostics.', () => {
    const input = { day: 'weekday', source: 'empty', valid: false, periods: [{id: 1}], warnings: [{code: 'INVALID_ROW'}], errors: [{code: 'NO_CLASS_PERIOD'}] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.strictEqual(vm.state, 'empty');
    assert.strictEqual(vm.valid, false);
    assert.strictEqual(vm.periodCount, 0);
    assert.strictEqual(vm.periods.length, 0); // Hide periods
    assert.strictEqual(vm.warnings.length, 1); // Preserve diagnostics
    assert.strictEqual(vm.errors.length, 1);
});

test('7. Legacy-incomplete source creates legacy model preserving diagnostics.', () => {
    const input = { day: 'weekday', source: 'legacy-incomplete', valid: false, periods: [{ id: 1 }], warnings: [{code: 'INVALID_ROW'}], errors: [{code: 'NO_CLASS_PERIOD'}] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.strictEqual(vm.state, 'legacy-incomplete');
    assert.strictEqual(vm.valid, false);
    assert.strictEqual(vm.periodCount, 0);
    assert.strictEqual(vm.periods.length, 0); // Hide periods
    assert.strictEqual(vm.warnings.length, 1); // Preserve diagnostics
    assert.strictEqual(vm.errors.length, 1);
});

test('8. Legacy partial periods are not exposed.', () => {
    const input = { day: 'weekday', source: 'legacy-incomplete', valid: false, periods: [{ name: 'Legacy Class' }], warnings: [], errors: [] };
    const vm = createScheduleDiagnosticsViewModel(input);
    assert.strictEqual(vm.periods.length, 0);
});

test('9. Null response becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel(null);
    assert.strictEqual(vm.state, 'invalid');
    assert.strictEqual(vm.valid, false);
    assert.strictEqual(vm.periods.length, 0);
});

test('10. Array response becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel([]);
    assert.strictEqual(vm.state, 'invalid');
});

test('11. Primitive response becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel("bad");
    assert.strictEqual(vm.state, 'invalid');
});

test('12. Missing day becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ source: 'database', valid: true, periods: [], warnings: [], errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('13. Day mismatch becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'friday', source: 'database', valid: true, periods: [], warnings: [], errors: [] }, 'weekday');
    assert.strictEqual(vm.state, 'invalid');
});

test('14. Unknown source becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'magical', valid: true, periods: [], warnings: [], errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('15. Invalid `valid` type becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: 'yes', periods: [], warnings: [], errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('16. Non-array periods become invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: {}, warnings: [], errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('17. Missing warnings becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('18. Non-array warnings become invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: 'none', errors: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('19. Missing errors becomes invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('20. Non-array errors become invalid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], errors: 'none', warnings: [] });
    assert.strictEqual(vm.state, 'invalid');
});

test('21. Valid empty period array remains a valid database result with zero count only when the API explicitly says valid.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] });
    assert.strictEqual(vm.state, 'valid');
    assert.strictEqual(vm.periodCount, 0);
});

test('22. Database-invalid state maps to state invalid and hides periods.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: false, periods: [{name: 'Math'}], warnings: [{code: 'INVALID_ROW'}], errors: [{code: 'NO_CLASS_PERIOD'}] });
    assert.strictEqual(vm.state, 'invalid');
    assert.strictEqual(vm.valid, false);
    assert.strictEqual(vm.periods.length, 0);
    assert.strictEqual(vm.warnings.length, 1);
    assert.strictEqual(vm.errors.length, 1);
});

test('23. Object with null prototype is safely handled (or becomes invalid if missing fields).', () => {
    const obj = Object.create(null);
    obj.day = 'weekday';
    obj.source = 'database';
    obj.valid = true;
    obj.periods = [];
    obj.warnings = [];
    obj.errors = [];
    const vm = createScheduleDiagnosticsViewModel(obj);
    assert.strictEqual(vm.state, 'valid');
});

test('24. Day label for weekday is Turkish.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] });
    assert.strictEqual(vm.dayLabel, 'Hafta içi');
});

// --- Translation ---
test('25. Class type translates to Ders.', () => {
    assert.strictEqual(translatePeriodType('class'), 'Ders');
});

test('26. Break type translates to Teneffüs.', () => {
    assert.strictEqual(translatePeriodType('break'), 'Teneffüs');
});

test('27. Unknown type translates to Bilinmeyen.', () => {
    assert.strictEqual(translatePeriodType('alien'), 'Bilinmeyen');
});

const REQUIRED_CODES = [
    'INVALID_ROW',
    'MISSING_NAME',
    'UNKNOWN_TYPE',
    'INVALID_START_TIME',
    'INVALID_END_TIME',
    'ZERO_DURATION',
    'END_BEFORE_START',
    'DUPLICATE_PERIOD',
    'OVERLAP',
    'SCHEDULE_GAP',
    'NO_CLASS_PERIOD',
    'PARTIAL_SCHEDULE_REJECTED',
    'INVALID_NORMALIZER_RESULT',
    'SCHEDULE_VALIDATION_EXCEPTION',
    'INVALID_SCHEDULE_DAY',
    'INVALID_SCHEDULE_BODY',
    'SCHEDULE_STORAGE_UNAVAILABLE'
];

test('28. Each required diagnostic code has a non-empty, distinct Turkish explanation.', () => {
    const generic = translateDiagnosticCode('WEIRD_ERROR');
    for (const code of REQUIRED_CODES) {
        const text = translateDiagnosticCode(code);
        assert.ok(typeof text === 'string');
        assert.ok(text.length > 0);
        assert.notStrictEqual(text, generic);
    }
});

test('29. Unknown diagnostic code receives a generic Turkish explanation.', () => {
    assert.strictEqual(translateDiagnosticCode('WEIRD_ERROR'), 'Program verisinde tanımlanamayan bir sorun bulundu.');
});

test('30. Raw English diagnostic message is not used as the main explanation.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [{ code: 'INVALID_ROW', message: 'English message' }] });
    assert.notStrictEqual(vm.errors[0].message, 'English message');
    assert.strictEqual(vm.errors[0].message, 'Geçersiz satır formatı.');
});

test('31. Diagnostic code is preserved separately.', () => {
    const vm = createScheduleDiagnosticsViewModel({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [{ code: 'INVALID_ROW' }] });
    assert.strictEqual(vm.errors[0].code, 'INVALID_ROW');
});

// --- Controller ---
test('32. Default URL is correct.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(api.requests[0].endpoint, '/schedule/normalized?day=weekday');
});

test('33. Custom day is URL encoded.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view, day: 'weekend day' });
    api.nextResponse = { day: 'weekend day', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(api.requests[0].endpoint, '/schedule/normalized?day=weekend%20day');
});

test('34. Custom endpoint works.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view, endpoint: '/custom' });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(api.requests[0].endpoint, '/custom?day=weekday');
});

test('35. Loading view runs before request completion.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    api.nextDelay = 50;
    const ctrl = createScheduleDiagnosticsController({ api, view });
    const p = ctrl.load();
    assert.strictEqual(view.actions[0].type, 'loading');
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await p;
});

test('36. Valid response renders result.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(view.actions[1].type, 'result');
    assert.strictEqual(view.actions[1].viewModel.state, 'valid');
});

test('37. Empty response renders empty result.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'empty', valid: false, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(view.actions[1].viewModel.state, 'empty');
});

test('38. Legacy response renders legacy result.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'legacy-incomplete', valid: false, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(view.actions[1].viewModel.state, 'legacy-incomplete');
});

test('39. Malformed response renders invalid result.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = "bad data";
    await ctrl.load();
    assert.strictEqual(view.actions[1].viewModel.state, 'invalid');
});

test('40. Network rejection renders transport error.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextError = new Error('Network Failure');
    await ctrl.load();
    assert.strictEqual(view.actions[1].type, 'error');
    assert.strictEqual(view.actions[1].error.message, 'Ders programı bilgisi alınamadı.');
});

test('41. HTTP-service rejection renders transport error.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextError = new Error('HTTP 500');
    await ctrl.load();
    assert.strictEqual(view.actions[1].type, 'error');
});

test('42. Transport error does not throw from `load()`.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextError = new Error('Network Failure');
    const res = await ctrl.load();
    assert.ok(res.retryable);
    assert.strictEqual(res.message, 'Ders programı bilgisi alınamadı.');
});

test('43. Retry works after failure.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextError = new Error('Network Failure');
    await ctrl.load();
    api.nextError = null;
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(api.requests.length, 2);
    assert.strictEqual(view.actions[view.actions.length-1].type, 'result');
});

test('44. Concurrent loads share one Promise.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    api.nextDelay = 50;
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    const p1 = ctrl.load();
    const p2 = ctrl.load();
    assert.strictEqual(p1, p2);
    await p1;
});

test('45. Concurrent loads make one request.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    api.nextDelay = 50;
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    const p1 = ctrl.load();
    const p2 = ctrl.load();
    await p1;
    assert.strictEqual(api.requests.length, 1);
});

test('46. `isLoading()` is true while pending.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    api.nextDelay = 50;
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    const p = ctrl.load();
    assert.strictEqual(ctrl.isLoading(), true);
    await p;
});

test('47. `isLoading()` clears after success.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(ctrl.isLoading(), false);
});

test('48. `isLoading()` clears after failure.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextError = new Error('Fail');
    await ctrl.load();
    assert.strictEqual(ctrl.isLoading(), false);
});

test('49. Timeout produces retryable transport state.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view, timeoutMs: 50 });
    api.nextDelay = 150; // Takes longer than timeout
    await ctrl.load();
    assert.strictEqual(view.actions[view.actions.length-1].type, 'error');
    assert.strictEqual(view.actions[view.actions.length-1].error.retryable, true);
});

test('50. Timeout timer clears after success.', async () => {
    const origSetTimeout = global.setTimeout;
    const origClearTimeout = global.clearTimeout;
    let timerCreated = false;
    let timerCleared = false;
    global.setTimeout = (cb, ms) => {
        timerCreated = true;
        return { id: 'mock-timer', cb };
    };
    global.clearTimeout = (t) => {
        if (t && t.id === 'mock-timer') timerCleared = true;
    };
    
    try {
        const api = new MockAPI();
        const view = new MockView();
        const ctrl = createScheduleDiagnosticsController({ api, view, timeoutMs: 1000 });
        api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
        await ctrl.load();
        assert.strictEqual(timerCreated, true);
        assert.strictEqual(timerCleared, true);
    } finally {
        global.setTimeout = origSetTimeout;
        global.clearTimeout = origClearTimeout;
    }
});

test('51. Timeout timer clears after early rejection.', async () => {
    const origSetTimeout = global.setTimeout;
    const origClearTimeout = global.clearTimeout;
    let timerCreated = false;
    let timerCleared = false;
    global.setTimeout = (cb, ms) => {
        timerCreated = true;
        return { id: 'mock-timer', cb };
    };
    global.clearTimeout = (t) => {
        if (t && t.id === 'mock-timer') timerCleared = true;
    };
    
    try {
        const api = new MockAPI();
        const view = new MockView();
        const ctrl = createScheduleDiagnosticsController({ api, view, timeoutMs: 1000 });
        api.nextError = new Error('Fail');
        await ctrl.load();
        assert.strictEqual(timerCreated, true);
        assert.strictEqual(timerCleared, true);
    } finally {
        global.setTimeout = origSetTimeout;
        global.clearTimeout = origClearTimeout;
    }
});

test('52. Missing API returns dependency error safely without throwing.', async () => {
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ view });
    const res = await ctrl.load();
    assert.strictEqual(res.status, 'dependency-error');
    assert.strictEqual(res.dependency, 'api');
});

test('53. Missing view returns dependency error safely without throwing.', async () => {
    const api = new MockAPI();
    const ctrl = createScheduleDiagnosticsController({ api });
    const res = await ctrl.load();
    assert.strictEqual(res.status, 'dependency-error');
    assert.strictEqual(res.dependency, 'view');
});

test('54. `getLastResult()` is defensive.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [{ name: 'A' }], warnings: [], errors: [] };
    await ctrl.load();
    const res1 = ctrl.getLastResult();
    const res2 = ctrl.getLastResult();
    assert.notStrictEqual(res1, res2);
    assert.notStrictEqual(res1.periods[0], res2.periods[0]);
});

test('55. `hasLoaded()` changes after first settled request.', async () => {
    const api = new MockAPI();
    const view = new MockView();
    const ctrl = createScheduleDiagnosticsController({ api, view });
    assert.strictEqual(ctrl.hasLoaded(), false);
    api.nextResponse = { day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] };
    await ctrl.load();
    assert.strictEqual(ctrl.hasLoaded(), true);
});

// --- DOM integration source checks ---

// Read the admin HTML to verify integration
const htmlPath = path.join(__dirname, '../public/admin/index.html');
const adminHtml = fs.readFileSync(htmlPath, 'utf8');

test('56. Admin HTML includes the Turkish diagnostics tab.', () => {
    assert.ok(adminHtml.includes('>Ders Programı<'));
    assert.ok(adminHtml.includes("showTab('scheduleDiagnostics')"));
});

test('57. Admin HTML includes no editable schedule inputs.', () => {
    // Just verify basic diagnostic ID exists and is read-only
    assert.ok(adminHtml.includes('id="scheduleDiagnostics"'));
    assert.ok(!adminHtml.includes('<input name="schedule"'));
});

test('58. Admin HTML includes no schedule save button.', () => {
    const diagSection = adminHtml.substring(adminHtml.indexOf('id="scheduleDiagnostics"'), adminHtml.indexOf('id="sdLoading"'));
    assert.ok(diagSection.includes('Yenile'));
    assert.ok(!diagSection.toLowerCase().includes('kaydet'));
});

test('59. New script loads before admin.js.', () => {
    const script1 = adminHtml.indexOf('<script src="schedule-diagnostics.js"></script>');
    const script2 = adminHtml.indexOf('<script src="admin.js"></script>');
    assert.ok(script1 !== -1 && script2 !== -1);
    assert.ok(script1 < script2);
});

test('60. Admin integration uses GET-only controller.', () => {
    assert.ok(code.includes("method: 'GET'"));
    assert.ok(!code.includes("method: 'POST'"));
    assert.ok(!code.includes("method: 'PUT'"));
});

test('61. No modification methods exist in admin diagnostics files.', () => {
    assert.ok(!code.includes('PUT'));
    assert.ok(!code.includes('POST'));
    assert.ok(!code.includes('DELETE'));
    assert.ok(!code.includes('PATCH'));
});

test('62. Dynamic rendering does not use `innerHTML` for API values.', () => {
    const renderStr = createDomScheduleDiagnosticsView.toString();
    assert.ok(!renderStr.includes('innerHTML = '));
    assert.ok(renderStr.includes('textContent = '));
    assert.ok(renderStr.includes('document.createElement'));
});

test('63. DOM rendering maps types correctly.', () => {
    const mockDocument = {
        elements: {},
        getElementById(id) {
            if (!this.elements[id]) {
                this.elements[id] = { style: {}, textContent: '', replaceChildren: function() { this.children = []; }, appendChild: function(el) { this.children = this.children || []; this.children.push(el); }, children: [] };
            }
            return this.elements[id];
        },
        createElement(tag) {
            return { tag, style: {}, textContent: '', appendChild: function(el) { this.children = this.children || []; this.children.push(el); }, children: [] };
        }
    };

    const view = createDomScheduleDiagnosticsView(mockDocument);
    view.renderResult({
        state: 'valid',
        valid: true,
        source: 'database',
        sourceLabel: 'Veritabanı',
        day: 'weekday',
        dayLabel: 'Hafta içi',
        periodCount: 1,
        warnings: [],
        errors: [],
        periods: [{ type: 'class', name: 'Math', start: '09:00', end: '09:40', duration: 40 }]
    });

    assert.strictEqual(mockDocument.getElementById('sdStatus').textContent, 'Geçerli');
    assert.strictEqual(mockDocument.getElementById('sdSource').textContent, 'Veritabanı');
    const tbody = mockDocument.getElementById('sdPeriodsTableBody');
    assert.strictEqual(tbody.children.length, 1);
    assert.strictEqual(tbody.children[0].children[1].textContent, 'Ders');
});

test('64. DOM rendering handles unknown types safely.', () => {
    const mockDocument = {
        elements: {},
        getElementById(id) {
            if (!this.elements[id]) {
                this.elements[id] = { style: {}, textContent: '', replaceChildren: function() { this.children = []; }, appendChild: function(el) { this.children = this.children || []; this.children.push(el); }, children: [] };
            }
            return this.elements[id];
        },
        createElement(tag) {
            return { tag, style: {}, textContent: '', appendChild: function(el) { this.children = this.children || []; this.children.push(el); }, children: [] };
        }
    };

    const view = createDomScheduleDiagnosticsView(mockDocument);
    view.renderResult({
        state: 'valid',
        valid: true,
        source: 'database',
        sourceLabel: 'Veritabanı',
        day: 'weekday',
        dayLabel: 'Hafta içi',
        periodCount: 1,
        warnings: [],
        errors: [],
        periods: [{ type: 'alien', name: 'Alien', start: '09:00', end: '09:40', duration: 40 }]
    });

    const tbody = mockDocument.getElementById('sdPeriodsTableBody');
    assert.strictEqual(tbody.children[0].children[1].textContent, 'Bilinmeyen');
});

const adminJsPath = path.join(__dirname, '../public/admin/admin.js');
const adminJs = fs.readFileSync(adminJsPath, 'utf8');

test('65. Admin JS integration uses window.api instead of APIService class directly.', () => {
    assert.ok(adminJs.includes('const api = window.api;'));
    assert.ok(!adminJs.includes('api: APIService,'));
});
