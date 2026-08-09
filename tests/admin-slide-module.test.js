const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adminPath = path.join(root, 'public/admin/admin.js');
const htmlPath = path.join(root, 'public/admin/index.html');
const slidesPath = path.join(root, 'public/admin/js/slides.js');
const packagePath = path.join(root, 'package.json');

test('P3-5B4.1 extracts admin slide read/render behavior into a classic-script module', () => {
    assert.strictEqual(
        fs.existsSync(slidesPath),
        true,
        'public/admin/js/slides.js must exist'
    );

    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const htmlSource = fs.readFileSync(htmlPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const attendanceScript = '<script src="js/attendance.js"></script>';
    const slidesScript = '<script src="js/slides.js"></script>';
    const adminScript = '<script src="admin.js"></script>';

    assert.ok(htmlSource.includes(slidesScript), 'admin HTML loads slides.js');
    assert.ok(
        htmlSource.indexOf(attendanceScript) < htmlSource.indexOf(slidesScript),
        'slides.js loads after attendance.js'
    );
    assert.ok(
        htmlSource.indexOf(slidesScript) < htmlSource.indexOf(adminScript),
        'slides.js loads before admin.js'
    );

    assert.match(slidesSource, /window\.AdminSlides\s*=\s*\{/);
    assert.match(slidesSource, /function renderSlides\(slides\)/);
    assert.match(slidesSource, /Utils\.normalizePath\(mediaPath, true\)/);
    assert.match(slidesSource, /slide-item\$\{isActive \? '' : ' is-inactive'\}/);
    assert.match(slidesSource, /Pasif Yap/);
    assert.match(slidesSource, /Aktif Yap/);

    assert.match(adminSource, /AdminSlides\.init\(\{[\s\S]*setupDragAndDrop[\s\S]*\}\)/);
    assert.match(adminSource, /AdminSlides\.renderSlides\(allSlides\)/);
    assert.doesNotMatch(adminSource, /function renderSlides\(slides\)/);

    // B4.1 is read/render only. Behaviors after B4.2 must stay in the shell for their own sub-waves.
    assert.match(adminSource, /function setupDragAndDrop\(\)/);
    assert.match(adminSource, /async function reorderSlides\(/);
    assert.match(adminSource, /window\.showSlideForm\s*=/);
    assert.match(adminSource, /window\.deleteSlide\s*=/);
    assert.match(adminSource, /async function handleSlideSettingsSubmit\(/);

    assert.strictEqual(
        packageJson.scripts['test:admin-slide-module'],
        'node --test tests/admin-slide-module.test.js',
        'package.json exposes the focused B4.1 structural test'
    );
    assert.match(
        packageJson.scripts['test:core'],
        /tests\/admin-slide-module\.test\.js/,
        'B4.1 structural regression stays in test:core'
    );
});

test('P3-5B4.2 extracts active toggle ownership with explicit slide state and refresh injection', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /async function toggleSlideActive\(id\)/);
    assert.match(slidesSource, /window\.toggleSlideActive\s*=\s*toggleSlideActive/);
    assert.match(slidesSource, /toggleSlideActive/);
    assert.match(slidesSource, /getSlides/);
    assert.match(slidesSource, /refreshSlides/);

    assert.match(
        adminSource,
        /AdminSlides\.init\(\{[\s\S]*getSlides:\s*\(\)\s*=>\s*allSlides[\s\S]*refreshSlides:\s*fetchSlides[\s\S]*setupDragAndDrop[\s\S]*\}\)/
    );
    assert.doesNotMatch(adminSource, /window\.toggleSlideActive\s*=/);

    // B4.3-B4.7 remain intentionally owned by admin.js.
    assert.match(adminSource, /function setupDragAndDrop\(\)/);
    assert.match(adminSource, /async function reorderSlides\(/);
    assert.match(adminSource, /window\.showSlideForm\s*=/);
    assert.match(adminSource, /window\.deleteSlide\s*=/);
    assert.match(adminSource, /async function handleSlideSettingsSubmit\(/);
});

function loadSlidesModule({ slides, fetchImpl }) {
    const calls = {
        fetch: [],
        refresh: 0,
        success: [],
        error: [],
        logger: []
    };

    const context = {
        window: {},
        document: {
            getElementById() {
                return null;
            }
        },
        CONFIG: { API_URL: '/api' },
        COMPONENTS: { ADMIN: 'ADMIN' },
        Utils: {
            showSuccess(message) {
                calls.success.push(message);
            },
            showError(message) {
                calls.error.push(message);
            }
        },
        logger: {
            warn(...args) { calls.logger.push(['warn', ...args]); },
            debug(...args) { calls.logger.push(['debug', ...args]); },
            info(...args) { calls.logger.push(['info', ...args]); },
            error(...args) { calls.logger.push(['error', ...args]); }
        },
        fetch: async (url, options) => {
            calls.fetch.push({ url, options });
            return fetchImpl(url, options);
        }
    };

    vm.createContext(context);
    vm.runInContext(fs.readFileSync(slidesPath, 'utf8'), context, { filename: slidesPath });
    context.window.AdminSlides.init({
        getSlides: () => slides,
        refreshSlides: () => {
            calls.refresh += 1;
        }
    });

    return { context, calls };
}

test('P3-5B4.2 active toggle preserves PUT payload, feedback, logger and refresh behavior', async (t) => {
    await t.test('active slide becomes passive with is_active: 0 and refreshes after success', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [{ id: 47, is_active: 1 }],
            fetchImpl: async () => ({ ok: true, status: 200 })
        });

        await context.window.toggleSlideActive(47);

        assert.strictEqual(calls.fetch.length, 1);
        assert.strictEqual(calls.fetch[0].url, '/api/slides/47');
        assert.strictEqual(calls.fetch[0].options.method, 'PUT');
        assert.deepStrictEqual(
            JSON.parse(calls.fetch[0].options.body),
            { is_active: 0 }
        );
        assert.deepStrictEqual(calls.success, ['Slayt durumu başarıyla güncellendi!']);
        assert.deepStrictEqual(calls.error, []);
        assert.strictEqual(calls.refresh, 1);
        assert.ok(calls.logger.some(entry => entry[0] === 'info' && entry[2] === 'Slide active state toggled successfully'));
    });

    await t.test('passive slide becomes active with is_active: 1', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [{ id: 48, is_active: 0 }],
            fetchImpl: async () => ({ ok: true, status: 200 })
        });

        await context.window.toggleSlideActive(48);

        assert.deepStrictEqual(
            JSON.parse(calls.fetch[0].options.body),
            { is_active: 1 }
        );
        assert.strictEqual(calls.refresh, 1);
    });

    await t.test('HTTP failure surfaces the server error, logs it and does not refresh', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [{ id: 49, is_active: 1 }],
            fetchImpl: async () => ({
                ok: false,
                status: 500,
                async json() {
                    return { error: 'Toggle reddedildi' };
                }
            })
        });

        await context.window.toggleSlideActive(49);

        assert.deepStrictEqual(calls.success, []);
        assert.deepStrictEqual(calls.error, ['Toggle reddedildi']);
        assert.strictEqual(calls.refresh, 0);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Failed to toggle slide active state'));
    });

    await t.test('missing slide logs a warning and performs no request', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 })
        });

        await context.window.toggleSlideActive(999);

        assert.strictEqual(calls.fetch.length, 0);
        assert.strictEqual(calls.refresh, 0);
        assert.ok(calls.logger.some(entry => entry[0] === 'warn' && entry[2] === 'Slide not found for toggle'));
    });

    await t.test('network failure keeps the generic user error and logger diagnostic', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [{ id: 50, is_active: 1 }],
            fetchImpl: async () => {
                throw new Error('network down');
            }
        });

        await context.window.toggleSlideActive(50);

        assert.deepStrictEqual(calls.success, []);
        assert.deepStrictEqual(calls.error, ['Slayt durumu güncellenirken hata oluştu.']);
        assert.strictEqual(calls.refresh, 0);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Error toggling slide active state'));
    });
});
