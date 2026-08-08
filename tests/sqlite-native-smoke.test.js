const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

function openDatabase(filePath) {
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database(filePath, (error) => {
            if (error) reject(error);
            else resolve(database);
        });
    });
}

function run(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

function get(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.get(sql, params, (error, row) => {
            if (error) reject(error);
            else resolve(row);
        });
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

test('sqlite3 native runtime baseline', async (t) => {
    await t.test('the validated sqlite3 6.0.1 native runtime is loaded', () => {
        assert.equal(require('sqlite3/package.json').version, '6.0.1');
        assert.equal(sqlite3.VERSION, '3.52.0');
    });

    await t.test('callback-chained BEGIN/COMMIT and BEGIN/ROLLBACK preserve transaction semantics', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-sqlite-native-smoke-'));
        const dbPath = path.join(tempDir, 'smoke.db');
        let database;

        try {
            database = await openDatabase(dbPath);
            await run(database, 'CREATE TABLE smoke (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');

            await run(database, 'BEGIN IMMEDIATE');
            await run(database, 'INSERT INTO smoke (value) VALUES (?)', ['commit-me']);
            await run(database, 'COMMIT');

            const afterCommit = await get(database, 'SELECT COUNT(*) AS count FROM smoke');
            assert.equal(afterCommit.count, 1);

            await run(database, 'BEGIN IMMEDIATE');
            await run(database, 'INSERT INTO smoke (value) VALUES (?)', ['rollback-me']);
            await run(database, 'ROLLBACK');

            const afterRollback = await get(database, 'SELECT COUNT(*) AS count FROM smoke');
            assert.equal(afterRollback.count, 1, 'rolled-back insert must not remain visible');

            const committedRow = await get(database, 'SELECT value FROM smoke WHERE id = 1');
            assert.deepEqual(committedRow, { value: 'commit-me' });
        } finally {
            if (database) await close(database);
            for (const suffix of ['', '-journal', '-wal', '-shm']) {
                try {
                    fs.unlinkSync(`${dbPath}${suffix}`);
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                }
            }
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
