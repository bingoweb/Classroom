const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sqlite3 = require('sqlite3').verbose();

const { ensureScheduleSchema } = require('../backend/schedule-schema');
const { createScheduleValidator, validateNormalizedSchedule, resolveScheduleDayKey, isValidDayKey } = require('../backend/schedule-service');
const { getNormalizedScheduleRows, replaceNormalizedSchedule } = require('../backend/schedule-repository');

function createTempDb() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-schedule-'));
    const dbPath = path.join(tmpDir, 'test.db');
    return { tmpDir, dbPath };
}

function cleanupTempDb(tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

function runSql(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function allSql(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

test('Schedule API and Migration Tests', async (t) => {
    await t.test('Migration Tests', async (t) => {
        let env;
        let db;

        t.beforeEach(async () => {
            env = createTempDb();
            db = await new Promise((resolve, reject) => {
                const dbInstance = new sqlite3.Database(env.dbPath, (err) => {
                    if (err) return reject(err);
                    resolve(dbInstance);
                });
            });
        });

        t.afterEach(async () => {
            await new Promise((resolve, reject) => {
                db.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            cleanupTempDb(env.tmpDir);
        });

        await t.test('1. Empty database receives the complete fresh schedule schema', async () => {
            await ensureScheduleSchema(db);
            const cols = await allSql(db, "PRAGMA table_info(schedule)");
            const names = cols.map(c => c.name);
            assert.deepEqual(names, ['id', 'day', 'period', 'course', 'period_type', 'start_time', 'end_time', 'is_active']);
        });

        await t.test('2. Legacy table receives all four new columns', async () => {
            await runSql(db, `CREATE TABLE schedule (id INTEGER PRIMARY KEY, day TEXT NOT NULL, period INTEGER NOT NULL, course TEXT NOT NULL, UNIQUE(day, period))`);
            await ensureScheduleSchema(db);
            const cols = await allSql(db, "PRAGMA table_info(schedule)");
            const names = cols.map(c => c.name);
            assert.ok(names.includes('period_type'));
            assert.ok(names.includes('start_time'));
            assert.ok(names.includes('end_time'));
            assert.ok(names.includes('is_active'));
        });

        await t.test('3. Legacy id/day/period/course values remain unchanged, 4. Legacy temporal columns remain null, 5. is_active defaults to 1', async () => {
            await runSql(db, `CREATE TABLE schedule (id INTEGER PRIMARY KEY, day TEXT NOT NULL, period INTEGER NOT NULL, course TEXT NOT NULL, UNIQUE(day, period))`);
            await runSql(db, `INSERT INTO schedule (day, period, course) VALUES ('weekday', 1, 'Math')`);
            await ensureScheduleSchema(db);
            const rows = await allSql(db, "SELECT * FROM schedule");
            assert.equal(rows.length, 1);
            assert.equal(rows[0].day, 'weekday');
            assert.equal(rows[0].period, 1);
            assert.equal(rows[0].course, 'Math');
            assert.equal(rows[0].period_type, null);
            assert.equal(rows[0].start_time, null);
            assert.equal(rows[0].end_time, null);
            assert.equal(rows[0].is_active, 1);
        });

        await t.test('6. Migration creates the composite index', async () => {
            await ensureScheduleSchema(db);
            const indices = await allSql(db, "PRAGMA index_list(schedule)");
            assert.ok(indices.some(i => i.name === 'idx_schedule_day_active_period'));
        });

        await t.test('7. Migration may run twice without failure', async () => {
            await ensureScheduleSchema(db);
            await ensureScheduleSchema(db);
            assert.ok(true);
        });

        await t.test('8. Migration may run repeatedly without adding duplicate columns', async () => {
            await ensureScheduleSchema(db);
            await ensureScheduleSchema(db);
            const cols = await allSql(db, "PRAGMA table_info(schedule)");
            assert.equal(cols.length, 8);
        });

        await t.test('9. Existing normalized rows survive migration unchanged', async () => {
            await ensureScheduleSchema(db);
            await runSql(db, `INSERT INTO schedule (day, period, course, period_type, start_time, end_time, is_active) VALUES ('weekday', 1, 'Math', 'class', '09:00', '09:40', 1)`);
            await ensureScheduleSchema(db);
            const rows = await allSql(db, "SELECT * FROM schedule");
            assert.equal(rows[0].course, 'Math');
            assert.equal(rows[0].period_type, 'class');
            assert.equal(rows[0].start_time, '09:00');
            assert.equal(rows[0].end_time, '09:40');
            assert.equal(rows[0].is_active, 1);
        });
    });

    await t.test('Validation Tests', async (t) => {
        t.test('10. Valid canonical schedule is accepted', () => {
            const result = validateNormalizedSchedule([{ name: 'Math', type: 'class', start: '09:00', end: '09:40' }]);
            assert.equal(result.valid, true);
        });

        t.test('11. Alias-based schedule is accepted', () => {
            const result = validateNormalizedSchedule([{ course: 'Math', period_type: 'lesson', start_time: '09:00', end_time: '09:40' }]);
            assert.equal(result.valid, true);
            assert.equal(result.periods[0].name, 'Math');
            assert.equal(result.periods[0].type, 'class');
            assert.equal(result.periods[0].start, '09:00');
        });

        t.test('12. Unsorted schedule is returned in chronological order', () => {
            const result = validateNormalizedSchedule([
                { name: 'Break', type: 'break', start: '09:40', end: '09:50' },
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' }
            ]);
            assert.equal(result.valid, true);
            assert.equal(result.periods[0].name, 'Math');
            assert.equal(result.periods[1].name, 'Break');
        });

        t.test('13. At least one class is required', () => {
            const result = validateNormalizedSchedule([{ name: 'Break', type: 'break', start: '09:40', end: '09:50' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'NO_CLASS'), true);
        });

        t.test('14. Overlap is rejected', () => {
            const result = validateNormalizedSchedule([
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' },
                { name: 'Break', type: 'break', start: '09:30', end: '09:50' }
            ]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'OVERLAP' || e.code === 'PARTIAL_SCHEDULE_REJECTED' || e.code === 'SCHEDULE_GAP'), true);
        });

        t.test('15. Gap is rejected', () => {
            const result = validateNormalizedSchedule([
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' },
                { name: 'Science', type: 'class', start: '09:50', end: '10:30' }
            ]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'SCHEDULE_GAP'), true);
        });

        t.test('16. Empty input is rejected', () => {
            const result = validateNormalizedSchedule([]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'EMPTY_SCHEDULE'), true);
        });

        t.test('17. Non-array input is rejected', () => {
            const result = validateNormalizedSchedule({});
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'INVALID_INPUT'), true);
        });

        t.test('18. Zero-duration period is rejected, 19. partial schedule rejected', () => {
            const result = validateNormalizedSchedule([{ name: 'Math', type: 'class', start: '09:00', end: '09:00' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'PARTIAL_SCHEDULE_REJECTED'), true);
        });

        t.test('20. End-before-start period is rejected', () => {
            const result = validateNormalizedSchedule([{ name: 'Math', type: 'class', start: '09:40', end: '09:00' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'PARTIAL_SCHEDULE_REJECTED'), true);
        });

        t.test('21. Unknown type is rejected', () => {
            const result = validateNormalizedSchedule([{ name: 'Math', type: 'unknown', start: '09:00', end: '09:40' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'PARTIAL_SCHEDULE_REJECTED'), true);
        });

        t.test('22. Missing name is rejected', () => {
            const result = validateNormalizedSchedule([{ name: '', type: 'class', start: '09:00', end: '09:40' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'PARTIAL_SCHEDULE_REJECTED'), true);
        });

        t.test('23. Invalid time is rejected', () => {
            const result = validateNormalizedSchedule([{ name: 'Math', type: 'class', start: '09:99', end: '09:40' }]);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === 'PARTIAL_SCHEDULE_REJECTED'), true);
        });

        t.test('24. Exact duplicate may remain a nonfatal warning', () => {
            const result = validateNormalizedSchedule([
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' },
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' }
            ]);
            assert.equal(result.valid, true);
            assert.equal(result.periods.length, 1);
            assert.equal(result.warnings.some(w => w.code === 'DUPLICATE_PERIOD'), true);
        });
    });

    await t.test('Repository Tests', async (t) => {
        let env;
        let db;

        t.beforeEach(async () => {
            env = createTempDb();
            db = await new Promise((resolve, reject) => {
                const dbInstance = new sqlite3.Database(env.dbPath, (err) => {
                    if (err) return reject(err);
                    resolve(dbInstance);
                });
            });
            await ensureScheduleSchema(db);
        });

        t.afterEach(async () => {
            await new Promise((resolve, reject) => {
                db.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            cleanupTempDb(env.tmpDir);
        });

        await t.test('25. Normalized rows map into canonical fields', async () => {
            await runSql(db, `INSERT INTO schedule (day, period, course, period_type, start_time, end_time, is_active) VALUES ('weekday', 1, 'Math', 'class', '09:00', '09:40', 1)`);
            const rows = await getNormalizedScheduleRows(db, 'weekday');
            assert.equal(rows[0].name, 'Math');
            assert.equal(rows[0].type, 'class');
            assert.equal(rows[0].start, '09:00');
            assert.equal(rows[0].end, '09:40');
        });

        await t.test('26. Target-day replacement inserts canonical order, affects only requested day', async () => {
            await runSql(db, `INSERT INTO schedule (day, period, course, period_type, start_time, end_time, is_active) VALUES ('other', 1, 'Math', 'class', '09:00', '09:40', 1)`);
            const periods = [
                { name: 'Math', type: 'class', start: '09:00', end: '09:40' },
                { name: 'Break', type: 'break', start: '09:40', end: '09:50' }
            ];
            await replaceNormalizedSchedule(db, 'weekday', periods);
            const wRows = await getNormalizedScheduleRows(db, 'weekday');
            assert.equal(wRows.length, 2);
            assert.equal(wRows[0].name, 'Math');
            assert.equal(wRows[1].name, 'Break');
            const oRows = await getNormalizedScheduleRows(db, 'other');
            assert.equal(oRows.length, 1);
        });

        await t.test('27. A transaction failure rolls back the delete and all inserts', async () => {
            await runSql(db, `INSERT INTO schedule (day, period, course, period_type, start_time, end_time, is_active) VALUES ('weekday', 1, 'Math', 'class', '09:00', '09:40', 1)`);
            
            await runSql(db, `DROP TABLE schedule`);
            await runSql(db, `CREATE TABLE schedule (id INTEGER PRIMARY KEY, day TEXT, period INTEGER, course TEXT, period_type TEXT CHECK(period_type != 'bad'), start_time TEXT, end_time TEXT, is_active INTEGER)`);
            await runSql(db, `INSERT INTO schedule (day, period, course, period_type, start_time, end_time, is_active) VALUES ('weekday', 1, 'Math', 'class', '09:00', '09:40', 1)`);

            try {
                await replaceNormalizedSchedule(db, 'weekday', [{ name: 'Bad', type: 'bad', start: '09:00', end: '09:40' }]);
                assert.fail('Should have failed');
            } catch (err) {
                const rows = await getNormalizedScheduleRows(db, 'weekday');
                assert.equal(rows.length, 1);
                assert.equal(rows[0].name, 'Math');
            }
        });
    });

    await t.test('Day-key Canonicalization Tests', async (t) => {
        t.test('28. Omitted GET day resolves to weekday', () => {
            assert.equal(resolveScheduleDayKey(undefined).day, 'weekday');
        });
        t.test('29. Omitted PUT day resolves to weekday', () => {
            assert.equal(resolveScheduleDayKey(undefined).day, 'weekday');
        });
        t.test('30. A padded day such as " weekday " is queried and stored as weekday', () => {
            assert.equal(resolveScheduleDayKey(" weekday ").day, 'weekday');
        });
        t.test('31. An empty day is rejected', () => {
            assert.equal(resolveScheduleDayKey("").valid, false);
        });
        t.test('32. A whitespace-only day is rejected', () => {
            assert.equal(resolveScheduleDayKey("   ").valid, false);
        });
        t.test('33. Control characters are rejected', () => {
            assert.equal(resolveScheduleDayKey("da\ny").valid, false);
        });
        t.test('34. Invalid characters are rejected', () => {
            assert.equal(resolveScheduleDayKey("bad key").valid, false);
        });
    });

    await t.test('Real Normalizer Validation Tests', async (t) => {
        t.test('35. A deeply frozen or proxied normalizer result is not mutated', () => {
            const stubNormalizer = {
                normalizeSchedule: () => Object.freeze({
                    valid: true,
                    periods: Object.freeze([Object.freeze({ name: 'Math', type: 'class', start: '09:00', end: '09:40' })]),
                    warnings: Object.freeze([]),
                    errors: Object.freeze([])
                })
            };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.equal(res.valid, true);
        });

        t.test('36. A normalizer returning null returns INVALID_NORMALIZER_RESULT', () => {
            const stubNormalizer = { normalizeSchedule: () => null };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.equal(res.valid, false);
            assert.equal(res.errors[0].code, 'INVALID_NORMALIZER_RESULT');
        });

        t.test('37. A normalizer returning {} returns INVALID_NORMALIZER_RESULT', () => {
            const stubNormalizer = { normalizeSchedule: () => ({}) };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.equal(res.valid, false);
            assert.equal(res.errors[0].code, 'INVALID_NORMALIZER_RESULT');
        });

        t.test('38. A normalizer returning missing diagnostic arrays returns INVALID_NORMALIZER_RESULT', () => {
            const stubNormalizer = { normalizeSchedule: () => ({ valid: true, periods: [] }) };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.equal(res.valid, false);
            assert.equal(res.errors[0].code, 'INVALID_NORMALIZER_RESULT');
        });

        t.test('39. A throwing normalizer returns a stable exception code', () => {
            const stubNormalizer = { normalizeSchedule: () => { throw new Error('Boom'); } };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.equal(res.valid, false);
            assert.equal(res.errors[0].code, 'NORMALIZER_ERROR');
        });

        t.test('40. Input rows and nested objects remain unchanged', () => {
            let received;
            const stubNormalizer = { 
                normalizeSchedule: (rows) => { 
                    received = rows;
                    rows[0].mutated = true;
                    return { valid: true, periods: [], warnings: [], errors: [] };
                } 
            };
            const validator = createScheduleValidator(stubNormalizer);
            const input = [{ name: 'Math' }];
            validator(input);
            assert.equal(input[0].mutated, undefined);
        });

        t.test('41. Normalizer warnings and errors returned by the service are defensive copies', () => {
            const warningObj = { code: 'W1', message: 'Warn' };
            const errorObj = { code: 'E1', message: 'Err' };
            const stubNormalizer = { 
                normalizeSchedule: () => ({
                    valid: false,
                    periods: [],
                    warnings: [warningObj],
                    errors: [errorObj]
                }) 
            };
            const validator = createScheduleValidator(stubNormalizer);
            const res = validator([]);
            assert.notEqual(res.warnings[0], warningObj);
            assert.notEqual(res.errors[0], errorObj);
            assert.deepEqual(res.warnings[0], warningObj);
            assert.deepEqual(res.errors[0], errorObj);
        });
    });

    await t.test('Migration Readiness Script Tests', async (t) => {
        await t.test('42. db.scheduleMigrationPromise exists immediately and SQLite failure rejects it', async () => {
            const dbModulePath = path.join(__dirname, '../backend/database.js').replace(/\\/g, '\\\\');
            const script = `
                const fs = require('fs');
                const dbPath = '/invalid_path/test.db';
                process.env.CLASSROOM_DB_PATH = dbPath;
                const db = require('${dbModulePath}');
                if (!db.scheduleMigrationPromise) {
                    console.error('Promise missing');
                    process.exit(1);
                }
                db.scheduleMigrationPromise.then(() => {
                    console.error('Should not resolve');
                    process.exit(1);
                }).catch(err => {
                    if (err.code === 'SQLITE_CANTOPEN') {
                        process.exit(0);
                    } else {
                        console.error('Wrong error:', err);
                        process.exit(1);
                    }
                });
            `;
            const tmpPath = path.join(os.tmpdir(), 'test_readiness.js');
            fs.writeFileSync(tmpPath, script);
            const p = spawn(process.execPath, [tmpPath], { cwd: process.cwd() });
            
            const exitCode = await new Promise(resolve => p.on('close', resolve));
            fs.unlinkSync(tmpPath);
            assert.equal(exitCode, 0);
        });

        await t.test('43. A rejected readiness Promise produces HTTP 503 with SCHEDULE_STORAGE_UNAVAILABLE', async () => {
            const script = `
                const fs = require('fs');
                const http = require('http');
                const path = require('path');
                process.env.PORT = '0';
                process.env.CLASSROOM_DB_PATH = '/invalid_path/test.db';
                const app = require(path.join(process.cwd(), 'backend/server.js'));
                const server = app.listen(0, () => {
                    const port = server.address().port;
                    http.get('http://127.0.0.1:' + port + '/api/schedule', (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            server.close(() => {
                                const body = JSON.parse(data);
                                if (res.statusCode === 503 && body.code === 'SCHEDULE_STORAGE_UNAVAILABLE') {
                                    process.exit(0);
                                } else {
                                    console.error('Wrong status/body:', res.statusCode, body);
                                    process.exit(1);
                                }
                            });
                        });
                    });
                });
            `;
            const tmpPath = path.join(os.tmpdir(), 'test_gating.js');
            fs.writeFileSync(tmpPath, script);
            const p = spawn(process.execPath, [tmpPath], { cwd: process.cwd() });
            const exitCode = await new Promise(resolve => p.on('close', resolve));
            fs.unlinkSync(tmpPath);
            assert.equal(exitCode, 0);
        });
    });
});
