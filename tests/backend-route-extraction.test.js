'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'backend', 'server.js');
const settingsRoutesPath = path.join(root, 'backend', 'routes', 'settings-routes.js');
const systemRoutesPath = path.join(root, 'backend', 'routes', 'system-routes.js');

test('P3-5A1 extracts settings and system route registration from server.js', () => {
    assert.equal(
        fs.existsSync(settingsRoutesPath),
        true,
        'backend/routes/settings-routes.js must exist'
    );
    assert.equal(
        fs.existsSync(systemRoutesPath),
        true,
        'backend/routes/system-routes.js must exist'
    );

    const serverSource = fs.readFileSync(serverPath, 'utf8');
    const settingsSource = fs.readFileSync(settingsRoutesPath, 'utf8');
    const systemSource = fs.readFileSync(systemRoutesPath, 'utf8');

    assert.match(settingsSource, /function\s+registerSettingsRoutes\s*\(app,\s*deps\)/);
    assert.match(systemSource, /function\s+registerSystemRoutes\s*\(app,\s*deps\)/);
    assert.match(serverSource, /registerSettingsRoutes\s*\(app,/);
    assert.match(serverSource, /registerSystemRoutes\s*\(app,/);

    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/settings['"]/);
    assert.doesNotMatch(serverSource, /app\.post\(['"]\/api\/settings['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/network-info['"]/);
    assert.doesNotMatch(serverSource, /app\.get\(['"]\/api\/stats['"]/);

    assert.match(settingsSource, /app\.get\(['"]\/api\/settings['"]/);
    assert.match(settingsSource, /app\.post\(['"]\/api\/settings['"]/);
    assert.match(systemSource, /app\.get\(['"]\/api\/network-info['"]/);
    assert.match(systemSource, /app\.get\(['"]\/api\/stats['"]/);
});
