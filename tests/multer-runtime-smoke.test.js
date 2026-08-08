'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const multer = require('multer');

function listFiles(directory) {
    return fs.readdirSync(directory).filter((name) => fs.statSync(path.join(directory, name)).isFile()).sort();
}

function startServer(app) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, '127.0.0.1', (error) => {
            if (error) return reject(error);
            resolve(server);
        });
    });
}

function closeServer(server) {
    return new Promise((resolve) => server.close(resolve));
}

test('Multer 2 native multipart runtime baseline', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-multer-runtime-'));
    const storage = multer.diskStorage({
        destination(req, file, callback) {
            callback(null, tempDir);
        },
        filename(req, file, callback) {
            callback(null, `stored-${file.originalname}`);
        }
    });

    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const upload = multer({
        storage,
        limits: { fileSize: 1024 },
        fileFilter(req, file, callback) {
            const extensionAllowed = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimeAllowed = allowedTypes.test(file.mimetype)
                || file.mimetype.startsWith('image/')
                || file.mimetype.startsWith('video/');

            if (extensionAllowed && mimeAllowed) {
                return callback(null, true);
            }

            callback(new Error('unsupported upload'));
        }
    });

    const app = express();
    app.post('/upload', (req, res) => {
        upload.single('photo')(req, res, (error) => {
            if (error) {
                return res.status(error instanceof multer.MulterError ? 413 : 400).json({
                    code: error.code || null,
                    message: error.message
                });
            }

            res.json({
                fields: req.body,
                file: req.file ? {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    filename: req.file.filename,
                    size: req.file.size
                } : null
            });
        });
    });

    const server = await startServer(app);
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
        await t.test('the validated Multer 2.2.0 runtime is loaded', () => {
            assert.equal(require('multer/package.json').version, '2.2.0');
        });

        await t.test('a real multipart image upload parses fields and persists exactly one file', async () => {
            const form = new FormData();
            form.append('name', 'Runtime Smoke');
            form.append('photo', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
                type: 'image/png'
            }), 'smoke.png');

            const response = await fetch(`${baseUrl}/upload`, {
                method: 'POST',
                body: form
            });
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(body.fields, { name: 'Runtime Smoke' });
            assert.equal(body.file.fieldname, 'photo');
            assert.equal(body.file.originalname, 'smoke.png');
            assert.equal(body.file.mimetype, 'image/png');
            assert.equal(body.file.filename, 'stored-smoke.png');
            assert.equal(body.file.size, 8);
            assert.deepEqual(listFiles(tempDir), ['stored-smoke.png']);
            assert.equal(fs.readFileSync(path.join(tempDir, 'stored-smoke.png')).length, 8);
        });

        await t.test('fileFilter rejection returns an error and does not create an orphan file', async () => {
            const before = listFiles(tempDir);
            const form = new FormData();
            form.append('photo', new Blob([Buffer.from('not allowed')], {
                type: 'text/plain'
            }), 'blocked.txt');

            const response = await fetch(`${baseUrl}/upload`, {
                method: 'POST',
                body: form
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.equal(body.code, null);
            assert.equal(body.message, 'unsupported upload');
            assert.deepEqual(listFiles(tempDir), before);
        });

        await t.test('file-size limit reports LIMIT_FILE_SIZE and leaves no partial file', async () => {
            const before = listFiles(tempDir);
            const form = new FormData();
            form.append('photo', new Blob([Buffer.alloc(2048, 0x61)], {
                type: 'image/png'
            }), 'too-large.png');

            const response = await fetch(`${baseUrl}/upload`, {
                method: 'POST',
                body: form
            });
            const body = await response.json();

            assert.equal(response.status, 413);
            assert.equal(body.code, 'LIMIT_FILE_SIZE');
            assert.equal(body.message, 'File too large');
            assert.deepEqual(listFiles(tempDir), before);
        });
    } finally {
        await closeServer(server);
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
