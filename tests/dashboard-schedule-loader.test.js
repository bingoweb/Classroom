const test = require('node:test');
const assert = require('node:assert/strict');

// Mock browser environment for the UMD loader
const mockWindow = {};
global.window = mockWindow;
global.self = mockWindow;

const DashboardScheduleLoader = require('../public/js/dashboard-schedule-loader.js');
const { classifyNormalizedScheduleResponse, createDashboardScheduleLoader } = DashboardScheduleLoader;

const validBase = {
    day: 'weekday',
    source: 'database',
    valid: true,
    periods: [{ name: 'A' }],
    warnings: [],
    errors: []
};

test('1. Valid database response is accepted.', () => {
    const res = classifyNormalizedScheduleResponse(validBase);
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.kind, 'valid-database-schedule');
});

test('2. Accepted periods are defensive copies.', () => {
    const res = classifyNormalizedScheduleResponse(validBase);
    assert.notStrictEqual(res.periods, validBase.periods);
    assert.deepEqual(res.periods, validBase.periods);
});

test('3. Accepted warnings are defensive copies.', () => {
    const res = classifyNormalizedScheduleResponse(validBase);
    assert.notStrictEqual(res.warnings, validBase.warnings);
    assert.deepEqual(res.warnings, validBase.warnings);
});

test('4. Null response is rejected.', () => {
    const res = classifyNormalizedScheduleResponse(null);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_RESPONSE');
});

test('5. Array response is rejected.', () => {
    const res = classifyNormalizedScheduleResponse([]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_RESPONSE');
});

test('6. Primitive response is rejected.', () => {
    const res = classifyNormalizedScheduleResponse('test');
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_RESPONSE');
});

test('7. Missing day is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, day: undefined });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'DAY_MISMATCH');
});

test('8. Day mismatch is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, day: 'monday' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'DAY_MISMATCH');
});

test('9. Empty source is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, source: '' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'UNKNOWN_SOURCE');
});

test('10. Legacy-incomplete source is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, source: 'legacy-incomplete' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'LEGACY_INCOMPLETE_SOURCE');
});

test('11. Unknown source is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, source: 'unknown' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'NON_DATABASE_SOURCE');
});

test('12. valid: false is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, valid: false });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'BACKEND_MARKED_INVALID');
});

test('13. Missing periods is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, periods: undefined });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'NON_ARRAY_PERIODS');
});

test('14. Empty periods is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, periods: [] });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'EMPTY_PERIODS');
});

test('15. Non-array periods is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, periods: 'notarray' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'NON_ARRAY_PERIODS');
});

test('16. Missing warnings is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, warnings: undefined });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'MISSING_WARNINGS');
});

test('17. Non-array warnings is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, warnings: 'notarray' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'MISSING_WARNINGS');
});

test('18. Missing errors is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, errors: undefined });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'MISSING_ERRORS');
});

test('19. Non-array errors is rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, errors: 'notarray' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'MISSING_ERRORS');
});

test('20. Non-empty errors are rejected.', () => {
    const res = classifyNormalizedScheduleResponse({ ...validBase, errors: ['Some error'] });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'BACKEND_ERRORS_PRESENT');
});

test('21. Classifier does not mutate input.', () => {
    const original = JSON.parse(JSON.stringify(validBase));
    classifyNormalizedScheduleResponse(validBase);
    assert.deepEqual(validBase, original);
});

function createMocks() {
    let activeSchedule = [];
    let source = 'fallback';
    let cleared = false;
    let set = false;
    let reqCount = 0;
    return {
        scheduleManager: {
            getScheduleSource: () => source,
            getActiveSchedule: () => activeSchedule,
            setExternalSchedule: (periods) => {
                set = true;
                if (periods[0] && periods[0].name === 'RejectMe') {
                    return { accepted: false, source: 'fallback', fallbackActive: true };
                }
                source = 'external';
                activeSchedule = periods;
                return { accepted: true, source: 'external', fallbackActive: false };
            },
            clearExternalSchedule: () => {
                cleared = true;
                source = 'fallback';
                activeSchedule = [];
            }
        },
        api: {
            request: async (url, opts) => {
                reqCount++;
                return new Promise((resolve, reject) => {
                    if (opts && opts.signal) {
                        opts.signal.addEventListener('abort', () => reject(new Error('abort')));
                    }
                    if (url.includes('valid')) {
                        resolve({ day: 'weekday', source: 'database', valid: true, periods: [{ name: 'Class' }], warnings: [], errors: [] });
                    } else if (url.includes('rejectme')) {
                        resolve({ day: 'weekday', source: 'database', valid: true, periods: [{ name: 'RejectMe' }], warnings: [], errors: [] });
                    } else if (url.includes('empty')) {
                        resolve({});
                    } else if (url.includes('legacy-incomplete')) {
                        resolve({ day: 'weekday', source: 'legacy-incomplete', valid: false, periods: [{ name: 'Legacy' }], warnings: [], errors: [] });
                    } else if (url.includes('malformed')) {
                        resolve({ day: 'weekday', source: 'database', valid: true, periods: [], warnings: [], errors: [] }); // empty periods
                    } else {
                        setTimeout(() => resolve({ day: 'weekday', source: 'database', valid: true, periods: [{name:'X'}], warnings: [], errors: [] }), 20);
                    }
                });
            }
        },
        getCleared: () => cleared,
        getSet: () => set,
        getReqCount: () => reqCount,
        logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    };
}

test('22. Valid response calls setExternalSchedule.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid' });
    await loader.load();
    assert.strictEqual(scheduleManager.getScheduleSource(), 'external');
});

test('23. Accepted activation results in external source.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid' });
    const res = await loader.load();
    assert.strictEqual(res.source, 'external');
    assert.strictEqual(res.status, 'activated');
});

test('24. Rejected manager activation restores fallback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/rejectme' });
    const res = await loader.load();
    assert.strictEqual(res.source, 'fallback');
    assert.strictEqual(res.status, 'fallback');
    assert.strictEqual(res.reason, 'MANAGER_REJECTION');
});

test('25. Empty backend response restores fallback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/empty' });
    const res = await loader.load();
    assert.strictEqual(res.source, 'fallback');
});

test('26. Legacy-incomplete response restores fallback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/legacy-incomplete' });
    const res = await loader.load();
    assert.strictEqual(res.source, 'fallback');
});

test('27. Malformed HTTP 200 response restores fallback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/malformed' });
    const res = await loader.load();
    assert.strictEqual(res.source, 'fallback');
});

test('28. Invalid response does not pass periods to manager.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    let called = false;
    scheduleManager.setExternalSchedule = () => { called = true; };
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/empty' });
    await loader.load();
    assert.strictEqual(called, false);
});

test('29. Initial fallback remains fallback after invalid data.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/malformed' });
    const res = await loader.load();
    assert.strictEqual(res.status, 'fallback');
    assert.strictEqual(res.changed, false);
});

test('30. Valid response after fallback activates external.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid' });
    const res = await loader.load();
    assert.strictEqual(res.status, 'activated');
    assert.strictEqual(res.changed, true);
});

test('31. Invalid response after external restores fallback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    let loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid' });
    await loader.load();
    assert.strictEqual(scheduleManager.getScheduleSource(), 'external');
    loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/malformed' });
    const res = await loader.load();
    assert.strictEqual(res.status, 'fallback');
    assert.strictEqual(res.changed, true);
});

test('32. Same valid schedule twice does not trigger duplicate change callbacks.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    let callCount = 0;
    const onScheduleChanged = () => { callCount++; };
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid', onScheduleChanged });
    await loader.load();
    assert.strictEqual(callCount, 1);
    await loader.load();
    assert.strictEqual(callCount, 1);
});

test('33. Different valid schedule triggers a new change callback.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    let callCount = 0;
    let currentValid = 1;
    api.request = async () => ({
        day: 'weekday', source: 'database', valid: true, periods: [{ name: `Class ${currentValid}` }], warnings: [], errors: []
    });
    const onScheduleChanged = () => { callCount++; };
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, onScheduleChanged });
    await loader.load();
    assert.strictEqual(callCount, 1);
    currentValid = 2;
    await loader.load();
    assert.strictEqual(callCount, 2);
});

test('34. onScheduleChanged receives a defensive result.', async () => {
    const { api, scheduleManager, logger } = createMocks();
    let payload = null;
    const onScheduleChanged = (res) => { payload = res; };
    const loader = createDashboardScheduleLoader({ api, scheduleManager, logger, endpoint: '/valid', onScheduleChanged });
    const res = await loader.load();
    assert.deepEqual(payload, res);
    assert.notStrictEqual(payload, res);
});

test('35. Network rejection preserves initial fallback.', async () => {
    const mocks = createMocks();
    mocks.api = { request: async () => { throw new Error('Network Error'); } };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'transport-error');
    assert.strictEqual(mocks.getCleared(), false);
    assert.strictEqual(mocks.getSet(), false);
    assert.strictEqual(res.source, 'fallback');
});

test('36. Network rejection preserves an existing external schedule.', async () => {
    const mocks = createMocks();
    mocks.scheduleManager.setExternalSchedule([{name: 'X'}]); // Make it 'external'
    mocks.api = { request: async () => { throw new Error('Network Error'); } };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'transport-error');
    assert.strictEqual(res.source, 'external');
});

test('37. HTTP-service rejection preserves current state.', async () => {
    const mocks = createMocks();
    mocks.api = { request: async () => Promise.reject(new Error('500 Server Error')) };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'transport-error');
    assert.strictEqual(res.source, 'fallback');
});

test('38. Timeout preserves current state.', async () => {
    const mocks = createMocks();
    mocks.api = { request: async (url, opts) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ day: 'weekday', source: 'database', valid: true, periods: [{name:'X'}], warnings: [], errors: [] }), 100);
        if (opts && opts.signal) {
            opts.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('abort'));
            });
        }
    }) };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, timeoutMs: 10 });
    const res = await loader.load();
    assert.strictEqual(res.status, 'transport-error');
    assert.strictEqual(res.error.includes('Timeout') || res.error.includes('abort'), true);
});

test('39. Late completion after timeout cannot activate a schedule.', async () => {
    const mocks = createMocks();
    let completeFunc;
    mocks.api = { request: async (url, opts) => new Promise((resolve, reject) => {
        completeFunc = resolve;
        if (opts && opts.signal) {
            opts.signal.addEventListener('abort', () => reject(new Error('abort')));
        }
    }) };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, timeoutMs: 10 });
    await loader.load(); // Times out and aborts
    completeFunc({ day: 'weekday', source: 'database', valid: true, periods: [{name:'X'}], warnings: [], errors: [] });
    await new Promise(r => setTimeout(r, 10)); // wait a bit
    assert.strictEqual(mocks.getSet(), false);
});

test('40. A retry after timeout may succeed.', async () => {
    const mocks = createMocks();
    let attempts = 0;
    mocks.api = { request: async (url, opts) => new Promise((resolve, reject) => {
        attempts++;
        if (attempts === 1) {
            if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('abort')));
        } else {
            resolve({ day: 'weekday', source: 'database', valid: true, periods: [{name:'X'}], warnings: [], errors: [] });
        }
    }) };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, timeoutMs: 10 });
    await loader.load(); // Fails timeout
    const res2 = await loader.load(); // Succeeds
    assert.strictEqual(res2.status, 'activated');
    assert.strictEqual(mocks.getSet(), true);
});

test('41. Abort is treated as a transport failure.', async () => {
    const mocks = createMocks();
    mocks.api = { request: async (url, opts) => {
        return new Promise((resolve, reject) => {
            if (opts && opts.signal) {
                opts.signal.addEventListener('abort', () => reject(new Error('AbortError')));
            }
        });
    }};
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, timeoutMs: 10 });
    const res = await loader.load();
    assert.strictEqual(res.status, 'transport-error');
});

test('42. Concurrent calls share one in-flight Promise.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const p1 = loader.load();
    const p2 = loader.load();
    assert.strictEqual(p1, p2);
    await Promise.all([p1, p2]);
});

test('43. Concurrent calls create only one request.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    await Promise.all([loader.load(), loader.load(), loader.load()]);
    assert.strictEqual(mocks.getReqCount(), 1);
});

test('44. isLoading() reflects pending state.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    assert.strictEqual(loader.isLoading(), false);
    const p = loader.load();
    assert.strictEqual(loader.isLoading(), true);
    await p;
    assert.strictEqual(loader.isLoading(), false);
});

test('45. In-flight state clears after success.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    await loader.load();
    assert.strictEqual(loader.isLoading(), false);
});

test('46. In-flight state clears after rejection.', async () => {
    const mocks = createMocks();
    mocks.api.request = async () => Promise.reject(new Error('fail'));
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    await loader.load();
    assert.strictEqual(loader.isLoading(), false);
});

test('47. Missing API returns dependency error.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'dependency-error');
});

test('48. Missing ScheduleManager returns dependency error.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'dependency-error');
});

test('49. Malformed ScheduleManager returns dependency error.', async () => {
    const mocks = createMocks();
    mocks.scheduleManager.getActiveSchedule = undefined; // break it
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'dependency-error');
});

test('50. Unknown activation result falls back safely.', async () => {
    const mocks = createMocks();
    mocks.scheduleManager.setExternalSchedule = () => null; // unexpected null
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    const res = await loader.load();
    assert.strictEqual(res.status, 'fallback');
});

test('51. getLastResult() cannot mutate internal state.', async () => {
    const mocks = createMocks();
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    await loader.load();
    const r1 = loader.getLastResult();
    r1.changed = 'hacked';
    const r2 = loader.getLastResult();
    assert.strictEqual(r2.changed, true);
});

test('52. Requested day is URL encoded.', async () => {
    const mocks = createMocks();
    let reqUrl = '';
    mocks.api.request = async (url) => { reqUrl = url; throw new Error('stop'); };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, day: 'salı günü' });
    await loader.load();
    assert.strictEqual(reqUrl.includes('sal%C4%B1%20g%C3%BCn%C3%BC'), true);
});

test('53. Default endpoint and day are used.', async () => {
    const mocks = createMocks();
    let reqUrl = '';
    mocks.api.request = async (url) => { reqUrl = url; throw new Error('stop'); };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger });
    await loader.load();
    assert.strictEqual(reqUrl, '/schedule/normalized?day=weekday');
});

test('54. Custom endpoint and day are supported.', async () => {
    const mocks = createMocks();
    let reqUrl = '';
    mocks.api.request = async (url) => { reqUrl = url; throw new Error('stop'); };
    const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, endpoint: '/api/v2/sch', day: 'monday' });
    await loader.load();
    assert.strictEqual(reqUrl, '/api/v2/sch?day=monday');
});

test('55. Timeout timer does not remain pending after early rejection.', async () => {
    const { createDashboardScheduleLoader } = require('../public/js/dashboard-schedule-loader');
    
    // We mock global.setTimeout and global.clearTimeout to spy on them
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    let timeoutCreated = false;
    let timeoutCleared = false;
    let capturedId = null;

    global.setTimeout = (fn, ms) => {
        timeoutCreated = true;
        capturedId = originalSetTimeout(fn, ms);
        return capturedId;
    };
    global.clearTimeout = (id) => {
        if (id === capturedId && capturedId !== null) {
            timeoutCleared = true;
        }
        originalClearTimeout(id);
    };

    try {
        const mocks = {
            api: { request: async () => { throw new Error('Early transport rejection'); } },
            scheduleManager: { getScheduleSource: () => 'fallback', getActiveSchedule: () => ({}), setExternalSchedule: () => {}, clearExternalSchedule: () => {} },
            logger: { warn: () => {} }
        };
        const loader = createDashboardScheduleLoader({ api: mocks.api, scheduleManager: mocks.scheduleManager, logger: mocks.logger, timeoutMs: 10000 });
        await loader.load();
        
        // Assertions
        assert.strictEqual(timeoutCreated, true, 'timeout was created');
        assert.strictEqual(timeoutCleared, true, 'timeout was cleared');
    } finally {
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    }
});
