'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const databaseModulePath = require.resolve('../backend/database.js');
const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-fallback-reconcile-'));
const testDbPath = path.join(tempDir, 'fallback-reconcile.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve(this);
        });
    });
}

function close(db) {
    return new Promise((resolve, reject) => {
        db.close((error) => error ? reject(error) : resolve());
    });
}

function loadFreshDatabaseModule() {
    delete require.cache[databaseModulePath];
    return require('../backend/database.js');
}

async function loadReadyDatabase() {
    const db = loadFreshDatabaseModule();
    await db.scheduleMigrationPromise;
    return db;
}

test('Atatürk fallback startup reconciliation', async (t) => {
    t.after(() => {
        delete require.cache[databaseModulePath];
        fs.rmSync(tempDir, { recursive: true, force: true });
        if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
        else process.env.CLASSROOM_DB_PATH = originalDbPath;
    });

    let db = await loadReadyDatabase();

    await t.test('initial startup creates exactly seven canonical system fallbacks', async () => {
        const rows = await all(db, `
            SELECT fallback_key, title, media_path, display_duration,
                   transition_type, transition_duration, transition_mode,
                   display_order, is_active, is_fallback
            FROM slides
            WHERE fallback_key IS NOT NULL
            ORDER BY fallback_key
        `);

        assert.equal(rows.length, 7);
        assert.equal(new Set(rows.map((row) => row.fallback_key)).size, 7);
        assert.ok(rows.every((row) => row.is_fallback === 1));
        assert.ok(rows.every((row) => row.is_active === 1));
    });

    await run(db, `DELETE FROM slides WHERE fallback_key = ?`, ['ataturk-science']);
    await run(db, `
        UPDATE slides
        SET title = 'Bozulmuş Sistem Slaytı',
            media_path = '/assets/broken.webp',
            text_content = 'bozuk',
            display_duration = 999,
            transition_type = 'glitch',
            transition_duration = 1999,
            transition_mode = 'manual',
            display_order = 999,
            is_active = 0,
            is_fallback = 0
        WHERE fallback_key = 'ataturk-education'
    `);

    await close(db);
    db = await loadReadyDatabase();

    await t.test('restart restores a deleted fallback even when the legacy seed marker already exists', async () => {
        const rows = await all(db, `
            SELECT fallback_key
            FROM slides
            WHERE is_fallback = 1
            ORDER BY fallback_key
        `);

        assert.equal(rows.length, 7);
        assert.ok(rows.some((row) => row.fallback_key === 'ataturk-science'));
    });

    await t.test('restart repairs a tampered fallback back to canonical system-owned values', async () => {
        const rows = await all(db, `
            SELECT title, content_type, media_type, media_path, text_content,
                   display_duration, video_auto_advance, transition_type,
                   transition_duration, transition_mode, display_order,
                   is_active, priority, is_poster, is_fallback, fallback_key
            FROM slides
            WHERE fallback_key = 'ataturk-education'
        `);

        assert.equal(rows.length, 1);
        assert.deepEqual(rows[0], {
            title: 'Başöğretmen Atatürk',
            content_type: 'rule',
            media_type: 'image',
            media_path: '/assets/ataturk-slides/ataturk-1.webp',
            text_content: '“Öğretmenler! Yeni nesil sizin eseriniz olacaktır.”\n— Mustafa Kemal Atatürk',
            display_duration: 12000,
            video_auto_advance: 0,
            transition_type: 'fade',
            transition_duration: 1000,
            transition_mode: 'auto',
            display_order: 1,
            is_active: 1,
            priority: 5,
            is_poster: 0,
            is_fallback: 1,
            fallback_key: 'ataturk-education'
        });
    });

    await t.test('reconciliation remains idempotent and never creates duplicate fallback keys', async () => {
        await close(db);
        db = await loadReadyDatabase();

        const rows = await all(db, `
            SELECT fallback_key, COUNT(*) AS count
            FROM slides
            WHERE fallback_key IS NOT NULL
            GROUP BY fallback_key
            ORDER BY fallback_key
        `);

        assert.equal(rows.length, 7);
        assert.ok(rows.every((row) => row.count === 1));
    });

    await close(db);
    db = null;
});
