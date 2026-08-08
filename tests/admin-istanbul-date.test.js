const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const Utils = require('../public/js/utils.js');

test('Admin Istanbul date contract', async (t) => {
    await t.test('shared Utils exposes an Istanbul calendar-date helper', () => {
        assert.strictEqual(typeof Utils.getIstanbulDateKey, 'function');
    });

    await t.test('UTC previous-day instant maps to the next Istanbul day', () => {
        const instant = new Date('2026-08-08T21:30:00.000Z');
        assert.strictEqual(Utils.getIstanbulDateKey(instant), '2026-08-09');
    });

    await t.test('instant just before Istanbul midnight stays on the same local day', () => {
        const instant = new Date('2026-08-08T20:59:59.999Z');
        assert.strictEqual(Utils.getIstanbulDateKey(instant), '2026-08-08');
    });

    await t.test('year boundary uses Istanbul date rather than UTC date', () => {
        const instant = new Date('2026-12-31T21:15:00.000Z');
        assert.strictEqual(Utils.getIstanbulDateKey(instant), '2027-01-01');
    });

    await t.test('invalid input is rejected instead of silently producing a wrong date', () => {
        assert.throws(() => Utils.getIstanbulDateKey('2026-08-08'), TypeError);
        assert.throws(() => Utils.getIstanbulDateKey(new Date('invalid')), TypeError);
    });

    await t.test('admin setTodayDate uses Utils.getIstanbulDateKey and loads that date', async () => {
        const adminSource = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        const start = adminSource.indexOf('window.setTodayDate = function () {');
        const end = adminSource.indexOf('\n};', start);
        assert.notStrictEqual(start, -1, 'setTodayDate definition should exist');
        assert.notStrictEqual(end, -1, 'setTodayDate definition should close');
        const functionSource = adminSource.slice(start, end + 3);

        let loaded = 0;
        const attendanceDate = { value: '' };
        const sandbox = {
            window: {},
            document: {
                getElementById(id) {
                    if (id === 'attendanceDate') return attendanceDate;
                    return null;
                }
            },
            Utils: {
                getIstanbulDateKey() {
                    return '2026-08-09';
                }
            },
            loadAttendanceForDate() {
                loaded++;
            }
        };
        vm.createContext(sandbox);
        vm.runInContext(functionSource, sandbox);

        sandbox.window.setTodayDate();

        assert.strictEqual(attendanceDate.value, '2026-08-09');
        assert.strictEqual(loaded, 1);
    });

    await t.test('admin source no longer derives attendance today from UTC toISOString', () => {
        const adminSource = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        const start = adminSource.indexOf('window.setTodayDate = function () {');
        const end = adminSource.indexOf('\n};', start);
        const functionSource = adminSource.slice(start, end + 3);
        assert.ok(!functionSource.includes('toISOString()'));
        assert.ok(functionSource.includes('Utils.getIstanbulDateKey()'));
    });
});
