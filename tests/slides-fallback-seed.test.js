const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-fallback-'));
const testDbPath = path.join(tempDir, 'fallback.db');
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function invoke(handler) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Route did not respond')), 250);
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                clearTimeout(timeout);
                resolve({ statusCode: this.statusCode, body });
            }
        };
        handler({ requestId: 'fallback-test' }, res);
    });
}

test('permanent Atatürk slides yield to admin content and return afterwards', async (t) => {
    t.after(async () => {
        await new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
        fs.rmSync(tempDir, { recursive: true, force: true });
        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) delete process.env.CLASSROOM_DB_PATH;
        else process.env.CLASSROOM_DB_PATH = originalDbPath;
    });

    await db.scheduleMigrationPromise;

    const fallbackRows = await all(`
        SELECT title, content_type, media_type, media_path, text_content,
               display_order, is_fallback, fallback_key
        FROM slides
        WHERE is_fallback = 1
        ORDER BY display_order
    `);

    assert.equal(fallbackRows.length, 7);
    assert.deepEqual(fallbackRows.map(row => row.display_order), [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(fallbackRows.every(row => row.content_type === 'rule'));
    assert.ok(fallbackRows.every(row => row.media_type === 'image'));
    assert.ok(fallbackRows.every(row => row.media_path.startsWith('/assets/ataturk-slides/')));
    assert.ok(fallbackRows.every(row => row.text_content.includes('Mustafa Kemal Atatürk')));
    assert.equal(new Set(fallbackRows.map(row => row.fallback_key)).size, 7);

    const activeHandler = app._router.stack.find(
        layer => layer.route && layer.route.path === '/api/slides/active' && layer.route.methods.get
    ).route.stack.at(-1).handle;

    const initial = await invoke(activeHandler);
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.body.length, 7);
    assert.ok(initial.body.every(row => row.is_fallback === 1));

    await run(`
        INSERT INTO slides (
            title, content_type, media_type, media_path, text_content,
            display_order, is_active, is_fallback
        ) VALUES ('Öğretmen Slaytı', 'rule', 'image', '/assets/custom.webp',
                  'Bugünün mesajı', 8, 1, 0)
    `);

    const realDateNow = Date.now;
    Date.now = () => realDateNow() + (6 * 60 * 1000);
    const withAdminSlide = await invoke(activeHandler);
    assert.equal(withAdminSlide.body.length, 1);
    assert.equal(withAdminSlide.body[0].title, 'Öğretmen Slaytı');
    assert.equal(withAdminSlide.body[0].is_fallback, 0);

    await run(`DELETE FROM slides WHERE is_fallback = 0`);
    Date.now = () => realDateNow() + (12 * 60 * 1000);
    const afterAdminDeletion = await invoke(activeHandler);
    Date.now = realDateNow;

    assert.equal(afterAdminDeletion.body.length, 7);
    assert.ok(afterAdminDeletion.body.every(row => row.is_fallback === 1));

    await run(
        `UPDATE slides SET text_content = ? WHERE fallback_key = 'ataturk-science'`,
        ['Düzenlenmiş söz']
    );
    const edited = await all(
        `SELECT text_content FROM slides WHERE fallback_key = 'ataturk-science'`
    );
    assert.equal(edited[0].text_content, 'Düzenlenmiş söz');
});
