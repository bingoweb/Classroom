const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');

const originalDbPath = process.env.CLASSROOM_DB_PATH;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-slides-get-id-test-'));
const testDbPath = path.join(tempDir, `test-${crypto.randomBytes(4).toString('hex')}.db`);
process.env.CLASSROOM_DB_PATH = testDbPath;

const originalSetInterval = global.setInterval;
global.setInterval = () => {};

const app = require('../backend/server.js');
const db = require('../backend/database.js');
const { normalizePath } = require('../backend/utils.js');

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

function createTrackedResponse() {
    let resolvePromise;
    let rejectPromise;
    
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const timeout = setTimeout(() => {
        rejectPromise(new Error('Expected exactly one response, received 0'));
    }, 50);

    const res = {
        statusCode: 200,
        responseCount: 0,
        body: null,
        promise,
        resolveTimeout: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseCount++;
            if (this.responseCount > 1) {
                clearTimeout(timeout);
                if (this.resolveTimeout) clearTimeout(this.resolveTimeout);
                rejectPromise(new Error('Multiple responses sent'));
                return this;
            }
            this.body = data;
            clearTimeout(timeout);
            this.resolveTimeout = setTimeout(() => {
                resolvePromise({ statusCode: this.statusCode, body: this.body, responseCount: this.responseCount });
            }, 5);
            return this;
        }
    };
    return res;
}

test('Slides Get ID Tests', async (t) => {
    let server;
    let serverUrl;
    let originalDbGet;

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
        originalDbGet = db.get;
    });

    t.afterEach(() => {
        if (originalDbGet) db.get = originalDbGet;
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

    const getRoutes = app._router.stack.filter(layer => layer.route && layer.route.methods.get);
    const getIdRoutes = getRoutes.filter(layer => layer.route.path === '/api/slides/:id');
    const getAllRoutes = getRoutes.filter(layer => layer.route.path === '/api/slides');

    const handlerLayer = getIdRoutes[0]?.route.stack[getIdRoutes[0].route.stack.length - 1];
    const handler = handlerLayer ? handlerLayer.handle : null;

    await t.test('Route discovery', () => {
        assert.strictEqual(getIdRoutes.length, 1, 'exactly one GET /api/slides/:id route exists');
        assert.strictEqual(typeof handler, 'function', 'the extracted handler is a function');
        
        const routesPaths = getRoutes.map(l => l.route.path);
        const getAllIndex = routesPaths.indexOf('/api/slides');
        const getIdIndex = routesPaths.indexOf('/api/slides/:id');
        assert.ok(getAllIndex < getIdIndex, 'GET /api/slides is registered before GET /api/slides/:id');
    });

    await t.test('Helper self-regression: double response', async () => {
        const h = (req, res) => {
            res.status(200).json({ first: true });
            res.json({ second: true });
        };
        const res = createTrackedResponse();
        h({}, res);
        await assert.rejects(res.promise, /Multiple responses sent/);
    });

    await t.test('Helper self-regression: zero response', async () => {
        const h = (req, res) => {};
        const res = createTrackedResponse();
        h({}, res);
        await assert.rejects(res.promise, /Expected exactly one response, received 0/);
    });

    await t.test('Mandatory direct-handler malformed-ID matrix', async (t2) => {
        const invalidStrings = [
            'abc', '47abc', 'abc47', '47.5', '47e2', '+47', '-47', '0', '00', '047', '47 ', ' 47', '', '   ', '9007199254740992'
        ];
        
        for (const val of invalidStrings) {
            await t2.test(`Invalid string: "${val}"`, async () => {
                let dbGetCalled = 0;
                db.get = () => { dbGetCalled++; };

                const req = { params: { id: val } };
                const res = createTrackedResponse();
                
                assert.doesNotThrow(() => { handler(req, res); });
                const result = await res.promise;

                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(result.body, { error: 'Geçersiz slayt ID' });
                assert.strictEqual(result.responseCount, 1);
                assert.strictEqual(dbGetCalled, 0);
            });
        }

        const invalidTypes = [
            undefined, null, 1, 47, true, false, {}, [], new Number(47)
        ];

        for (let i = 0; i < invalidTypes.length; i++) {
            const val = invalidTypes[i];
            await t2.test(`Invalid type: index ${i}`, async () => {
                let dbGetCalled = 0;
                db.get = () => { dbGetCalled++; };

                const req = { params: { id: val } };
                const res = createTrackedResponse();
                
                assert.doesNotThrow(() => { handler(req, res); });
                const result = await res.promise;

                assert.strictEqual(result.statusCode, 400);
                assert.deepStrictEqual(result.body, { error: 'Geçersiz slayt ID' });
                assert.strictEqual(result.responseCount, 1);
                assert.strictEqual(dbGetCalled, 0);
            });
        }
    });

    function makeRequest(method, endpoint) {
        return new Promise((resolve, reject) => {
            const req = http.request(serverUrl + endpoint, {
                method: method
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    await t.test('Mandatory real HTTP malformed-ID regressions', async (t2) => {
        const httpInvalid = ['47abc', '47.5', '047', '0', '-47', '9007199254740992'];
        
        for (const val of httpInvalid) {
            await t2.test(`HTTP invalid: /api/slides/${val}`, async () => {
                let dbGetCalled = 0;
                db.get = () => { dbGetCalled++; };

                const response = await makeRequest('GET', `/api/slides/${val}`);
                
                assert.strictEqual(response.statusCode, 400);
                assert.deepStrictEqual(response.body, { error: 'Geçersiz slayt ID' });
                assert.strictEqual(dbGetCalled, 0);
            });
        }
    });

    await t.test('Canonical ID lookup preservation', async (t2) => {
        const validIds = [
            { raw: '1', numeric: 1 },
            { raw: '47', numeric: 47 },
            { raw: String(Number.MAX_SAFE_INTEGER), numeric: Number.MAX_SAFE_INTEGER }
        ];

        for (const item of validIds) {
            await t2.test(`Canonical ID: ${item.raw}`, async () => {
                let capturedSql = null;
                let capturedParams = null;
                let dbGetCalled = 0;

                db.get = (sql, params, cb) => {
                    dbGetCalled++;
                    capturedSql = sql;
                    capturedParams = params;
                    cb(null, undefined); // return no row
                };

                const req = { params: { id: item.raw } };
                const res = createTrackedResponse();
                handler(req, res);
                const result = await res.promise;

                assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE id = ?");
                assert.deepStrictEqual(capturedParams, [item.numeric]);
                assert.strictEqual(typeof capturedParams[0], 'number');
                
                assert.strictEqual(result.statusCode, 404);
                assert.deepStrictEqual(result.body, { error: 'Slayt bulunamadı' });
                assert.strictEqual(result.responseCount, 1);
                assert.strictEqual(dbGetCalled, 1);
            });
        }
    });

    await t.test('Database-error preservation', async () => {
        let capturedSql = null;
        let capturedParams = null;
        let dbGetCalled = 0;

        db.get = (sql, params, cb) => {
            dbGetCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(new Error('slide lookup failed'));
        };

        const req = { params: { id: '47' } };
        const res = createTrackedResponse();
        handler(req, res);
        const result = await res.promise;

        assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE id = ?");
        assert.deepStrictEqual(capturedParams, [47]);
        
        assert.strictEqual(result.statusCode, 500);
        assert.deepStrictEqual(result.body, { error: 'slide lookup failed' });
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(dbGetCalled, 1);
    });

    await t.test('Successful response preservation', async () => {
        let capturedSql = null;
        let capturedParams = null;
        let dbGetCalled = 0;
        
        const mockRow = {
            id: 47,
            title: 'Test slaytı',
            media_path: null,
            display_order: 3,
            is_active: 1
        };

        db.get = (sql, params, cb) => {
            dbGetCalled++;
            capturedSql = sql;
            capturedParams = params;
            cb(null, { ...mockRow });
        };

        const req = { params: { id: '47' } };
        const res = createTrackedResponse();
        handler(req, res);
        const result = await res.promise;

        assert.strictEqual(capturedSql, "SELECT * FROM slides WHERE id = ?");
        assert.deepStrictEqual(capturedParams, [47]);
        
        assert.strictEqual(result.statusCode, 200);
        assert.deepStrictEqual(result.body, mockRow);
        assert.strictEqual(result.responseCount, 1);
        assert.strictEqual(dbGetCalled, 1);
    });

    await t.test('Successful response media path normalization preservation', async () => {
        const mockRow = {
            id: 47,
            title: 'Test slaytı',
            media_path: 'backend\\uploads\\test.jpg',
            display_order: 3,
            is_active: 1
        };

        db.get = (sql, params, cb) => {
            cb(null, { ...mockRow });
        };

        const req = { params: { id: '47' } };
        const res = createTrackedResponse();
        handler(req, res);
        const result = await res.promise;

        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.responseCount, 1);
        
        assert.strictEqual(result.body.media_path, normalizePath(mockRow.media_path, true));
    });
});
