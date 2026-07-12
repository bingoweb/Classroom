const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Helper to load the module in an isolated VM context to reset state
function loadIsolatedManager() {
    const normalizerCode = fs.readFileSync(path.join(__dirname, '../public/js/schedule-normalizer.js'), 'utf8');
    const managerCode = fs.readFileSync(path.join(__dirname, '../public/js/schedule-manager.js'), 'utf8');
    
    const context = { window: {}, module: { exports: {} }, require: () => {} };
    vm.createContext(context);
    vm.runInContext(normalizerCode, context);
    
    // Provide the normalizer via window to simulate browser or node require behavior depending on implementation
    context.window.ScheduleNormalizer = context.window.ScheduleNormalizer;
    
    vm.runInContext(managerCode, context);
    return {
        manager: context.module.exports || context.window.ScheduleManager,
        window: context.window
    };
}

test('1. Default source is fallback', () => {
    const { manager } = loadIsolatedManager();
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
});

test('2. Default active schedule matches SCHOOL_SCHEDULE', () => {
    const { manager } = loadIsolatedManager();
    assert.deepStrictEqual(manager.getActiveSchedule(), manager.SCHOOL_SCHEDULE);
});

test('3. Valid canonical external schedule is accepted', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(manager.getScheduleSource(), 'external');
});

test('4. Alias fields and Turkish type aliases are accepted', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { course: 'Ext 1', period_type: 'ders', start_time: '08:00', end_time: '08:40' },
        { course: 'Ext 2', period_type: 'lesson', start_time: '08:40', end_time: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(manager.getActiveSchedule().schoolEnd, '09:30');
});

test('5. Unsorted input is normalized before activation', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' },
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(manager.getActiveSchedule().periods[0].name, 'Ext 1');
});

test('6. External schedule derives schoolStart from the first period', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '07:30', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    manager.setExternalSchedule(rows);
    assert.strictEqual(manager.getActiveSchedule().schoolStart, '07:30');
});

test('7. External schedule derives schoolEnd from the last period', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '07:30', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '10:15' }
    ];
    manager.setExternalSchedule(rows);
    assert.strictEqual(manager.getActiveSchedule().schoolEnd, '10:15');
});

test('8. Empty input is rejected and fallback remains active', () => {
    const { manager } = loadIsolatedManager();
    const res = manager.setExternalSchedule([]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
});

test('9. Non-array input is rejected without throwing', () => {
    const { manager } = loadIsolatedManager();
    const res = manager.setExternalSchedule({ foo: 'bar' });
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
});

test('10. Overlapping input is rejected', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:30', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, false);
});

test('11. A schedule containing an uncovered gap is rejected with SCHEDULE_GAP', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:50', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'SCHEDULE_GAP');
});

test('12. A schedule containing only breaks is rejected', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'break', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'break', start: '08:40', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'No lessons found');
});

test('13. Exact duplicate periods do not corrupt the accepted schedule', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(manager.getActiveSchedule().periods.length, 2);
});

test('14. Invalid replacement after a valid external schedule restores fallback', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    manager.setExternalSchedule(rows);
    const res = manager.setExternalSchedule([]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
    assert.deepStrictEqual(manager.getActiveSchedule(), manager.SCHOOL_SCHEDULE);
});

test('15. Gap replacement after a valid external schedule restores fallback', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    manager.setExternalSchedule(rows);
    const rowsGap = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:50', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rowsGap);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
});

test('16. clearExternalSchedule() restores fallback', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    manager.setExternalSchedule(rows);
    const res = manager.clearExternalSchedule();
    assert.strictEqual(manager.getScheduleSource(), 'fallback');
    assert.strictEqual(res.fallbackActive, true);
});

test('17. getActiveSchedule() returns a defensive copy', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    manager.setExternalSchedule(rows);
    const active = manager.getActiveSchedule();
    active.periods[0].start = '00:00';
    active.schoolStart = '00:00';
    active.periods.pop();
    
    const freshActive = manager.getActiveSchedule();
    assert.strictEqual(freshActive.periods[0].start, '08:00');
    assert.strictEqual(freshActive.schoolStart, '08:00');
    assert.strictEqual(freshActive.periods.length, 2);
});

test('18. Mutating the successful response schedule does not mutate active state', () => {
    const { manager } = loadIsolatedManager();
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    res.schedule.periods[0].start = '00:00';
    
    const active = manager.getActiveSchedule();
    assert.strictEqual(active.periods[0].start, '08:00');
});

test('19. Mutating a rejected response schedule does not mutate SCHOOL_SCHEDULE', () => {
    const { manager } = loadIsolatedManager();
    const res = manager.setExternalSchedule([]);
    res.schedule.periods[0].start = '00:00';
    
    assert.strictEqual(manager.SCHOOL_SCHEDULE.periods[0].start, '09:00');
});

test('20. Input arrays and nested input objects are not mutated', () => {
    const { manager } = loadIsolatedManager();
    const rows = Object.freeze([
        Object.freeze({ name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }),
        Object.freeze({ name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' })
    ]);
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
});

test('21. Normalizer result is not mutated during accepted integration', () => {
    const { manager, window } = loadIsolatedManager();
    const originalNormalize = window.ScheduleNormalizer.normalizeSchedule;
    window.ScheduleNormalizer.normalizeSchedule = function(r) {
        const result = originalNormalize(r);
        return new Proxy(result, {
            set: function() { throw new Error('Mutation detected'); },
            get: function(target, prop) {
                if (prop === 'errors') {
                    return new Proxy(target[prop], {
                        get: function(targetArr, propArr) {
                            if (propArr === 'push') throw new Error('Mutation detected');
                            return targetArr[propArr];
                        }
                    });
                }
                return target[prop];
            }
        });
    };
    const rows = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:40', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rows);
    assert.strictEqual(res.accepted, true);
});

test('22. Normalizer result is not mutated during gap rejection', () => {
    const { manager, window } = loadIsolatedManager();
    const originalNormalize = window.ScheduleNormalizer.normalizeSchedule;
    window.ScheduleNormalizer.normalizeSchedule = function(r) {
        const result = originalNormalize(r);
        return new Proxy(result, {
            set: function() { throw new Error('Mutation detected'); },
            get: function(target, prop) {
                if (prop === 'errors') {
                    return new Proxy(target[prop], {
                        get: function(targetArr, propArr) {
                            if (propArr === 'push') throw new Error('Mutation detected');
                            return targetArr[propArr];
                        }
                    });
                }
                return target[prop];
            }
        });
    };
    const rowsGap = [
        { name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' },
        { name: 'Ext 2', type: 'class', start: '08:50', end: '09:30' }
    ];
    const res = manager.setExternalSchedule(rowsGap);
    assert.strictEqual(res.accepted, false);
});

test('23. A thrown normalizer exception returns SCHEDULE_VALIDATION_EXCEPTION', () => {
    const { manager, window } = loadIsolatedManager();
    window.ScheduleNormalizer.normalizeSchedule = function() {
        throw new Error('Crash');
    };
    const res = manager.setExternalSchedule([{ name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'SCHEDULE_VALIDATION_EXCEPTION');
});

test('24. Existing before-school status still works', () => {
    const { manager } = loadIsolatedManager();
    let mockDate = new Date('2024-01-01T08:00:00');
    let status = manager.getScheduleStatus(mockDate);
    assert.strictEqual(status.mode, 'before-school');
});

test('25. Existing in-class status still works', () => {
    const { manager } = loadIsolatedManager();
    let mockDate = new Date('2024-01-01T09:10:00');
    let status = manager.getScheduleStatus(mockDate);
    assert.strictEqual(status.mode, 'in-class');
});

test('26. Existing in-break status still works', () => {
    const { manager } = loadIsolatedManager();
    let mockDate = new Date('2024-01-01T09:45:00');
    let status = manager.getScheduleStatus(mockDate);
    assert.strictEqual(status.mode, 'in-break');
});

test('27. Existing after-school status still works', () => {
    const { manager } = loadIsolatedManager();
    let mockDate = new Date('2024-01-01T15:00:00');
    let status = manager.getScheduleStatus(mockDate);
    assert.strictEqual(status.mode, 'after-school');
});

test('28. Existing weekend status still works', () => {
    const { manager } = loadIsolatedManager();
    let mockDate = new Date('2024-01-06T10:00:00');
    let status = manager.getScheduleStatus(mockDate);
    assert.strictEqual(status.mode, 'weekend');
});

test('29. Browser-style export works', () => {
    const { window } = loadIsolatedManager();
    assert.ok(window.ScheduleManager);
});

test('30. Node.js export works', () => {
    const { manager } = loadIsolatedManager();
    assert.ok(manager);
});

test('31. Malformed normalizer result: null', () => {
    const { manager, window } = loadIsolatedManager();
    window.ScheduleNormalizer.normalizeSchedule = function() {
        return null;
    };
    const res = manager.setExternalSchedule([{ name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_NORMALIZER_RESULT');
});

test('32. Malformed normalizer result: {}', () => {
    const { manager, window } = loadIsolatedManager();
    window.ScheduleNormalizer.normalizeSchedule = function() {
        return {};
    };
    const res = manager.setExternalSchedule([{ name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_NORMALIZER_RESULT');
});

test('33. Malformed normalizer result: { valid: true, periods: null }', () => {
    const { manager, window } = loadIsolatedManager();
    window.ScheduleNormalizer.normalizeSchedule = function() {
        return { valid: true, periods: null, warnings: [], errors: [] };
    };
    const res = manager.setExternalSchedule([{ name: 'Ext 1', type: 'class', start: '08:00', end: '08:40' }]);
    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.reason, 'INVALID_NORMALIZER_RESULT');
});
