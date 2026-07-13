const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('Excel Import DOM Safety Tests', async (t) => {

    const createSandbox = () => {
        const domElements = {};
        const getEl = (id) => {
            if (!domElements[id]) {
                domElements[id] = { 
                    id, 
                    innerHTML: '', 
                    textContent: '', 
                    className: '',
                    style: {}, 
                    classList: { contains: () => false, add: () => {}, remove: () => {} },
                    addEventListener: (event, handler) => {
                        domElements[id].handlers = domElements[id].handlers || {};
                        domElements[id].handlers[event] = handler;
                    },
                    getAttribute: function(attr) { return this[attr]; },
                    getContext: () => ({ fillRect: () => {} }),
                    appendChild: () => {},
                    removeChild: () => {},
                    children: [],
                    value: ''
                };
            }
            return domElements[id];
        };
        
        const documentMock = {
            getElementById: getEl,
            addEventListener: (event, handler) => {
                if (event === 'DOMContentLoaded') {
                    setTimeout(handler, 0);
                }
            },
            querySelector: () => getEl('qs_mock'),
            createElement: (tag) => getEl('create_' + tag)
        };
        
        const sandbox = {
            document: documentMock,
            console: { log: () => {}, error: () => {}, warn: () => {} },
            fetch: async () => ({ json: async () => ({}), ok: true }),
            module: {},
            globalThis: {},
            CONFIG: { API_URL: '' },
            Utils: { 
                fetchWithErrorHandling: async () => [], 
                getAvatarPath: () => 'avatar.png',
                showError: () => {},
                showSuccess: () => {}
            },
            intervalManager: { setTimeout: () => {}, setInterval: () => {} },
            faceFocusEngine: { focusFace: () => {} },
            localStorage: { getItem: () => null, setItem: () => {} },
            FormData: class { append() {} },
            logger: { error: () => {}, warn: () => {}, info: () => {}, init: () => {} },
            COMPONENTS: { DASHBOARD: 'Dashboard', ADMIN_PANEL: 'AdminPanel' },
            navigator: { userAgent: '' },
            addEventListener: () => {},
            location: { reload: () => {} },
            setInterval: () => {},
            setTimeout: (cb) => { cb(); },
            XLSX: {
                read: () => ({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } }),
                utils: { sheet_to_json: () => [] }
            },
            FileReader: class {
                readAsArrayBuffer() {
                    setTimeout(() => {
                        if (this.onload) this.onload({ target: { result: new ArrayBuffer(8) } });
                    }, 0);
                }
            }
        };
        sandbox.window = sandbox;
        sandbox.globalThis = sandbox;
        
        return { sandbox, domElements, getEl };
    };

    const maliciousValues = {
        imgOnerror: '"><img src=x onerror="globalThis.__xss=1">',
        scriptTag: '<script>globalThis.__xss=1</script>',
        normalText: 'İpek & Ece <3'
    };

    const runScript = async () => {
        const adminSource = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        sandbox.Utils = sandbox.window.Utils;
        
        // Mock UI notifications to not throw
        sandbox.Utils.showError = () => {};
        sandbox.Utils.showSuccess = () => {};

        vm.runInContext(adminSource, sandbox);
        
        // Wait for DOMContentLoaded
        await new Promise(resolve => setTimeout(resolve, 10));

        return { sandbox, domElements, getEl };
    };

    await t.test('1. Malicious filename in file selection preview', async () => {
        const { getEl } = await runScript();
        const fileInput = getEl('excelFileInput');
        
        const mockEvent = {
            target: {
                files: [{
                    name: 'malicious' + maliciousValues.imgOnerror + '.xlsx',
                    size: 1024
                }]
            }
        };
        
        assert.ok(fileInput.handlers && fileInput.handlers.change, 'Change handler should be registered');
        fileInput.handlers.change(mockEvent);
        
        const resultHtml = getEl('excelImportResult').innerHTML;
        assert.ok(!resultHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in filename preview');
        assert.ok(resultHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Filename is escaped');
    });

    await t.test('2. XLSX worksheet cells containing malicious payloads', async () => {
        const { sandbox, getEl } = await runScript();
        const fileInput = getEl('excelFileInput');
        
        sandbox.XLSX.utils.sheet_to_json = () => [
            ['Header1', 'Header2', 'Header3'],
            [maliciousValues.imgOnerror, maliciousValues.scriptTag, maliciousValues.normalText]
        ];
        
        const mockEvent = {
            target: { files: [{ name: 'test.xlsx', size: 1024 }] }
        };
        
        fileInput.handlers.change(mockEvent);
        
        // Wait for FileReader
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const previewHtml = getEl('excelContentPreview').innerHTML;
        
        // Assertions for payload escaping
        assert.ok(!previewHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in cells');
        assert.ok(!previewHtml.includes('<script>'), 'No raw script tags in cells');
        
        assert.ok(previewHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'img payload is escaped');
        assert.ok(previewHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'script payload is escaped');
        assert.ok(previewHtml.includes('İpek &amp; Ece &lt;3'), 'Turkish and special characters are properly escaped but preserved');
        
        // Assert intended HTML is preserved
        assert.ok(previewHtml.includes('<table'), 'Table element is preserved');
        assert.ok(previewHtml.includes('<td'), 'TD element is preserved');
    });

    await t.test('3. XLSX.read() throwing an error whose message contains HTML', async () => {
        const { sandbox, getEl } = await runScript();
        const fileInput = getEl('excelFileInput');
        
        sandbox.XLSX.read = () => {
            throw new Error(maliciousValues.imgOnerror);
        };
        
        const mockEvent = {
            target: { files: [{ name: 'test.xlsx', size: 1024 }] }
        };
        
        fileInput.handlers.change(mockEvent);
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const previewHtml = getEl('excelContentPreview').innerHTML;
        assert.ok(!previewHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in error message');
        assert.ok(previewHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Error message is escaped');
    });

    await t.test('4. Failed import response containing malicious error and errors[] values', async () => {
        const { sandbox, getEl } = await runScript();
        const form = getEl('excelImportForm');
        const fileInput = getEl('excelFileInput');
        fileInput.files = [{ name: 'test.xlsx' }];
        
        sandbox.fetch = async () => ({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            clone: function() { return this; },
            json: async () => ({
                error: maliciousValues.imgOnerror,
                errors: [maliciousValues.scriptTag, maliciousValues.normalText]
            })
        });
        
        assert.ok(form.handlers && form.handlers.submit, 'Submit handler should be registered');
        
        const mockEvent = { preventDefault: () => {} };
        await form.handlers.submit(mockEvent);
        
        const resultHtml = getEl('excelImportResult').innerHTML;
        
        assert.ok(!resultHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in failed response');
        assert.ok(!resultHtml.includes('<script>'), 'No raw script tags in failed response');
        
        assert.ok(resultHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Top level error message is escaped');
        assert.ok(resultHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'errors array item is escaped');
        assert.ok(resultHtml.includes('İpek &amp; Ece &lt;3'), 'errors array item preserves Turkish chars securely');
        
        // Assert intended HTML is preserved
        assert.ok(resultHtml.includes('<ul'), 'List markup is preserved');
        assert.ok(resultHtml.includes('<li>'), 'List item markup is preserved');
    });

    await t.test('5. Successful import response containing malicious message and errors[] values', async () => {
        const { sandbox, getEl } = await runScript();
        const form = getEl('excelImportForm');
        const fileInput = getEl('excelFileInput');
        fileInput.files = [{ name: 'test.xlsx' }];
        
        sandbox.fetch = async () => ({
            ok: true,
            json: async () => ({
                message: maliciousValues.imgOnerror,
                failed: 2,
                errors: [maliciousValues.scriptTag, maliciousValues.normalText]
            })
        });
        
        // Mock fetchStudents so it doesn't throw
        sandbox.globalThis.fetchStudents = () => {};

        const mockEvent = { preventDefault: () => {} };
        await form.handlers.submit(mockEvent);
        
        const resultHtml = getEl('excelImportResult').innerHTML;
        
        assert.ok(!resultHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in success response');
        assert.ok(!resultHtml.includes('<script>'), 'No raw script tags in success response');
        
        assert.ok(resultHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Success message is escaped');
        assert.ok(resultHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'errors array item is escaped');
        assert.ok(resultHtml.includes('İpek &amp; Ece &lt;3'), 'errors array item preserves Turkish chars securely');
        
        // Assert intended HTML is preserved
        assert.ok(resultHtml.includes('<ul'), 'List markup is preserved');
        assert.ok(resultHtml.includes('<li>'), 'List item markup is preserved');
        assert.ok(resultHtml.includes('<p style="color: #d32f2f;">2 öğrenci eklenemedi</p>'), 'Numeric count is unmodified');
    });

    await t.test('6. Failed import response text fallback', async () => {
        const { sandbox, getEl } = await runScript();
        const form = getEl('excelImportForm');
        const fileInput = getEl('excelFileInput');
        fileInput.files = [{ name: 'test.xlsx' }];
        
        sandbox.fetch = async () => ({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            clone: function() { return this; },
            json: async () => { throw new Error('Not JSON'); },
            text: async () => maliciousValues.imgOnerror
        });
        
        const mockEvent = { preventDefault: () => {} };
        await form.handlers.submit(mockEvent);
        
        const resultHtml = getEl('excelImportResult').innerHTML;
        
        assert.ok(!resultHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in fallback response');
        assert.ok(resultHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Fallback text is escaped');
    });
});
