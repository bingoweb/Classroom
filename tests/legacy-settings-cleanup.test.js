const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const kioskHtmlPath = path.join(root, 'public/index.html');
const adminSourcePath = path.join(root, 'public/admin/admin.js');
const settingsLoaderPath = path.join(root, 'public/js/settings-loader.js');
const displayModeManagerPath = path.join(root, 'public/js/display-mode-manager.js');
const serverSourcePath = path.join(root, 'backend/server.js');
const settingsRoutesSourcePath = path.join(root, 'backend/routes/settings-routes.js');
const startScriptPath = path.join(root, 'start.sh');

const kioskHtml = fs.readFileSync(kioskHtmlPath, 'utf8');
const adminSource = fs.readFileSync(adminSourcePath, 'utf8');
const serverSource = fs.readFileSync(serverSourcePath, 'utf8');
const settingsRoutesSource = fs.readFileSync(settingsRoutesSourcePath, 'utf8');
const startScript = fs.readFileSync(startScriptPath, 'utf8');

test('legacy browser settings layer is removed without deleting backend settings support', async (t) => {
    await t.test('kiosk no longer imports or executes the old settings/display-mode modules', () => {
        assert.doesNotMatch(kioskHtml, /settings-loader\.js|display-mode-manager\.js/);
        assert.equal(fs.existsSync(settingsLoaderPath), false);
        assert.equal(fs.existsSync(displayModeManagerPath), false);
    });

    await t.test('admin no longer performs the discarded settings fetch or exposes dead saveSetting code', () => {
        assert.doesNotMatch(adminSource, /async function fetchSettings\s*\(/);
        assert.doesNotMatch(adminSource, /\bfetchSettings\s*\(\s*\)/);
        assert.doesNotMatch(adminSource, /window\.saveSetting\s*=\s*async function/);
        assert.doesNotMatch(adminSource, /messageInput/);
    });

    await t.test('backend settings API remains an explicit protected compatibility contract', () => {
        assert.match(serverSource, /registerSettingsRoutes\(app,/);
        assert.match(settingsRoutesSource, /app\.get\('\/api\/settings'/);
        assert.match(
            settingsRoutesSource,
            /app\.post\('\/api\/settings', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit/
        );
    });

    await t.test('kiosk fullscreen responsibility remains in the browser startup script', () => {
        assert.match(startScript, /chromium-browser --kiosk --app=http:\/\/localhost:3000/);
        assert.match(startScript, /google-chrome --kiosk --app=http:\/\/localhost:3000/);
        assert.match(startScript, /firefox --kiosk http:\/\/localhost:3000/);
    });
});
