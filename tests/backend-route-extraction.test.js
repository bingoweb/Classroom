'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'backend', 'server.js');
const settingsRoutesPath = path.join(root, 'backend', 'routes', 'settings-routes.js');
const systemRoutesPath = path.join(root, 'backend', 'routes', 'system-routes.js');
const scheduleRoutesPath = path.join(root, 'backend', 'routes', 'schedule-routes.js');
const studentRoutesPath = path.join(root, 'backend', 'routes', 'student-routes.js');
const roleRoutesPath = path.join(root, 'backend', 'routes', 'role-routes.js');
const attendanceRoutesPath = path.join(root, 'backend', 'routes', 'attendance-routes.js');

test('P3-5A1 extracts settings and system route registration from server.js', () => {
    assert.equal(
        fs.existsSync(settingsRoutesPath),
        true,
        'backend/routes/settings-routes.js must exist'
    );
    assert.equal(
        fs.existsSync(systemRoutesPath),
        true,
        'backend/routes/system-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const settingsSource = fs.readFileSync(settingsRoutesPath, 'utf8');
    const systemSource = fs.readFileSync(systemRoutesPath, 'utf8');

    assert.match(settingsSource, /function\s+registerSettingsRoutes\s*\(app,\s*deps\)/);
    assert.match(systemSource, /function\s+registerSystemRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerSettingsRoutes\s*\(app,/);
    assert.match(serverSource, /registerSystemRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/settings['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/settings['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/network-info['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/stats['"]/);

    assert.match(settingsSource, /app\.get\(['"]\/api\/settings['"]/);
    assert.match(settingsSource, /app\.post\(['"]\/api\/settings['"]/);
    assert.match(systemSource, /app\.get\(['"]\/api\/network-info['"]/);
    assert.match(systemSource, /app\.get\(['"]\/api\/stats['"]/);
});

test('P3-5A2 extracts schedule route registration and readiness guard from server.js', () => {
    assert.equal(
        fs.existsSync(scheduleRoutesPath),
        true,
        'backend/routes/schedule-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const scheduleSource = fs.readFileSync(scheduleRoutesPath, 'utf8');

    assert.match(scheduleSource, /function\s+registerScheduleRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerScheduleRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /function\s+requireScheduleStorageReady\s*\(/);
    assert.doesNotMatch(serverSource, /app\.use\(['"]\/api\/schedule['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/schedule\/normalized['"]/);
    assert.doesNotMatch(serverSource, /app\.put\(['"]\/api\/schedule\/normalized['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/schedule['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/schedule['"]/);

    assert.match(scheduleSource, /async function requireScheduleStorageReady\s*\(/);
    assert.match(scheduleSource, /app\.use\(['"]\/api\/schedule['"],\s*requireScheduleStorageReady\)/);
    assert.match(scheduleSource, /app\.get\(['"]\/api\/schedule\/normalized['"]/);
    assert.match(scheduleSource, /app\.put\(['"]\/api\/schedule\/normalized['"]/);
    assert.match(scheduleSource, /app\.get\(['"]\/api\/schedule['"]/);
    assert.match(scheduleSource, /app\.post\(['"]\/api\/schedule['"]/);
});

test('P3-5A3 extracts student route registration from server.js', () => {
    assert.equal(
        fs.existsSync(studentRoutesPath),
        true,
        'backend/routes/student-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const studentSource = fs.readFileSync(studentRoutesPath, 'utf8');

    assert.match(studentSource, /function\s+registerStudentRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerStudentRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/students['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/students['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/students\/import['"]/);
    assert.doesNotMatch(serverSource, /app\.delete\(['"]\/api\/students\/:id['"]/);
    assert.doesNotMatch(serverSource, /app\.put\(['"]\/api\/students\/:id\/photo['"]/);

    assert.match(studentSource, /app\.get\(['"]\/api\/students['"]/);
    assert.match(studentSource, /app\.post\(['"]\/api\/students['"]/);
    assert.match(studentSource, /app\.post\(['"]\/api\/students\/import['"]/);
    assert.match(studentSource, /app\.delete\(['"]\/api\/students\/:id['"]/);
    assert.match(studentSource, /app\.put\(['"]\/api\/students\/:id\/photo['"]/);
});

test('P3-5A4 extracts role route registration from server.js', () => {
    assert.equal(
        fs.existsSync(roleRoutesPath),
        true,
        'backend/routes/role-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const roleSource = fs.readFileSync(roleRoutesPath, 'utf8');

    assert.match(roleSource, /function\s+registerRoleRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerRoleRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/roles['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/roles['"]/);
    assert.doesNotMatch(serverSource, /app\.delete\(['"]\/api\/roles\/:id['"]/);

    assert.match(roleSource, /app\.get\(['"]\/api\/roles['"]/);
    assert.match(roleSource, /app\.post\(['"]\/api\/roles['"]/);
    assert.match(roleSource, /app\.delete\(['"]\/api\/roles\/:id['"]/);
});

test('P3-5A5 extracts attendance route registration from server.js', () => {
    assert.equal(
        fs.existsSync(attendanceRoutesPath),
        true,
        'backend/routes/attendance-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const attendanceSource = fs.readFileSync(attendanceRoutesPath, 'utf8');

    assert.match(attendanceSource, /function\s+registerAttendanceRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerAttendanceRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/attendance\/today['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/attendance\/:date['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/attendance['"]/);
    assert.doesNotMatch(serverSource, /app\.put\(['"]\/api\/attendance\/:id['"]/);

    assert.match(attendanceSource, /app\.get\(['"]\/api\/attendance\/today['"]/);
    assert.match(attendanceSource, /app\.get\(['"]\/api\/attendance\/:date['"]/);
    assert.match(attendanceSource, /app\.post\(['"]\/api\/attendance['"]/);
    assert.match(attendanceSource, /app\.put\(['"]\/api\/attendance\/:id['"]/);
});
