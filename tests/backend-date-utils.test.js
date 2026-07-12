const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { ISTANBUL_TIME_ZONE, getIstanbulDateKey } = require('../backend/date-utils.js');

test('1. ISTANBUL_TIME_ZONE equals Europe/Istanbul', () => {
    assert.strictEqual(ISTANBUL_TIME_ZONE, 'Europe/Istanbul');
});

test('2. A normal daytime instant returns the expected Istanbul date', () => {
    const d = new Date('2026-07-12T12:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-07-12');
});

test('3. 2026-07-12T20:59:59.999Z returns 2026-07-12', () => {
    // Istanbul UTC+3, so 20:59:59.999Z is 23:59:59.999 local
    const d = new Date('2026-07-12T20:59:59.999Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-07-12');
});

test('4. 2026-07-12T21:00:00.000Z returns 2026-07-13', () => {
    // Istanbul UTC+3, so 21:00:00.000Z is 00:00:00 local the next day
    const d = new Date('2026-07-12T21:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-07-13');
});

test('5. An instant whose UTC date is the previous day returns the correct next Istanbul date', () => {
    const d = new Date('2026-07-12T23:30:00.000Z');
    // UTC date is 12, local is 13 (02:30 AM)
    assert.strictEqual(getIstanbulDateKey(d), '2026-07-13');
});

test('6. New Year boundary produces 2026-01-01', () => {
    const d = new Date('2025-12-31T21:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-01-01');
});

test('7. Leap-day boundary produces 2024-02-29 when appropriate', () => {
    // 2024-02-28 21:00 UTC is 2024-02-29 00:00 Istanbul local
    const d = new Date('2024-02-28T21:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2024-02-29');
});

test('8. Summer date conversion is correct', () => {
    // Turkey does not observe DST anymore, always UTC+3
    const d = new Date('2026-07-15T21:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-07-16');
});

test('9. Winter date conversion is correct', () => {
    // Turkey does not observe DST anymore, always UTC+3
    const d = new Date('2026-01-15T21:00:00.000Z');
    assert.strictEqual(getIstanbulDateKey(d), '2026-01-16');
});

test('10. Returned keys always match strict YYYY-MM-DD', () => {
    const d = new Date('2026-07-12T12:00:00.000Z');
    const key = getIstanbulDateKey(d);
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('11. The supplied Date object is not mutated', () => {
    const d = new Date('2026-07-12T12:00:00.000Z');
    const timeBefore = d.getTime();
    getIstanbulDateKey(d);
    assert.strictEqual(d.getTime(), timeBefore);
});

test('12. Invalid Date throws TypeError', () => {
    const d = new Date('invalid date');
    assert.throws(() => getIstanbulDateKey(d), TypeError);
});

test('13. Non-Date input throws TypeError', () => {
    assert.throws(() => getIstanbulDateKey('2026-07-12'), TypeError);
    assert.throws(() => getIstanbulDateKey(123456789), TypeError);
    assert.throws(() => getIstanbulDateKey(null), TypeError);
});

// For host-timezone independence, use subprocesses with controlled environments
function runInTimezone(tz) {
    const script = `
        const { getIstanbulDateKey } = require('./backend/date-utils.js');
        const d = new Date('2026-07-12T21:00:00.000Z'); // Should be 2026-07-13 in Istanbul
        console.log(getIstanbulDateKey(d));
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
        env: {
            ...process.env,
            TZ: tz
        },
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '..') // Run from project root
    });
    return output.trim();
}

test('14. Host timezone UTC does not change the result', () => {
    assert.strictEqual(runInTimezone('UTC'), '2026-07-13');
});

test('15. Host timezone America/Los_Angeles does not change the result', () => {
    assert.strictEqual(runInTimezone('America/Los_Angeles'), '2026-07-13');
});

test('16. Host timezone Asia/Tokyo does not change the result', () => {
    assert.strictEqual(runInTimezone('Asia/Tokyo'), '2026-07-13');
});

test('17. Repeated calls are deterministic', () => {
    const d = new Date('2026-07-12T21:00:00.000Z');
    const res1 = getIstanbulDateKey(d);
    const res2 = getIstanbulDateKey(d);
    const res3 = getIstanbulDateKey(d);
    assert.strictEqual(res1, '2026-07-13');
    assert.strictEqual(res2, '2026-07-13');
    assert.strictEqual(res3, '2026-07-13');
});

// Static wiring checks
test('18. backend/server.js no longer contains new Date().toISOString().split(\\\'T\\\')[0]', () => {
    const serverJsPath = path.resolve(__dirname, '../backend/server.js');
    const content = fs.readFileSync(serverJsPath, 'utf8');
    assert.ok(!content.includes("new Date().toISOString().split('T')[0]"));
});

test('19. /api/stats is wired to getIstanbulDateKey()', () => {
    const serverJsPath = path.resolve(__dirname, '../backend/server.js');
    const content = fs.readFileSync(serverJsPath, 'utf8');
    // We expect it to be used in /api/stats. A simple regex or includes is enough.
    // Ensure the import exists
    assert.ok(content.includes("const { getIstanbulDateKey } = require('./date-utils');"));
    // Ensure it's used
    assert.ok(content.includes("getIstanbulDateKey()"));
});

test('20. /api/attendance/today is wired to getIstanbulDateKey()', () => {
    // Tested by the above, as both will be replaced.
    const serverJsPath = path.resolve(__dirname, '../backend/server.js');
    const content = fs.readFileSync(serverJsPath, 'utf8');
    // Ensure getIstanbulDateKey is used exactly twice for assignments
    const matches = content.match(/const today = getIstanbulDateKey\(\);/g);
    assert.strictEqual(matches.length, 2);
});
