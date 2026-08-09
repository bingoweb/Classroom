const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public/admin/admin.js');
const htmlPath = path.join(root, 'public/admin/index.html');
const attendancePath = path.join(root, 'public/admin/js/attendance.js');

test('P3-5B3 extracts admin attendance behavior into a classic-script module', () => {
    assert.strictEqual(
        fs.existsSync(attendancePath),
        true,
        'public/admin/js/attendance.js must exist'
    );

    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const htmlSource = fs.readFileSync(htmlPath, 'utf8');
    const attendanceSource = fs.readFileSync(attendancePath, 'utf8');

    const rolesScript = '<script src="js/roles.js"></script>';
    const attendanceScript = '<script src="js/attendance.js"></script>';
    const adminScript = '<script src="admin.js"></script>';

    assert.ok(htmlSource.includes(attendanceScript), 'admin HTML loads attendance.js');
    assert.ok(
        htmlSource.indexOf(rolesScript) < htmlSource.indexOf(attendanceScript),
        'attendance.js loads after roles.js'
    );
    assert.ok(
        htmlSource.indexOf(attendanceScript) < htmlSource.indexOf(adminScript),
        'attendance.js loads before admin.js'
    );

    assert.match(attendanceSource, /window\.AdminAttendance\s*=\s*\{/);
    assert.match(attendanceSource, /Utils\.getIstanbulDateKey\(\)/);
    assert.match(attendanceSource, /loadAttendanceForDate/);
    assert.match(attendanceSource, /renderAttendanceList/);
    assert.match(attendanceSource, /updateAttendanceSummary/);
    assert.match(attendanceSource, /saveAttendance/);
    assert.match(attendanceSource, /window\.setTodayDate\s*=\s*setTodayDate/);
    assert.match(attendanceSource, /window\.loadAttendanceForDate\s*=\s*loadAttendanceForDate/);
    assert.match(attendanceSource, /window\.saveAttendance\s*=\s*saveAttendance/);

    assert.match(adminSource, /AdminAttendance\.init\(\)/);

    assert.doesNotMatch(adminSource, /window\.setTodayDate\s*=/);
    assert.doesNotMatch(adminSource, /window\.loadAttendanceForDate\s*=/);
    assert.doesNotMatch(adminSource, /function renderAttendanceList\(/);
    assert.doesNotMatch(adminSource, /function updateAttendanceSummary\(/);
    assert.doesNotMatch(adminSource, /window\.saveAttendance\s*=/);
});

test('attendance avatar rendering does not create protocol-relative //uploads URLs', () => {
    const attendanceList = { innerHTML: '' };
    const attendanceSource = fs.readFileSync(attendancePath, 'utf8');
    const context = {
        window: {},
        document: {
            getElementById(id) {
                if (id === 'attendanceList') return attendanceList;
                return { value: '', innerHTML: '', textContent: '' };
            },
            querySelectorAll() {
                return [];
            }
        },
        Utils: {
            getAvatarPath(student) {
                return student.photo || '/assets/default_boy.png';
            },
            normalizePath(value) {
                return value;
            },
            escapeHtml(value) {
                return String(value);
            }
        },
        console,
        fetch: async () => { throw new Error('unexpected fetch'); }
    };

    vm.runInNewContext(attendanceSource, context, { filename: 'attendance.js' });
    context.window.AdminAttendance.renderAttendanceList([
        { id: 1, name: 'Test Öğrenci', gender: 'M', photo: '/uploads/student.jpg' }
    ], {});

    assert.match(attendanceList.innerHTML, /src="\.\.\/uploads\/student\.jpg"/);
    assert.doesNotMatch(attendanceList.innerHTML, /src="\.\.\/\/uploads\//,
        'attendance must not prepend ../ to an already absolute avatar path');
});
