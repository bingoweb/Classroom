'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.join(__dirname, '..');
const smokePath = path.join(projectRoot, 'scripts', 'test_system.js');
const verifierPath = path.join(projectRoot, 'scripts', 'verify-code.js');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('maintenance smoke tooling matches the current Classroom architecture', async (t) => {
    await t.test('system smoke no longer references removed legacy endpoints or a fixed port', () => {
        const source = read('scripts/test_system.js');
        assert.doesNotMatch(source, /\/api\/word/);
        assert.doesNotMatch(source, /localhost:3000/);
        assert.match(source, /CLASSROOM_DB_PATH/);
        assert.match(source, /CLASSROOM_ADMIN_PASSWORD/);
        assert.match(source, /\/api\/admin\/login/);
        assert.match(source, /\/api\/admin\/session/);
        assert.match(source, /\/api\/slides\/active/);
        assert.match(source, /\/api\/admin\/slides/);
        assert.match(source, /SYSTEM_SMOKE_PASS/);
    });

    await t.test('system smoke runs end-to-end against an isolated temp database', () => {
        const result = spawnSync(process.execPath, [smokePath], {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 30000,
            env: { ...process.env }
        });

        assert.equal(result.error, undefined, result.error ? result.error.message : '');
        assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assert.match(result.stdout, /SYSTEM_SMOKE_PASS/);
        assert.match(result.stdout, /public kiosk: 200/);
        assert.match(result.stdout, /admin redirect: 302/);
        assert.match(result.stdout, /admin login: 200/);
        assert.match(result.stdout, /CSRF: 64/);
        assert.match(result.stdout, /fallback slides: 7/);
        assert.match(result.stdout, /admin slides: 0/);
        assert.match(result.stdout, /temp settings write\/readback: PASS/);
    });

    await t.test('legacy verifier no longer searches for removed Gemini/Nano Banana artifacts', () => {
        const source = read('scripts/verify-code.js');
        assert.doesNotMatch(source, /geminiService|geminiClient|gemini\.js|nano-banana|GEN_AI|ENABLE_GEN_AI|generate-ai/);
        assert.match(source, /test:core/);
    });
});
