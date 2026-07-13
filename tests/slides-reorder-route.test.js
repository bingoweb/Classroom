const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-reorder-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');

function closeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.close((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function removeFileIfPresent(fsApi, filePath) {
    try {
        fsApi.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

function removeDirectoryIfPresent(fsApi, directoryPath) {
    try {
        fsApi.rmdirSync(directoryPath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

test('Slides Reorder Route Tests', async (t) => {
    let server;
    let serverUrl;
    let originalDbSerialize, originalDbPrepare, originalDbGet, originalDbRun;

    t.before(async () => {
        await db.scheduleMigrationPromise;

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                serverUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
    });

    t.beforeEach(() => {
        originalDbSerialize = db.serialize;
        originalDbPrepare = db.prepare;
        originalDbGet = db.get;
        originalDbRun = db.run;
    });

    t.afterEach(() => {
        if (originalDbSerialize) db.serialize = originalDbSerialize;
        if (originalDbPrepare) db.prepare = originalDbPrepare;
        if (originalDbGet) db.get = originalDbGet;
        if (originalDbRun) db.run = originalDbRun;
    });

    t.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
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

    function makeRequest(method, endpoint, bodyObj) {
        return new Promise((resolve, reject) => {
            const req = http.request(serverUrl + endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                });
            });
            req.on('error', reject);
            if (bodyObj) {
                req.write(JSON.stringify(bodyObj));
            }
            req.end();
        });
    }

    await t.test('1. Mandatory route-stack ordering test', () => {
        const routes = app._router.stack
            .filter(r => r.route && r.route.methods.put)
            .map(r => r.route.path);
        
        const reorderIndex = routes.findIndex(path => path === '/api/slides/reorder');
        const updateIndex = routes.findIndex(path => path === '/api/slides/:id');
        
        assert.ok(reorderIndex !== -1, 'reorder route must exist');
        assert.ok(updateIndex !== -1, '/:id route must exist');
        
        const reorderCount = routes.filter(path => path === '/api/slides/reorder').length;
        const updateCount = routes.filter(path => path === '/api/slides/:id').length;
        
        assert.strictEqual(reorderCount, 1, 'there must be exactly one reorder route');
        assert.strictEqual(updateCount, 1, 'there must be exactly one /:id update route');
        
        assert.ok(reorderIndex < updateIndex, 'reorder route must be registered before /:id route');
    });

    await t.test('2. Mandatory successful real-dispatch test', async () => {
        let getCalled = false;
        let serializeCalled = 0;
        let prepareCalled = 0;
        let preparedSql = null;
        let runCalls = [];
        let finalizeCalled = 0;

        db.get = function() {
            getCalled = true;
            throw new Error('db.get must not be called');
        };

        db.serialize = function(cb) {
            serializeCalled++;
            cb();
        };

        db.prepare = function(sql) {
            prepareCalled++;
            preparedSql = sql;
            return {
                run: function(params, cb) {
                    runCalls.push(params);
                    if (cb) cb(null);
                },
                finalize: function() {
                    finalizeCalled++;
                }
            };
        };

        const payload = {
            slideOrders: [
                { id: 2, display_order: 1 },
                { id: 1, display_order: 2 }
            ]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);
        
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(response.body, { message: 'Sıralama başarıyla güncellendi' });
        
        assert.strictEqual(getCalled, false);
        assert.strictEqual(serializeCalled, 1);
        assert.strictEqual(prepareCalled, 1);
        assert.strictEqual(preparedSql, 'UPDATE slides SET display_order = ? WHERE id = ?');
        assert.strictEqual(runCalls.length, 2);
        assert.deepEqual(runCalls, [
            [1, 2],
            [2, 1]
        ]);
        assert.strictEqual(finalizeCalled, 1);
    });

    await t.test('3. Mandatory invalid-payload real-dispatch test', async () => {
        let getCalled = false;
        let serializeCalled = false;
        let prepareCalled = false;

        db.get = () => { getCalled = true; };
        db.serialize = () => { serializeCalled = true; };
        db.prepare = () => { prepareCalled = true; };

        const payload = { slideOrders: [] };
        const response = await makeRequest('PUT', '/api/slides/reorder', payload);
        
        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi' });
        
        assert.strictEqual(serializeCalled, false);
        assert.strictEqual(prepareCalled, false);
        assert.strictEqual(getCalled, false);
    });

    await t.test('4. Mandatory item-validation preservation test', async () => {
        let dbCalled = false;
        const markDbCalled = () => { dbCalled = true; };

        db.get = markDbCalled;
        db.serialize = markDbCalled;
        db.prepare = markDbCalled;
        db.run = markDbCalled;

        const payload = {
            slideOrders: [
                { id: 1 }
            ]
        };

        const response = await makeRequest('PUT', '/api/slides/reorder', payload);
        
        assert.strictEqual(response.statusCode, 400);
        assert.deepEqual(response.body, { error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        assert.strictEqual(dbCalled, false);
    });

    await t.test('5. Mandatory numeric update-route preservation check', async () => {
        let getSql = null;
        let getParams = null;
        let runSql = null;

        db.get = function(sql, params, cb) {
            getSql = sql;
            getParams = params;
            // Return a dummy existing slide so update can proceed
            cb(null, { media_path: 'old.jpg' });
        };

        db.run = function(sql, params, cb) {
            runSql = sql;
            this.changes = 1;
            cb.call(this, null);
        };

        const payload = { title: 'Yeni başlık' };
        const response = await makeRequest('PUT', '/api/slides/47', payload);
        
        // Assert we actually reached the update handler
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(response.body, {
            message: 'Slayt başarıyla güncellendi',
            changes: 1
        });
        
        assert.ok(getSql.includes('SELECT media_path FROM slides WHERE id = ?'));
        assert.deepEqual(getParams, [47]);
        assert.strictEqual(typeof getParams[0], 'number');
        assert.ok(runSql.includes('UPDATE slides SET'));
    });
});
