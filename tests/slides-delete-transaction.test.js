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

function createTrackedResponse({ timeoutMs = 1000, observationMs = 15 } = {}) {
    let resolvePromise;
    let rejectPromise;
    let settled = false;

    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const res = {
        statusCode: 200,
        responseCount: 0,
        body: null,
        promise,
        resolveTimeout: null,
        noResponseTimeout: null,
        jsonTime: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseCount++;
            this.jsonTime = process.hrtime.bigint();
            if (settled) return this;

            if (this.responseCount > 1) {
                settled = true;
                if (this.noResponseTimeout) clearTimeout(this.noResponseTimeout);
                if (this.resolveTimeout) clearTimeout(this.resolveTimeout);
                rejectPromise(new Error('Multiple responses sent'));
                return this;
            }

            this.body = data;
            if (this.noResponseTimeout) clearTimeout(this.noResponseTimeout);

            this.resolveTimeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolvePromise({ statusCode: this.statusCode, body: this.body, responseCount: this.responseCount, jsonTime: this.jsonTime });
            }, observationMs);

            return this;
        }
    };

    res.noResponseTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (res.resolveTimeout) clearTimeout(res.resolveTimeout);
        rejectPromise(new Error('Expected exactly one response, received 0'));
    }, timeoutMs);

    return res;
}

function invokeHandler(req) {
    const routes = app._router.stack
        .filter(r => r.route && r.route.methods.delete && r.route.path === '/api/slides/:id');
    if (routes.length !== 1) {
        return Promise.reject(new Error('Exactly one matching DELETE route must exist'));
    }
    const deleteHandler = routes[0].route.stack[routes[0].route.stack.length - 1].handle;

    const res = createTrackedResponse();

    const next = (err) => {
        res.promise.catch(() => {});
        throw err || new Error('next called without error');
    };

    try {
        deleteHandler(req, res, next);
    } catch (err) {
        res.promise.catch(() => {});
        return Promise.reject(err);
    }

    return res.promise;
}

test('Slides Delete Real SQLite Transaction Verification', async (t) => {
    let originalDbRun;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await new Promise((resolve, reject) => {
            db.run("DELETE FROM slides", (err) => err ? reject(err) : resolve());
        });
        originalDbRun = db.run;
    });

    t.afterEach(() => {
        if (originalDbRun) db.run = originalDbRun;
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
        originalDbRun.call(db, "INSERT INTO slides (title, display_order, content_type, media_type, media_path) VALUES (?, ?, 'text', 'none', '')", [title, order], function(err) {
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

    await t.test('Isolation proof: shared connection writes are not rolled back by a failed deletion transaction', async () => {
        const id1 = await insertSlide(1, 'A');
        const id2 = await insertSlide(2, 'B');
        const id3 = await insertSlide(3, 'C');

        await new Promise((resolve, reject) => {
            originalDbRun.call(db, "CREATE TABLE IF NOT EXISTS unrelated_writes (id INTEGER PRIMARY KEY, msg TEXT)", (err) => err ? reject(err) : resolve());
        });
        await new Promise((resolve, reject) => {
            originalDbRun.call(db, "DELETE FROM unrelated_writes", (err) => err ? reject(err) : resolve());
        });

        await new Promise((resolve, reject) => {
            originalDbRun.call(db, "CREATE TRIGGER fail_update BEFORE UPDATE ON slides BEGIN SELECT RAISE(ABORT, 'forced compaction failure'); END;", (err) => err ? reject(err) : resolve());
        });

        let originalDbRunRef = db.run;
        let originalCreateIsolatedConnectionRef = db.createIsolatedConnection;

        let resolvePause;
        const pausePromise = new Promise(r => resolvePause = r);
        let transactionPausedResolver;
        const transactionPausedPromise = new Promise(r => transactionPausedResolver = r);

        function attachInterceptor(dbObj) {
            const origRun = dbObj.run;
            dbObj.run = function(sql, params, runCb) {
                const actualCb = typeof params === 'function' ? params : runCb;
                const actualParams = typeof params === 'function' ? [] : params;

                if (typeof sql === 'string' && sql.includes('DELETE FROM slides WHERE id = ?')) {
                    transactionPausedResolver();
                    pausePromise.then(() => {
                        origRun.call(this, sql, actualParams, actualCb);
                    });
                } else {
                    origRun.call(this, sql, actualParams, actualCb);
                }
            };
            return origRun;
        }

        const restoreDbRun = attachInterceptor(db);

        if (originalCreateIsolatedConnectionRef) {
            db.createIsolatedConnection = function(cb) {
                originalCreateIsolatedConnectionRef.call(db, (err, isolatedDb) => {
                    if (err) return cb(err);
                    attachInterceptor(isolatedDb);
                    cb(null, isolatedDb);
                });
            };
        }

        const req = { params: { id: id2.toString() } };
        const invokeHandlerPromise = invokeHandler(req);

        await transactionPausedPromise;

        const unrelatedWritePromise = new Promise((resolve, reject) => {
            restoreDbRun.call(db, "INSERT INTO unrelated_writes (msg) VALUES ('unrelated')", (err) => err ? reject(err) : resolve());
        });

        resolvePause();

        const resObj = await invokeHandlerPromise;
        await unrelatedWritePromise;

        db.run = originalDbRunRef;
        if (originalCreateIsolatedConnectionRef) {
            db.createIsolatedConnection = originalCreateIsolatedConnectionRef;
        }
        await new Promise((resolve, reject) => {
            originalDbRunRef.call(db, "DROP TRIGGER fail_update;", (err) => err ? reject(err) : resolve());
        });

        assert.strictEqual(resObj.statusCode, 500);
        assert.deepEqual(resObj.body, { error: 'SQLITE_CONSTRAINT: forced compaction failure' });

        const postFailSlides = await getSlides();
        assert.strictEqual(postFailSlides.length, 3);
        assert.strictEqual(postFailSlides[0].id, id1);
        assert.strictEqual(postFailSlides[1].id, id2);
        assert.strictEqual(postFailSlides[2].id, id3);

        const unrelatedWrites = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM unrelated_writes", (err, rows) => err ? reject(err) : resolve(rows));
        });

        assert.strictEqual(unrelatedWrites.length, 1, 'Unrelated write must be preserved despite transaction rollback. If 0, isolation is missing!');
        assert.strictEqual(unrelatedWrites[0].msg, 'unrelated');
    });
});
