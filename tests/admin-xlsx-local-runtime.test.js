const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const adminHtmlPath = path.join(projectRoot, 'public/admin/index.html');
const serverPath = path.join(projectRoot, 'backend/server.js');
const packageRoot = path.dirname(require.resolve('xlsx'));
const packagePath = path.join(packageRoot, 'package.json');
const browserBundlePath = require.resolve('xlsx/dist/xlsx.full.min.js');
const XLSX = require('xlsx');

const LOCAL_XLSX_URL = '/vendor/sheetjs/xlsx.full.min.js';

test('Admin SheetJS local runtime contract', async (t) => {
    await t.test('installed package and browser bundle are the same pinned 0.20.3 release', () => {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        assert.equal(packageJson.version, '0.20.3');
        assert.equal(XLSX.version, packageJson.version);

        const context = {};
        context.global = context;
        context.window = context;
        context.self = context;
        vm.createContext(context);
        vm.runInContext(fs.readFileSync(browserBundlePath, 'utf8'), context, {
            filename: browserBundlePath,
            timeout: 5000
        });

        assert.ok(context.XLSX, 'browser bundle must expose the XLSX global');
        assert.equal(context.XLSX.version, packageJson.version);
    });

    await t.test('admin HTML has no SheetJS CDN dependency and loads only the local runtime URL', () => {
        const html = fs.readFileSync(adminHtmlPath, 'utf8');

        assert.doesNotMatch(html, /cdn\.sheetjs\.com/i);
        assert.doesNotMatch(html, /https?:\/\/[^"']*xlsx[^"']*/i);
        assert.match(
            html,
            new RegExp(`<script\\s+src=["']${LOCAL_XLSX_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*><\\/script>`, 'i')
        );
    });

    await t.test('server exposes the browser bundle from the installed xlsx package, not a duplicated public vendor copy', () => {
        const serverSource = fs.readFileSync(serverPath, 'utf8');
        const duplicatedVendorPath = path.join(projectRoot, 'public/vendor/sheetjs/xlsx.full.min.js');

        assert.equal(fs.existsSync(duplicatedVendorPath), false, 'SheetJS bundle must not be duplicated into public/vendor');
        assert.match(
            serverSource,
            /require\.resolve\(['"]xlsx\/dist\/xlsx\.full\.min\.js['"]\)/,
            'server must resolve the browser bundle from the installed package'
        );
        assert.match(
            serverSource,
            /app\.get\(['"]\/vendor\/sheetjs\/xlsx\.full\.min\.js['"]/,
            'server must expose the local SheetJS browser route'
        );
        assert.doesNotMatch(
            serverSource,
            /cdn\.sheetjs\.com\/xlsx-0\.20\.1/i,
            'server must not preserve the old browser CDN pin'
        );
    });

    await t.test('package source of truth remains pinned to SheetJS 0.20.3', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
        const lockJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));

        assert.equal(packageJson.dependencies.xlsx, 'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz');
        assert.equal(lockJson.packages[''].dependencies.xlsx, packageJson.dependencies.xlsx);
        assert.equal(lockJson.packages['node_modules/xlsx'].version, '0.20.3');
    });
});
