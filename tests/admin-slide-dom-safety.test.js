const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const slidesSource = fs.readFileSync(path.join(root, 'public', 'admin', 'js', 'slides.js'), 'utf8');
const { escapeHtml } = require('../public/js/utils.js');

function renderSlides(slides) {
    const slidesList = {
        innerHTML: '',
        querySelectorAll() {
            return [];
        }
    };

    const context = {
        window: {},
        document: {
            getElementById(id) {
                return id === 'slidesList' ? slidesList : null;
            }
        },
        Utils: {
            normalizePath(value) {
                return value;
            },
            escapeHtml
        },
        CONFIG: { API_URL: '/api' },
        COMPONENTS: { ADMIN: 'ADMIN' },
        logger: {
            debug() {},
            info() {},
            warn() {},
            error() {}
        },
        fetch: async () => ({ ok: true, json: async () => ({}) }),
        FileReader: class {},
        FormData: class {},
        XMLHttpRequest: class {},
        confirm: () => true
    };

    vm.createContext(context);
    vm.runInContext(slidesSource, context, { filename: 'slides.js' });
    context.window.AdminSlides.renderSlides(slides);
    return slidesList.innerHTML;
}

test('admin slide list escapes stored title, text and fallback labels before innerHTML rendering', () => {
    const payload = '\"><img src=x onerror="globalThis.__slideXss=1">';
    const html = renderSlides([{
        id: 47,
        display_order: 1,
        title: `Başlık ${payload}`,
        content_type: `custom-${payload}`,
        media_type: 'image',
        media_path: '',
        text_content: `Metin ${payload}`,
        transition_mode: 'manual',
        transition_type: `geçiş-${payload}`,
        is_active: 1
    }]);

    assert.doesNotMatch(html, /<img src=x onerror="globalThis\.__slideXss=1">/,
        'stored slide text must never create executable admin DOM');
    assert.match(html, /Başlık &quot;&gt;&lt;img src=x onerror=&quot;globalThis\.__slideXss=1&quot;&gt;/,
        'title is rendered as escaped text');
    assert.match(html, /Metin &quot;&gt;&lt;img src=x onerror=&quot;globalThis\.__slideXss=/,
        'truncated text preview is still rendered as escaped text');
    assert.match(html, /custom-&quot;&gt;&lt;img src=x onerror=&quot;globalThis\.__slideXss=1&quot;&gt;/,
        'unknown content type fallback is escaped');
    assert.match(html, /geçiş-&quot;&gt;&lt;img src=x onerror=&quot;globalThis\.__slideXss=1&quot;&gt;/,
        'manual transition fallback is escaped');
});
