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
        const attendanceSource = fs.readFileSync(path.join(__dirname, '../public/admin/js/attendance.js'), 'utf8');
        const requestedUrls = [];
        const attendanceDate = { value: '' };
        const attendanceList = { innerHTML: '' };
        const attendanceSummaryContent = { innerHTML: '' };
        const sandbox = {
            document: {
                getElementById(id) {
                    if (id === 'attendanceDate') return attendanceDate;
                    if (id === 'attendanceList') return attendanceList;
                    if (id === 'attendanceSummaryContent') return attendanceSummaryContent;
                    return null;
                }
            },
            CONFIG: { API_URL: '/api' },
            Utils: {
                getIstanbulDateKey() {
                    return '2026-08-09';
                },
                getAvatarPath() { return 'assets/default_boy.png'; },
                escapeHtml(value) { return String(value); },
                showError() {}
            },
            async fetch(url) {
                requestedUrls.push(url);
                return {
                    async json() { return []; }
                };
            }
        };
        sandbox.window = sandbox;
        vm.createContext(sandbox);
        vm.runInContext(attendanceSource, sandbox);

        sandbox.AdminAttendance.setTodayDate();
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.strictEqual(attendanceDate.value, '2026-08-09');
        assert.deepStrictEqual(requestedUrls, [
            '/api/students',
            '/api/attendance/2026-08-09'
        ]);
    });

    await t.test('admin source no longer derives attendance today from UTC toISOString', () => {
        const attendanceSource = fs.readFileSync(path.join(__dirname, '../public/admin/js/attendance.js'), 'utf8');
        assert.ok(!attendanceSource.includes('toISOString()'));
        assert.ok(attendanceSource.includes('Utils.getIstanbulDateKey()'));
    });
});
