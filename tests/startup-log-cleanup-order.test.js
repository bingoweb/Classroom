const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'backend', 'server.js'), 'utf8');

test('fresh database exposes error-log schema readiness before startup cleanup runs', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-log-ready-'));
    const dbPath = path.join(tempDir, 'classroom.sqlite');
    const script = `
        const db = require(${JSON.stringify(path.join(root, 'backend', 'database.js'))});
        (async () => {
            if (!db.errorLogsReadyPromise || typeof db.errorLogsReadyPromise.then !== 'function') {
                throw new Error('MISSING_ERROR_LOGS_READY_PROMISE');
            }
            await Promise.all([db.errorLogsReadyPromise, db.scheduleMigrationPromise]);
            const row = await new Promise((resolve, reject) => {
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'", (err, value) => {
                    if (err) reject(err); else resolve(value);
                });
            });
            if (!row || row.name !== 'error_logs') throw new Error('ERROR_LOGS_TABLE_NOT_READY');
            await new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
            process.stdout.write('ERROR_LOGS_READY');
        })().catch((error) => {
            console.error(error && error.stack ? error.stack : error);
            process.exitCode = 1;
        });
    `;

    const result = spawnSync(process.execPath, ['-e', script], {
        cwd: root,
        env: { ...process.env, CLASSROOM_DB_PATH: dbPath },
        encoding: 'utf8',
        timeout: 10000
    });

    try {
        assert.strictEqual(result.status, 0, result.stderr || result.stdout);
        assert.match(result.stdout, /ERROR_LOGS_READY/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('server schedules startup log cleanup only after error-log schema readiness', () => {
    assert.match(
        serverSource,
        /db\.errorLogsReadyPromise[\s\S]*?\.then\(\(\)\s*=>\s*cleanupOldLogs\(\)\)/,
        'startup cleanup must wait for error_logs table readiness'
    );

    const startupSection = serverSource.match(/\/\/ Run cleanup on startup[\s\S]*?\/\/ Global error handlers/);
    assert.ok(startupSection, 'startup cleanup section must remain explicit');
    assert.doesNotMatch(
        startupSection[0],
        /\ncleanupOldLogs\(\);/,
        'startup cleanup must not run immediately before schema creation'
    );
});
