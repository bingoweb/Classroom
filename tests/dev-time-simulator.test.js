const test = require('node:test');
const assert = require('node:assert/strict');

let simulator;

test('1. Module can be required in Node without window or document', () => {
    simulator = require('../public/js/dev-time-simulator.js');
    assert.ok(simulator);
    assert.ok(simulator.resolveSemanticPresetDate);
});

// A standard test schedule mock
const mockSchedule = {
    schoolStart: '09:00',
    schoolEnd: '14:30',
    periods: [
        { type: 'class', start: '09:00', end: '09:40', name: '1. Ders' },
        { type: 'break', start: '09:40', end: '09:55', name: '1. Teneffüs', duration: 15 },
        { type: 'class', start: '09:55', end: '10:35', name: '2. Ders' },
        { type: 'break', start: '10:35', end: '10:50', name: '2. Teneffüs', duration: 15 },
        { type: 'class', start: '10:50', end: '11:30', name: '3. Ders' },
        { type: 'break', start: '11:30', end: '12:20', name: 'Öğle', duration: 50 },
        { type: 'class', start: '12:20', end: '13:00', name: '4. Ders' },
        { type: 'break', start: '13:00', end: '13:50', name: 'Öğle2', duration: 50 }, // same duration, later
        { type: 'class', start: '13:50', end: '14:30', name: '5. Ders' },
    ]
};

test('2. before-school resolves 30 minutes before fallback start', () => {
    const res = simulator.resolveSemanticPresetDate('before-school', mockSchedule);
    // 09:00 - 30 = 08:30
    assert.strictEqual(res.getHours(), 8);
    assert.strictEqual(res.getMinutes(), 30);
});

test('3. first-class resolves to first class midpoint', () => {
    const res = simulator.resolveSemanticPresetDate('first-class', mockSchedule);
    // 09:00 to 09:40 -> 09:20
    assert.strictEqual(res.getHours(), 9);
    assert.strictEqual(res.getMinutes(), 20);
});

test('4. first-break resolves to first break midpoint', () => {
    const res = simulator.resolveSemanticPresetDate('first-break', mockSchedule);
    // 09:40 to 09:55 -> 09:47 (15/2 = 7.5 -> 7 rounded down)
    assert.strictEqual(res.getHours(), 9);
    assert.strictEqual(res.getMinutes(), 47);
});

test('5. second-class resolves to second class midpoint', () => {
    const res = simulator.resolveSemanticPresetDate('second-class', mockSchedule);
    // 09:55 to 10:35 -> 10:15
    assert.strictEqual(res.getHours(), 10);
    assert.strictEqual(res.getMinutes(), 15);
});

test('6. longest-break resolves to the longest break midpoint', () => {
    const res = simulator.resolveSemanticPresetDate('longest-break', mockSchedule);
    // Öğle is 50 mins: 11:30 to 12:20 -> 11:55
    assert.strictEqual(res.getHours(), 11);
    assert.strictEqual(res.getMinutes(), 55);
});

test('7. Equal longest breaks choose the earliest', () => {
    const res = simulator.resolveSemanticPresetDate('longest-break', mockSchedule);
    // We have Öğle (11:30-12:20) and Öğle2 (13:00-13:50). It should pick Öğle.
    assert.strictEqual(res.getHours(), 11);
    assert.strictEqual(res.getMinutes(), 55);
});

test('8. last-class resolves to final class midpoint', () => {
    const res = simulator.resolveSemanticPresetDate('last-class', mockSchedule);
    // 13:50 to 14:30 -> 14:10
    assert.strictEqual(res.getHours(), 14);
    assert.strictEqual(res.getMinutes(), 10);
});

test('9. after-school resolves 30 minutes after school end', () => {
    const res = simulator.resolveSemanticPresetDate('after-school', mockSchedule);
    // 14:30 + 30 = 15:00
    assert.strictEqual(res.getHours(), 15);
    assert.strictEqual(res.getMinutes(), 0);
});

test('10. weekend resolves to Saturday at 10:00 local time', () => {
    const res = simulator.resolveSemanticPresetDate('weekend', mockSchedule);
    assert.strictEqual(res.getDay(), 6); // Saturday
    assert.strictEqual(res.getHours(), 10);
    assert.strictEqual(res.getMinutes(), 0);
});

test('11. A custom external schedule produces different semantic times', () => {
    const custom = {
        schoolStart: '08:00',
        schoolEnd: '12:00',
        periods: [
            { type: 'class', start: '08:00', end: '12:00' }
        ]
    };
    const res1 = simulator.resolveSemanticPresetDate('first-class', custom);
    assert.strictEqual(res1.getHours(), 10); // 08:00 to 12:00 -> 10:00
    assert.strictEqual(res1.getMinutes(), 0);

    const res2 = simulator.resolveSemanticPresetDate('before-school', custom);
    assert.strictEqual(res2.getHours(), 7); // 08:00 - 30 -> 07:30
    assert.strictEqual(res2.getMinutes(), 30);
});

test('12. Resolving schedule A and then schedule B does not reuse stale data', () => {
    const schA = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const schB = { schoolStart: '10:00', schoolEnd: '11:00', periods: [{ type: 'class', start: '10:00', end: '11:00' }] };

    const resA = simulator.resolveSemanticPresetDate('first-class', schA);
    assert.strictEqual(resA.getHours(), 9);
    assert.strictEqual(resA.getMinutes(), 30);

    const resB = simulator.resolveSemanticPresetDate('first-class', schB);
    assert.strictEqual(resB.getHours(), 10);
    assert.strictEqual(resB.getMinutes(), 30);
});

test('13. Missing first break returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-break', sch);
    assert.strictEqual(res, null);
});

test('14. Missing second class returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('second-class', sch);
    assert.strictEqual(res, null);
});

test('15. Missing last class returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'break', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('last-class', sch);
    assert.strictEqual(res, null);
});

test('16. Invalid schoolStart returns null', () => {
    const sch = { schoolStart: 'invalid', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('before-school', sch);
    assert.strictEqual(res, null);
});

test('17. Invalid schoolEnd returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: 'foo', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('after-school', sch);
    assert.strictEqual(res, null);
});

test('18. Invalid period time returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:xx', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(res, null);
});

test('19. Zero-duration period returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '09:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(res, null);
});

test('20. Unknown semantic preset returns null', () => {
    const res = simulator.resolveSemanticPresetDate('foo-bar', mockSchedule);
    assert.strictEqual(res, null);
});

test('21. The supplied schedule is not mutated', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:00' }] };
    const schJson = JSON.stringify(sch);
    simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(JSON.stringify(sch), schJson);
});

test('22. A midnight-crossing before-school calculation remains on a weekday because of the chosen anchor strategy', () => {
    // 00:15 - 30 minutes = -15 minutes -> 23:45 the previous day
    const sch = { schoolStart: '00:15', schoolEnd: '10:00', periods: [{ type: 'class', start: '00:15', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('before-school', sch);
    assert.strictEqual(res.getHours(), 23);
    assert.strictEqual(res.getMinutes(), 45);
    // Tuesday (2) minus 1 day is Monday (1), still a weekday!
    assert.strictEqual(res.getDay(), 1); 
});

test('23. A late after-school calculation produces a valid local date', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '23:45', periods: [{ type: 'class', start: '09:00', end: '23:45' }] };
    const res = simulator.resolveSemanticPresetDate('after-school', sch);
    // 23:45 + 30 = 24:15 -> 00:15 next day
    assert.strictEqual(res.getHours(), 0);
    assert.strictEqual(res.getMinutes(), 15);
    // Tuesday + 1 = Wednesday (3)
    assert.strictEqual(res.getDay(), 3);
});

test('24. Midpoints with fractional minutes round down', () => {
    // e.g. 09:00 to 09:05 = midpoint 2.5 mins -> 09:02
    const sch = { schoolStart: '09:00', schoolEnd: '09:05', periods: [{ type: 'class', start: '09:00', end: '09:05' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(res.getHours(), 9);
    assert.strictEqual(res.getMinutes(), 2);
});

test('25. Weekend resolves with null schedule', () => {
    const res = simulator.resolveSemanticPresetDate('weekend', null);
    assert.ok(res);
    assert.strictEqual(res.getDay(), 6);
    assert.strictEqual(res.getHours(), 10);
    assert.strictEqual(res.getMinutes(), 0);
});

test('26. Weekend resolves with missing periods', () => {
    const res = simulator.resolveSemanticPresetDate('weekend', {});
    assert.ok(res);
    assert.strictEqual(res.getDay(), 6);
});

test('27. 24:00 school start is rejected', () => {
    const sch = { schoolStart: '24:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '24:00', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('before-school', sch), null);
});

test('28. 25:00 school start is rejected', () => {
    const sch = { schoolStart: '25:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '25:00', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('before-school', sch), null);
});

test('29. 09:60 school start is rejected', () => {
    const sch = { schoolStart: '09:60', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:60', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('before-school', sch), null);
});

test('30. 09:5 school start is rejected', () => {
    const sch = { schoolStart: '09:5', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:5', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('before-school', sch), null);
});

test('31. 09:30:00 school start is rejected', () => {
    const sch = { schoolStart: '09:30:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:30:00', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('before-school', sch), null);
});

test('32. Invalid school-end range is rejected', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '30:00', periods: [{ type: 'class', start: '09:00', end: '30:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('after-school', sch), null);
});

test('33. Invalid period-hour range is rejected', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '99:00', end: '10:00' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('first-class', sch), null);
});

test('34. Invalid period-minute range is rejected', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [{ type: 'class', start: '09:00', end: '10:99' }] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('first-class', sch), null);
});

test('35. A null period entry does not throw', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [null, { type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.ok(res);
});

test('36. A primitive period entry does not throw', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: ['invalid string', { type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.ok(res);
});

test('37. Valid periods after malformed entries can still be resolved', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [null, 42, { type: 'class', start: '09:00', end: '10:00' }] };
    const res = simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(res.getHours(), 9);
    assert.strictEqual(res.getMinutes(), 30);
});

test('38. An entirely malformed period array returns null', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [null, undefined, 42] };
    assert.strictEqual(simulator.resolveSemanticPresetDate('first-class', sch), null);
});

test('39. Longest-break ignores malformed and non-positive break periods', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '12:00', periods: [
        null,
        { type: 'break', start: '09:00', end: '08:00' },
        { type: 'break', start: '09:00', end: '09:00' },
        { type: 'break', start: '09:00', end: '09:10' }
    ] };
    const res = simulator.resolveSemanticPresetDate('longest-break', sch);
    assert.strictEqual(res.getHours(), 9);
    assert.strictEqual(res.getMinutes(), 5);
});

test('40. Availability helper marks weekend available without a schedule, if the helper is introduced', () => {
    assert.strictEqual(simulator.isSemanticPresetAvailable('weekend', null), true);
    assert.strictEqual(simulator.isSemanticPresetAvailable('weekend', undefined), true);
    assert.strictEqual(simulator.isSemanticPresetAvailable('real-time', null), true);
});

test('41. Availability helper rejects unknown identifiers, if introduced', () => {
    assert.strictEqual(simulator.isSemanticPresetAvailable('unknown-preset', mockSchedule), false);
});

test('42. Repeated calls do not mutate malformed input schedules', () => {
    const sch = { schoolStart: '09:00', schoolEnd: '10:00', periods: [null, { type: 'class', start: '09:00', end: '10:00' }] };
    const jsonStr = JSON.stringify(sch);
    simulator.resolveSemanticPresetDate('first-class', sch);
    simulator.resolveSemanticPresetDate('first-class', sch);
    assert.strictEqual(JSON.stringify(sch), jsonStr);
});
