const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-delete-txn-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function removeFileIfPresent(fsApi, filePath) {
    try {
        fsApi.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function removeDirectoryIfPresent(fsApi, directoryPath) {
    try {
        fsApi.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

function invokeHandler(req) {
    return new Promise((resolve, reject) => {
        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.delete && r.route.path === '/api/slides/:id');
        if (routes.length !== 1) {
            return reject(new Error('Exactly one matching DELETE route must exist'));
        }
        const deleteHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;

        let responseCount = 0;
        let responseSnapshot = null;
        
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                responseCount++;
                if (responseCount > 1) {
                    return reject(new Error('Multiple responses sent'));
                }
                responseSnapshot = {
                    statusCode: this.statusCode || 200,
                    body: data
                };
                resolve(responseSnapshot);
                return this;
            }
        };

        const next = (err) => reject(err || new Error('next called without error'));

        try {
            deleteHandler(req, res, next);
        } catch (err) {
            reject(err);
        }
    });
}

test('Slides Delete Real SQLite Transaction Verification', async (t) => {
    t.before(async () => {
        await db.scheduleMigrationPromise;

        // Clear table and insert test slides
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM slides", (err) => err ? reject(err) : resolve());
        });
    });

    t.after(async () => {
        await closeDatabase(db);
        removeFileIfPresent(fs, testDbPath);
        removeFileIfPresent(fs, testDbPath + '-journal');
        removeFileIfPresent(fs, testDbPath + '-wal');
        removeFileIfPresent(fs, testDbPath + '-shm');
        removeDirectoryIfPresent(fs, tempDir);

        global.setInterval = originalSetInterval;
        if (originalDbPath === undefined) {
            delete process.env.CLASSROOM_DB_PATH;
        } else {
            process.env.CLASSROOM_DB_PATH = originalDbPath;
        }
    });

    const insertSlide = (order, title) => new Promise((resolve, reject) => {
        db.run("INSERT INTO slides (title, display_order, content_type, media_type, media_path) VALUES (?, ?, 'text', 'none', '')", [title, order], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });

    const getSlides = () => new Promise((resolve, reject) => {
        db.all("SELECT id, display_order FROM slides ORDER BY display_order ASC", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    await t.test('Transaction enforces atomicity when update fails', async () => {
        const id1 = await insertSlide(1, 'A');
        const id2 = await insertSlide(2, 'B');
        const id3 = await insertSlide(3, 'C');

        // Create a trigger that forces UPDATE to fail
        await new Promise((resolve, reject) => {
            db.run("CREATE TRIGGER fail_update BEFORE UPDATE ON slides BEGIN SELECT RAISE(ABORT, 'forced compaction failure'); END;", (err) => err ? reject(err) : resolve());
        });

        const initialSlides = await getSlides();
        assert.strictEqual(initialSlides.length, 3);

        const req = { params: { id: id2.toString() } };
        const resObj = await invokeHandler(req);

        // Expect 500 error due to rollback
        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'SQLITE_CONSTRAINT: forced compaction failure' });

        // Database should be completely untouched
        const postFailSlides = await getSlides();
        assert.strictEqual(postFailSlides.length, 3);
        assert.deepEqual(postFailSlides, initialSlides);

        // Remove trigger
        await new Promise((resolve, reject) => {
            db.run("DROP TRIGGER fail_update;", (err) => err ? reject(err) : resolve());
        });

        // Retry deletion successfully
        const reqSuccess = { params: { id: id2.toString() } };
        const resObjSuccess = await invokeHandler(reqSuccess);

        assert.strictEqual(resObjSuccess.statusCode, 200);
        assert.deepEqual(resObjSuccess.body, { message: 'Slayt başarıyla silindi', changes: 1 });

        // Verify successful deletion and compaction
        const postSuccessSlides = await getSlides();
        assert.strictEqual(postSuccessSlides.length, 2);
        
        assert.strictEqual(postSuccessSlides[0].id, id1);
        assert.strictEqual(postSuccessSlides[0].display_order, 1);
        
        assert.strictEqual(postSuccessSlides[1].id, id3);
        assert.strictEqual(postSuccessSlides[1].display_order, 2);
    });
});
