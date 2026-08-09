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

    assert.match(adminSource, /AdminSlides\.init\(\{/);
    assert.match(adminSource, /AdminSlides\.renderSlides\(allSlides\)/);
    assert.doesNotMatch(adminSource, /function renderSlides\(slides\)/);

    // B4.1-B4.7 are cumulative. Slide-domain behavior lives in slides.js.
    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(/);

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
        /AdminSlides\.init\(\{[\s\S]*getSlides:\s*\(\)\s*=>\s*allSlides[\s\S]*refreshSlides:\s*fetchSlides[\s\S]*\}\)/
    );
    assert.doesNotMatch(adminSource, /window\.toggleSlideActive\s*=/);

    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(/);
});

test('P3-5B4.3 extracts drag/reorder ownership into slides.js without shell callback injection', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /function setupDragAndDrop\(\)/);
    assert.match(slidesSource, /function handleDragStart\(e\)/);
    assert.match(slidesSource, /function handleDrop\(e\)/);
    assert.match(slidesSource, /async function reorderSlides\(/);
    assert.match(slidesSource, /setupDragAndDrop\(\);/);
    assert.match(slidesSource, /reorderSlides/);

    assert.doesNotMatch(adminSource, /function setupDragAndDrop\(\)/);
    assert.doesNotMatch(adminSource, /async function reorderSlides\(/);
    assert.doesNotMatch(adminSource, /setupDragAndDrop\s*[,}]/);

    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(/);
});

test('P3-5B4.4 extracts slide form open/close/edit ownership while media preview stays in the shell', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /let currentEditingSlide = null/);
    assert.match(slidesSource, /function showSlideForm\(slideId = null\)/);
    assert.match(slidesSource, /function closeSlideForm\(\)/);
    assert.match(slidesSource, /function editSlide\(id\)/);
    assert.match(slidesSource, /function getCurrentEditingSlideId\(\)/);
    assert.match(slidesSource, /window\.showSlideForm\s*=\s*showSlideForm/);
    assert.match(slidesSource, /window\.closeSlideForm\s*=\s*closeSlideForm/);
    assert.match(slidesSource, /window\.editSlide\s*=\s*editSlide/);

    assert.doesNotMatch(adminSource, /let currentEditingSlide\s*=/);
    assert.doesNotMatch(adminSource, /window\.showSlideForm\s*=/);
    assert.doesNotMatch(adminSource, /window\.closeSlideForm\s*=/);
    assert.doesNotMatch(adminSource, /window\.editSlide\s*=/);

    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(/);
});

test('P3-5B4.5 extracts media preview ownership and change binding into slides.js', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /function prepareSlideMediaForm\(slide\)/);
    assert.match(slidesSource, /function resetSlideMediaForm\(\)/);
    assert.match(slidesSource, /function handleSlideMediaChange\(e\)/);
    assert.match(slidesSource, /slideMedia\.addEventListener\('change', handleSlideMediaChange\)/);
    assert.match(slidesSource, /Utils\.normalizePath\(slide\.media_path, true\)/);
    assert.match(slidesSource, /new FileReader\(\)/);

    assert.doesNotMatch(adminSource, /function prepareSlideMediaForm\(slide\)/);
    assert.doesNotMatch(adminSource, /function resetSlideMediaForm\(\)/);
    assert.doesNotMatch(adminSource, /function handleSlideMediaChange\(e\)/);
    assert.doesNotMatch(adminSource, /slideMedia\.addEventListener\('change', handleSlideMediaChange\)/);
    assert.doesNotMatch(adminSource, /prepareMediaForm:\s*prepareSlideMediaForm/);
    assert.doesNotMatch(adminSource, /resetMediaForm:\s*resetSlideMediaForm/);

    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(/);
});

test('P3-5B4.6 extracts create/update/delete ownership and submit binding into slides.js', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /async function handleSlideSubmit\(e\)/);
    assert.match(slidesSource, /async function deleteSlide\(id\)/);
    assert.match(slidesSource, /slideForm\.addEventListener\('submit', handleSlideSubmit\)/);
    assert.match(slidesSource, /window\.deleteSlide\s*=\s*deleteSlide/);
    assert.match(slidesSource, /new XMLHttpRequest\(\)/);
    assert.match(slidesSource, /window\.getAdminCsrfToken/);

    assert.doesNotMatch(adminSource, /async function handleSlideSubmit\(e\)/);
    assert.doesNotMatch(adminSource, /window\.deleteSlide\s*=/);
    assert.doesNotMatch(adminSource, /slideForm\.addEventListener\('submit', handleSlideSubmit\)/);

    // B4.7 completes the remaining slide-domain ownership.
    assert.doesNotMatch(adminSource, /async function fetchSlideSettings\(\)/);
    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(e\)/);
});

test('P3-5B4.7 extracts slide settings and form visibility ownership into slides.js', () => {
    const adminSource = fs.readFileSync(adminPath, 'utf8');
    const slidesSource = fs.readFileSync(slidesPath, 'utf8');

    assert.match(slidesSource, /async function fetchSlideSettings\(\)/);
    assert.match(slidesSource, /function handleContentTypeChange\(\)/);
    assert.match(slidesSource, /function handleTransitionModeChange\(\)/);
    assert.match(slidesSource, /async function handleSlideSettingsSubmit\(e\)/);
    assert.match(slidesSource, /slideContentType\.addEventListener\('change', handleContentTypeChange\)/);
    assert.match(slidesSource, /slideTransitionMode\.addEventListener\('change', handleTransitionModeChange\)/);
    assert.match(slidesSource, /slideSettingsForm\.addEventListener\('submit', handleSlideSettingsSubmit\)/);

    assert.doesNotMatch(adminSource, /async function fetchSlideSettings\(\)/);
    assert.doesNotMatch(adminSource, /function handleContentTypeChange\(\)/);
    assert.doesNotMatch(adminSource, /function handleTransitionModeChange\(\)/);
    assert.doesNotMatch(adminSource, /async function handleSlideSettingsSubmit\(e\)/);
    assert.doesNotMatch(adminSource, /syncContentType:\s*handleContentTypeChange/);
    assert.doesNotMatch(adminSource, /syncTransitionMode:\s*handleTransitionModeChange/);
    assert.doesNotMatch(adminSource, /slideContentType\.addEventListener\('change', handleContentTypeChange\)/);
    assert.doesNotMatch(adminSource, /slideTransitionMode\.addEventListener\('change', handleTransitionModeChange\)/);
    assert.doesNotMatch(adminSource, /slideSettingsForm\.addEventListener\('submit', handleSlideSettingsSubmit\)/);

    assert.match(
        adminSource,
        /AdminSlides\.init\(\{[\s\S]*getSlides:\s*\(\)\s*=>\s*allSlides[\s\S]*refreshSlides:\s*fetchSlides[\s\S]*\}\)/
    );
    assert.match(adminSource, /AdminSlides\.fetchSlideSettings\(\);/);
    assert.match(adminSource, /let allSlides\s*=\s*\[\]/);
    assert.match(adminSource, /async function fetchSlides\(\)/);
    assert.match(adminSource, /AdminSlides\.renderSlides\(allSlides\)/);
});

test('P3-5B4.7 settings read and slide-only visibility bindings preserve behavior', async (t) => {
    await t.test('init binds content type, transition mode and settings submit handlers', () => {
        const { elements, document } = createSlideFormDocument();
        loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document
        });

        assert.strictEqual(typeof elements.get('slideContentType').listeners.get('change'), 'function');
        assert.strictEqual(typeof elements.get('slideTransitionMode').listeners.get('change'), 'function');
        assert.strictEqual(typeof elements.get('slideSettingsForm').listeners.get('submit'), 'function');
    });

    await t.test('fetchSlideSettings normalizes millisecond settings into form seconds', async () => {
        const { elements, document } = createSlideFormDocument();
        const { context, calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({
                ok: true,
                status: 200,
                async json() {
                    return {
                        default_duration: '14000',
                        default_transition_mode: 'random',
                        default_transition_duration: '1750'
                    };
                }
            }),
            documentImpl: document
        });

        await context.window.AdminSlides.fetchSlideSettings();

        assert.strictEqual(calls.fetch.length, 1);
        assert.strictEqual(calls.fetch[0].url, '/api/slide-settings');
        assert.strictEqual(calls.fetch[0].options, undefined);
        assert.strictEqual(elements.get('defaultDuration').value, 14);
        assert.strictEqual(elements.get('defaultTransitionMode').value, 'random');
        assert.strictEqual(elements.get('defaultTransitionDuration').value, 1.75);
    });

    await t.test('editing video and subsequent form changes update only slide visibility surfaces', () => {
        const { elements, document } = createSlideFormDocument();
        const slide = {
            id: 91,
            content_type: 'announcement',
            media_type: 'video',
            media_path: '/uploads/slides/video.mp4',
            transition_mode: 'manual'
        };
        const { context } = loadSlidesModule({
            slides: [slide],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document
        });

        context.window.editSlide(91);
        assert.strictEqual(elements.get('slideTextContentDiv').style.display, 'none');
        assert.strictEqual(elements.get('slideVideoSettings').style.display, 'block');
        assert.strictEqual(elements.get('slideTransitionManualDiv').style.display, 'block');

        elements.get('slideContentType').value = 'rule';
        elements.get('slideMedia').files = [{ type: 'image/png' }];
        elements.get('slideContentType').listeners.get('change')();
        assert.strictEqual(elements.get('slideTextContentDiv').style.display, 'block');
        assert.strictEqual(elements.get('slideVideoSettings').style.display, 'none');

        elements.get('slideMedia').files = [{ type: 'video/mp4' }];
        elements.get('slideContentType').listeners.get('change')();
        assert.strictEqual(elements.get('slideVideoSettings').style.display, 'block');

        elements.get('slideTransitionMode').value = 'auto';
        elements.get('slideTransitionMode').listeners.get('change')();
        assert.strictEqual(elements.get('slideTransitionManualDiv').style.display, 'none');
    });
});

function loadSlidesModule({
    slides,
    fetchImpl,
    documentImpl,
    FileReaderImpl,
    FormDataImpl,
    XMLHttpRequestImpl,
    confirmImpl,
    getAdminCsrfToken
}) {
    const calls = {
        fetch: [],
        refresh: 0,
        success: [],
        error: [],
        logger: [],
        normalize: []
    };

    const context = {
        window: {},
        document: documentImpl || {
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
            },
            normalizePath(value, forAdmin) {
                calls.normalize.push({ value, forAdmin });
                return `/normalized/${value}`;
            },
            escapeHtml(value) {
                const map = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };
                return String(value == null ? '' : value).replace(/[&<>"']/g, match => map[match]);
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
        },
        FileReader: FileReaderImpl || class {
            readAsDataURL() {}
        },
        FormData: FormDataImpl || class {
            append() {}
        },
        XMLHttpRequest: XMLHttpRequestImpl || class {},
        confirm: confirmImpl || (() => true)
    };
    context.window.getAdminCsrfToken = getAdminCsrfToken;

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

function createSlideFormDocument() {
    const elements = new Map();
    const ids = [
        'slideFormModal',
        'slideFormTitle',
        'slideForm',
        'slideId',
        'slideTitle',
        'slideContentType',
        'slideTextContent',
        'slideDisplayDuration',
        'slideVideoAutoAdvance',
        'slideTransitionMode',
        'slideTransitionType',
        'slideTransitionDuration',
        'slideMedia',
        'slideMediaLabel',
        'slideMediaPreview',
        'slideMediaInfo',
        'slideCurrentMediaInfo',
        'slideUploadProgress',
        'slideProgressBar',
        'slideProgressText',
        'slideTextContentDiv',
        'slideVideoSettings',
        'slideTransitionManualDiv',
        'defaultDuration',
        'defaultTransitionMode',
        'defaultTransitionDuration',
        'slideSettingsForm'
    ];

    ids.forEach((id) => {
        elements.set(id, {
            id,
            value: '',
            checked: false,
            textContent: '',
            innerHTML: '',
            files: [],
            style: {},
            attributes: new Map(),
            listeners: new Map(),
            resetCount: 0,
            reset() {
                this.resetCount += 1;
            },
            setAttribute(name, value) {
                this.attributes.set(name, value);
            },
            removeAttribute(name) {
                this.attributes.delete(name);
            },
            hasAttribute(name) {
                return this.attributes.has(name);
            },
            addEventListener(type, handler) {
                this.listeners.set(type, handler);
            }
        });
    });

    return {
        elements,
        document: {
            getElementById(id) {
                return elements.get(id) || null;
            }
        }
    };
}

test('P3-5B4.4 form ownership preserves add/edit/close state with B4.5-B4.7 slide behavior internalized', async (t) => {
    await t.test('new slide opens a reset form with required media and keeps editing state null', () => {
        const { elements, document } = createSlideFormDocument();
        elements.get('slideId').value = 88;
        elements.get('slideTransitionMode').value = 'auto';
        const { context } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document
        });

        context.window.showSlideForm();

        assert.strictEqual(elements.get('slideFormTitle').textContent, 'Yeni Slayt Ekle');
        assert.strictEqual(elements.get('slideForm').resetCount, 1);
        assert.strictEqual(elements.get('slideFormModal').style.display, 'flex');
        assert.strictEqual(elements.get('slideId').value, '');
        assert.strictEqual(context.window.AdminSlides.getCurrentEditingSlideId(), null);
        assert.strictEqual(elements.get('slideMedia').hasAttribute('required'), true);
        assert.strictEqual(elements.get('slideMediaLabel').textContent, 'Medya Dosyası * (Resim, GIF veya Video - Max 100 MB)');
        assert.strictEqual(elements.get('slideMediaPreview').innerHTML, '');
        assert.strictEqual(elements.get('slideTextContentDiv').style.display, 'none');
        assert.strictEqual(elements.get('slideVideoSettings').style.display, 'none');
        assert.strictEqual(elements.get('slideTransitionManualDiv').style.display, 'none');
    });

    await t.test('editing a slide populates fields and renders normalized existing media preview', () => {
        const { elements, document } = createSlideFormDocument();
        const slide = {
            id: 47,
            title: 'Düzenlenecek Slayt',
            content_type: 'rule',
            text_content: 'Kural metni',
            display_duration: 12500,
            video_auto_advance: 1,
            transition_mode: 'manual',
            transition_type: 'fade',
            transition_duration: 1750,
            media_type: 'image',
            media_path: 'assets/default_boy.png'
        };
        const { context, calls } = loadSlidesModule({
            slides: [slide],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document
        });

        context.window.editSlide(47);

        assert.strictEqual(context.window.AdminSlides.getCurrentEditingSlideId(), 47);
        assert.strictEqual(elements.get('slideFormTitle').textContent, 'Slayt Düzenle');
        assert.strictEqual(elements.get('slideId').value, 47);
        assert.strictEqual(elements.get('slideTitle').value, 'Düzenlenecek Slayt');
        assert.strictEqual(elements.get('slideContentType').value, 'rule');
        assert.strictEqual(elements.get('slideTextContent').value, 'Kural metni');
        assert.strictEqual(elements.get('slideDisplayDuration').value, 12.5);
        assert.strictEqual(elements.get('slideVideoAutoAdvance').checked, true);
        assert.strictEqual(elements.get('slideTransitionMode').value, 'manual');
        assert.strictEqual(elements.get('slideTransitionType').value, 'fade');
        assert.strictEqual(elements.get('slideTransitionDuration').value, 1.75);
        assert.strictEqual(elements.get('slideFormModal').style.display, 'flex');
        assert.strictEqual(elements.get('slideMedia').hasAttribute('required'), false);
        assert.match(elements.get('slideMediaPreview').innerHTML, /<img src="\/normalized\/assets\/default_boy\.png"/);
        assert.match(elements.get('slideCurrentMediaInfo').innerHTML, /Mevcut medya: Resim/);
        assert.deepStrictEqual(calls.normalize, [{ value: 'assets/default_boy.png', forAdmin: true }]);
        assert.strictEqual(elements.get('slideTextContentDiv').style.display, 'block');
        assert.strictEqual(elements.get('slideVideoSettings').style.display, 'none');
        assert.strictEqual(elements.get('slideTransitionManualDiv').style.display, 'block');
    });

    await t.test('close clears editing state, resets media fields and hides upload progress', () => {
        const { elements, document } = createSlideFormDocument();
        const { context } = loadSlidesModule({
            slides: [{ id: 51, title: 'Close test' }],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document
        });

        context.window.showSlideForm(51);
        elements.get('slideMediaPreview').innerHTML = 'preview';
        elements.get('slideMediaInfo').textContent = 'info';
        elements.get('slideCurrentMediaInfo').textContent = 'current';
        elements.get('slideUploadProgress').style.display = 'block';
        context.window.closeSlideForm();

        assert.strictEqual(elements.get('slideFormModal').style.display, 'none');
        assert.strictEqual(elements.get('slideForm').resetCount, 1);
        assert.strictEqual(elements.get('slideId').value, '');
        assert.strictEqual(context.window.AdminSlides.getCurrentEditingSlideId(), null);
        assert.strictEqual(elements.get('slideMedia').hasAttribute('required'), true);
        assert.strictEqual(elements.get('slideMediaPreview').innerHTML, '');
        assert.strictEqual(elements.get('slideMediaInfo').textContent, '');
        assert.strictEqual(elements.get('slideCurrentMediaInfo').textContent, '');
        assert.strictEqual(elements.get('slideUploadProgress').style.display, 'none');
    });
});

test('P3-5B4.5 media preview preserves existing-media restore, validation and FileReader rendering', async (t) => {
    await t.test('init owns the media change listener and empty selection restores the editing slide preview', () => {
        const { elements, document } = createSlideFormDocument();
        const slide = { id: 61, media_type: 'image', media_path: 'assets/default_girl.png' };
        const { context, calls } = loadSlidesModule({
            slides: [slide],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {}
        });

        context.window.showSlideForm(61);
        elements.get('slideMediaPreview').innerHTML = '';
        elements.get('slideCurrentMediaInfo').innerHTML = '';
        elements.get('slideMedia').files = [];
        const changeHandler = elements.get('slideMedia').listeners.get('change');
        assert.strictEqual(typeof changeHandler, 'function');
        changeHandler({ target: elements.get('slideMedia') });

        assert.match(elements.get('slideMediaPreview').innerHTML, /Mevcut Resim/);
        assert.match(elements.get('slideCurrentMediaInfo').innerHTML, /default_girl\.png/);
        assert.deepStrictEqual(calls.normalize, [
            { value: 'assets/default_girl.png', forAdmin: true },
            { value: 'assets/default_girl.png', forAdmin: true }
        ]);
    });

    await t.test('oversized media is rejected, input is cleared and no FileReader is created', () => {
        const { elements, document } = createSlideFormDocument();
        let readerCount = 0;
        class FakeReader {
            constructor() { readerCount += 1; }
            readAsDataURL() {}
        }
        const { calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FileReaderImpl: FakeReader
        });
        const input = elements.get('slideMedia');
        input.value = 'too-big.mp4';
        input.files = [{ name: 'too-big.mp4', type: 'video/mp4', size: 100 * 1024 * 1024 + 1 }];

        input.listeners.get('change')({ target: input });

        assert.deepStrictEqual(calls.error, ["Dosya boyutu 100 MB'dan büyük olamaz!"]);
        assert.strictEqual(input.value, '');
        assert.strictEqual(readerCount, 0);
    });

    await t.test('new image media clears existing info, reports file size and renders FileReader preview', () => {
        const { elements, document } = createSlideFormDocument();
        class FakeReader {
            readAsDataURL(file) {
                this.onload({ target: { result: `data:${file.type};base64,TEST` } });
            }
        }
        loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FileReaderImpl: FakeReader
        });
        const input = elements.get('slideMedia');
        elements.get('slideCurrentMediaInfo').textContent = 'old';
        input.files = [{ name: 'poster.png', type: 'image/png', size: 1024 * 1024 }];

        input.listeners.get('change')({ target: input });

        assert.strictEqual(elements.get('slideCurrentMediaInfo').textContent, '');
        assert.strictEqual(elements.get('slideMediaInfo').textContent, 'Yeni dosya: poster.png (1.00 MB)');
        assert.match(elements.get('slideMediaPreview').innerHTML, /Yeni Resim Önizlemesi/);
        assert.match(elements.get('slideMediaPreview').innerHTML, /data:image\/png;base64,TEST/);
    });

    await t.test('new video media renders the existing video preview contract', () => {
        const { elements, document } = createSlideFormDocument();
        class FakeReader {
            readAsDataURL(file) {
                this.onload({ target: { result: `data:${file.type};base64,VIDEO` } });
            }
        }
        loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FileReaderImpl: FakeReader
        });
        const input = elements.get('slideMedia');
        input.files = [{ name: 'clip.mp4', type: 'video/mp4', size: 2 * 1024 * 1024 }];

        input.listeners.get('change')({ target: input });

        assert.strictEqual(elements.get('slideMediaInfo').textContent, 'Yeni dosya: clip.mp4 (2.00 MB)');
        assert.match(elements.get('slideMediaPreview').innerHTML, /<video src="data:video\/mp4;base64,VIDEO"/);
        assert.match(elements.get('slideMediaPreview').innerHTML, /Yeni Video Önizlemesi/);
    });
});

function createRecordingFormDataClass() {
    return class RecordingFormData {
        constructor() {
            this.entries = [];
        }

        append(name, value) {
            this.entries.push([name, value]);
        }
    };
}

function createRecordingXhrClass(instances) {
    return class RecordingXMLHttpRequest {
        constructor() {
            this.upload = {};
            this.headers = {};
            this.status = 0;
            this.statusText = '';
            this.responseText = '';
            instances.push(this);
        }

        open(method, url) {
            this.method = method;
            this.url = url;
        }

        setRequestHeader(name, value) {
            this.headers[name] = value;
        }

        send(body) {
            this.sentBody = body;
        }
    };
}

test('P3-5B4.6 CRUD preserves validation, upload request, feedback and delete behavior', async (t) => {
    await t.test('init owns form submit binding and missing content type performs no request', async () => {
        const { elements, document } = createSlideFormDocument();
        const xhrInstances = [];
        loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FormDataImpl: createRecordingFormDataClass(),
            XMLHttpRequestImpl: createRecordingXhrClass(xhrInstances)
        });

        const submitHandler = elements.get('slideForm').listeners.get('submit');
        assert.strictEqual(typeof submitHandler, 'function');
        await submitHandler({ preventDefault() {} });

        assert.strictEqual(xhrInstances.length, 0);
    });

    await t.test('new slide without media is rejected before XMLHttpRequest creation', async () => {
        const { elements, document } = createSlideFormDocument();
        const xhrInstances = [];
        const { calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FormDataImpl: createRecordingFormDataClass(),
            XMLHttpRequestImpl: createRecordingXhrClass(xhrInstances)
        });
        elements.get('slideContentType').value = 'rule';

        await elements.get('slideForm').listeners.get('submit')({ preventDefault() {} });

        assert.deepStrictEqual(calls.error, ['Yeni slayt için medya dosyası gereklidir!']);
        assert.strictEqual(xhrInstances.length, 0);
    });

    await t.test('new image slide uses POST, CSRF, FormData media type, progress and success refresh', async () => {
        const { elements, document } = createSlideFormDocument();
        const xhrInstances = [];
        const RecordingFormData = createRecordingFormDataClass();
        const { calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FormDataImpl: RecordingFormData,
            XMLHttpRequestImpl: createRecordingXhrClass(xhrInstances),
            getAdminCsrfToken: async () => 'csrf-b46'
        });
        elements.get('slideTitle').value = 'B4.6 create';
        elements.get('slideContentType').value = 'rule';
        elements.get('slideTextContent').value = 'Create text';
        elements.get('slideDisplayDuration').value = '12';
        elements.get('slideVideoAutoAdvance').checked = true;
        elements.get('slideTransitionMode').value = 'manual';
        elements.get('slideTransitionType').value = 'fade';
        elements.get('slideTransitionDuration').value = '1.5';
        const file = { name: 'poster.png', type: 'image/png', size: 1024 };
        elements.get('slideMedia').files = [file];

        await elements.get('slideForm').listeners.get('submit')({ preventDefault() {} });

        assert.strictEqual(xhrInstances.length, 1);
        const xhr = xhrInstances[0];
        assert.strictEqual(xhr.method, 'POST');
        assert.strictEqual(xhr.url, '/api/slides');
        assert.strictEqual(xhr.headers['X-CSRF-Token'], 'csrf-b46');
        assert.ok(xhr.sentBody instanceof RecordingFormData);
        assert.deepStrictEqual(xhr.sentBody.entries, [
            ['slide', file],
            ['title', 'B4.6 create'],
            ['content_type', 'rule'],
            ['text_content', 'Create text'],
            ['display_duration', '12'],
            ['video_auto_advance', true],
            ['transition_mode', 'manual'],
            ['transition_type', 'fade'],
            ['transition_duration', '1.5'],
            ['media_type', 'image']
        ]);
        assert.strictEqual(elements.get('slideUploadProgress').style.display, 'block');
        assert.strictEqual(elements.get('slideProgressBar').style.width, '0%');
        assert.strictEqual(elements.get('slideProgressText').textContent, 'Yükleniyor...');

        xhr.upload.onprogress({ lengthComputable: true, loaded: 1, total: 2 });
        assert.strictEqual(elements.get('slideProgressBar').style.width, '50%');
        assert.strictEqual(elements.get('slideProgressText').textContent, 'Yükleniyor... 50%');

        xhr.status = 201;
        xhr.responseText = '{"id":71}';
        xhr.onload();

        assert.deepStrictEqual(calls.success, ['Slayt başarıyla eklendi!']);
        assert.deepStrictEqual(calls.error, []);
        assert.strictEqual(calls.refresh, 1);
        assert.strictEqual(elements.get('slideUploadProgress').style.display, 'none');
        assert.strictEqual(elements.get('slideFormModal').style.display, 'none');
    });

    await t.test('editing without a new file uses PUT and preserves the existing media type', async () => {
        const { elements, document } = createSlideFormDocument();
        const xhrInstances = [];
        const RecordingFormData = createRecordingFormDataClass();
        loadSlidesModule({
            slides: [{ id: 72, media_type: 'video' }],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FormDataImpl: RecordingFormData,
            XMLHttpRequestImpl: createRecordingXhrClass(xhrInstances)
        });
        elements.get('slideId').value = '72';
        elements.get('slideContentType').value = 'celebration';
        elements.get('slideMedia').files = [];

        await elements.get('slideForm').listeners.get('submit')({ preventDefault() {} });

        const xhr = xhrInstances[0];
        assert.strictEqual(xhr.method, 'PUT');
        assert.strictEqual(xhr.url, '/api/slides/72');
        assert.deepStrictEqual(
            xhr.sentBody.entries.filter(([name]) => name === 'media_type'),
            [['media_type', 'video']]
        );
        assert.deepStrictEqual(
            xhr.sentBody.entries.filter(([name]) => name === 'slide'),
            []
        );
        assert.notStrictEqual(elements.get('slideUploadProgress').style.display, 'block');
    });

    await t.test('XHR HTTP and network failures preserve bounded user feedback', async () => {
        const { elements, document } = createSlideFormDocument();
        const xhrInstances = [];
        const { calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl: document,
            syncContentType() {},
            syncTransitionMode() {},
            FormDataImpl: createRecordingFormDataClass(),
            XMLHttpRequestImpl: createRecordingXhrClass(xhrInstances)
        });
        elements.get('slideContentType').value = 'photo';
        elements.get('slideMedia').files = [{ name: 'photo.jpg', type: 'image/jpeg', size: 100 }];

        await elements.get('slideForm').listeners.get('submit')({ preventDefault() {} });
        const xhr = xhrInstances[0];
        xhr.status = 400;
        xhr.responseText = '{"error":"Kaydetme reddedildi"}';
        xhr.onload();
        assert.deepStrictEqual(calls.error, ['Kaydetme reddedildi']);

        calls.error.length = 0;
        xhr.onerror();
        assert.deepStrictEqual(calls.error, ['Slayt kaydedilirken hata oluştu.']);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Network error saving slide'));
    });

    await t.test('delete cancellation performs no request', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            confirmImpl: () => false
        });

        await context.window.deleteSlide(80);

        assert.strictEqual(calls.fetch.length, 0);
        assert.strictEqual(calls.refresh, 0);
    });

    await t.test('successful delete uses DELETE, shows success and refreshes', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            confirmImpl: () => true
        });

        await context.window.deleteSlide(81);

        assert.strictEqual(calls.fetch.length, 1);
        assert.strictEqual(calls.fetch[0].url, '/api/slides/81');
        assert.strictEqual(calls.fetch[0].options.method, 'DELETE');
        assert.deepStrictEqual(calls.success, ['Slayt başarıyla silindi!']);
        assert.strictEqual(calls.refresh, 1);
    });

    await t.test('delete HTTP and network failures keep safe feedback and diagnostics', async () => {
        let mode = 'http';
        const networkError = new Error('delete network detail');
        const { context, calls } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => {
                if (mode === 'network') throw networkError;
                return {
                    ok: false,
                    status: 409,
                    clone() {
                        return {
                            async json() { return { error: 'Silme reddedildi' }; },
                            async text() { return 'unused'; }
                        };
                    }
                };
            },
            confirmImpl: () => true
        });

        await context.window.deleteSlide(82);
        assert.deepStrictEqual(calls.error, ['Silme reddedildi']);
        assert.strictEqual(calls.refresh, 0);

        calls.error.length = 0;
        mode = 'network';
        await context.window.deleteSlide(82);
        assert.deepStrictEqual(calls.error, ['Slayt silinirken hata oluştu.']);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Error deleting slide' && entry.includes(networkError)));
    });
});

test('P3-5B4.3 drag/reorder preserves binding, swap payload, feedback, logger and refresh behavior', async (t) => {
    await t.test('setupDragAndDrop binds the four existing handlers and dragend restores opacity', () => {
        const listeners = new Map();
        const item = {
            style: {},
            addEventListener(type, handler) {
                listeners.set(type, handler);
            }
        };
        const documentImpl = {
            getElementById(id) {
                if (id !== 'slidesList') return null;
                return {
                    querySelectorAll(selector) {
                        assert.strictEqual(selector, '.slide-item');
                        return [item];
                    }
                };
            }
        };
        const { context } = loadSlidesModule({
            slides: [],
            fetchImpl: async () => ({ ok: true, status: 200 }),
            documentImpl
        });

        context.window.AdminSlides.setupDragAndDrop();

        assert.deepStrictEqual(
            [...listeners.keys()].sort(),
            ['dragend', 'dragover', 'dragstart', 'drop']
        );
        const dataTransfer = {};
        listeners.get('dragstart').call(item, { dataTransfer });
        assert.strictEqual(item.style.opacity, '0.5');
        assert.strictEqual(dataTransfer.effectAllowed, 'move');
        listeners.get('dragend').call(item, {});
        assert.strictEqual(item.style.opacity, '1');
    });

    await t.test('successful reorder swaps only dragged and target display orders and refreshes', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [
                { id: 11, display_order: 1 },
                { id: 12, display_order: 2 },
                { id: 13, display_order: 3 }
            ],
            fetchImpl: async () => ({ ok: true, status: 200 })
        });

        await context.window.AdminSlides.reorderSlides(11, 1, 12, 2);

        assert.strictEqual(calls.fetch.length, 1);
        assert.strictEqual(calls.fetch[0].url, '/api/slides/reorder');
        assert.strictEqual(calls.fetch[0].options.method, 'PUT');
        assert.deepStrictEqual(
            JSON.parse(calls.fetch[0].options.body),
            {
                slideOrders: [
                    { id: 11, display_order: 2 },
                    { id: 12, display_order: 1 },
                    { id: 13, display_order: 3 }
                ]
            }
        );
        assert.deepStrictEqual(calls.success, ['Sıralama başarıyla güncellendi']);
        assert.deepStrictEqual(calls.error, []);
        assert.strictEqual(calls.refresh, 1);
        assert.ok(calls.logger.some(entry => entry[0] === 'info' && entry[2] === 'Slides reordered successfully'));
    });

    await t.test('HTTP failure surfaces server error and refreshes the management list', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [
                { id: 21, display_order: 1 },
                { id: 22, display_order: 2 }
            ],
            fetchImpl: async () => ({
                ok: false,
                status: 409,
                clone() {
                    return {
                        async json() {
                            return { error: 'Sıralama reddedildi' };
                        },
                        async text() {
                            return 'unused';
                        }
                    };
                }
            })
        });

        await context.window.AdminSlides.reorderSlides(21, 1, 22, 2);

        assert.deepStrictEqual(calls.success, []);
        assert.deepStrictEqual(calls.error, ['Sıralama reddedildi']);
        assert.strictEqual(calls.refresh, 1);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Failed to reorder slides'));
    });

    await t.test('network failure keeps generic error, logs diagnostics and refreshes', async () => {
        const { context, calls } = loadSlidesModule({
            slides: [
                { id: 31, display_order: 1 },
                { id: 32, display_order: 2 }
            ],
            fetchImpl: async () => {
                throw new Error('network down');
            }
        });

        await context.window.AdminSlides.reorderSlides(31, 1, 32, 2);

        assert.deepStrictEqual(calls.success, []);
        assert.deepStrictEqual(calls.error, ['Sıralama güncellenirken hata oluştu']);
        assert.strictEqual(calls.refresh, 1);
        assert.ok(calls.logger.some(entry => entry[0] === 'error' && entry[2] === 'Error reordering slides'));
    });
});

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
