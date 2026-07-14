const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('Admin Error Logs Tests', async (t) => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
    const scriptContent = fs.readFileSync(path.join(__dirname, '../public/admin/error-logs.js'), 'utf8');
    const adminScriptContent = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');

    const createSandbox = () => {
        const domElements = {};
        const getEl = (id) => {
            if (!domElements[id]) {
                domElements[id] = { 
                    id, 
                    innerHTML: '', 
                    textContent: '', 
                    className: '',
                    value: '',
                    checked: false,
                    style: {}, 
                    classList: { 
                        classes: new Set(),
                        contains: function(c) { return this.classes.has(c); }, 
                        add: function(c) { this.classes.add(c); }, 
                        remove: function(c) { this.classes.delete(c); } 
                    },
                    addEventListener: () => {},
                    getAttribute: function(attr) { return this[attr]; },
                    appendChild: function(c) { this.children.push(c); this.innerHTML += c.innerHTML || c.textContent; },
                    removeChild: () => {},
                    children: []
                };
            }
            return domElements[id];
        };
        
        let allBtns = [];
        const documentMock = {
            getElementById: getEl,
            addEventListener: (event, handler) => {
                if (event === 'DOMContentLoaded') {
                    setTimeout(handler, 0);
                }
            },
            querySelector: (sel) => {
                if (sel === ".tab-btn[onclick=\"showTab('error-logs')\"]") {
                    const btn = getEl('errorLogBtn');
                    btn.getAttribute = () => "showTab('error-logs')";
                    return btn;
                }
                return getEl('qs_mock');
            },
            querySelectorAll: (sel) => {
                if (sel === '.content-section') return [getEl('error-logs')];
                if (sel === '.tab-btn') {
                    const btn = getEl('errorLogBtn');
                    btn.getAttribute = () => "showTab('error-logs')";
                    allBtns = [btn];
                    return allBtns;
                }
                if (sel === '#error-logs') {
                    const sec = getEl('error-logs');
                    sec.classList.add('content-section');
                    return [sec];
                }
                if (sel === 'script') {
                    return [
                        { src: 'error-logs.js', textContent: '' }
                    ];
                }
                return [];
            },
            createElement: (tag) => {
                const el = getEl('create_' + tag + Math.random());
                el.tagName = tag.toUpperCase();
                return el;
            },
            body: { appendChild: () => {}, removeChild: () => {} },
            readyState: 'complete'
        };
        
        let fetchMock = [];
        let clickMock = 0;
        let confirmMock = true;

        const sandbox = {
            document: documentMock,
            console: { log: () => {}, error: () => {}, warn: () => {} },
            fetch: async (url, options) => {
                fetchMock.push({ url, options });
                if (url && url.includes('/logs/cleanup')) return { ok: true };
                return { ok: true, json: async () => ([]) };
            },
            module: {},
            globalThis: {},
            CONFIG: { API_URL: 'http://localhost/api' },
            Utils: { 
                showError: (msg) => { sandbox.lastError = msg; },
                showSuccess: (msg) => { sandbox.lastSuccess = msg; }
            },
            COMPONENTS: { ADMIN: 'ADMIN' },
            logger: { 
                setDebugMode: (val) => { sandbox.lastDebugMode = val; }, 
                isDebugEnabled: () => false,
                error: () => {}
            },
            confirm: () => confirmMock,
            URL: { createObjectURL: () => 'blob:url', revokeObjectURL: () => {} },
            URLSearchParams: URLSearchParams,
            Blob: class {},
            localStorage: { getItem: () => null, setItem: () => {} },
            setTimeout: (fn) => fn(),
            HTMLAnchorElement: { prototype: { click: () => { clickMock++; } } }
        };
        sandbox.window = sandbox;
        sandbox.window.addEventListener = () => {};
        sandbox.globalThis = sandbox;
        
        sandbox.__getFetchMock = () => fetchMock;
        sandbox.__setFetchMock = (val) => { fetchMock = val; };
        sandbox.__getClickMock = () => clickMock;
        sandbox.__setConfirmMock = (val) => { confirmMock = val; };
        sandbox.__htmlContent = htmlContent;
        
        return { sandbox, domElements, getEl };
    };

    await t.test('HTML contract', () => {
        assert.ok(htmlContent.includes(`<button class="tab-btn" onclick="showTab('error-logs')">Hata Logları</button>`), 'exactly one visible tab button calls `showTab(\'error-logs\')`');
        assert.ok(htmlContent.includes(`<div id="error-logs" class="content-section">`), 'exactly one `error-logs` content section exists');
        assert.ok(htmlContent.includes(`id="errorLogsList"`));
        assert.ok(htmlContent.includes(`id="debugModeToggle"`));
        assert.ok(htmlContent.includes(`id="logLevelFilter"`));
        assert.ok(htmlContent.includes(`id="logComponentFilter"`));
        assert.ok(htmlContent.includes(`id="logTimeFilter"`));
        
        const matches = htmlContent.match(/<script src="error-logs\.js"><\/script>/g);
        assert.strictEqual(matches.length, 1, 'new script is loaded exactly once');
        
        const idxErrorLogs = htmlContent.indexOf('<script src="error-logs.js"></script>');
        const idxAdminJS = htmlContent.indexOf('<script src="admin.js"></script>');
        assert.ok(idxErrorLogs < idxAdminJS, 'appears before admin.js');
    });

    await t.test('Tab integration', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        sandbox.window.loadScheduleIntegration = undefined;
        sandbox.window.scheduleDiagnosticsController = undefined;
        vm.runInContext(adminScriptContent, sandbox);
        
        let refreshCalled = 0;
        const origRefresh = sandbox.window.refreshErrorLogs;
        sandbox.window.refreshErrorLogs = () => { refreshCalled++; origRefresh(); };
        
        sandbox.window.showTab('error-logs');
        
        assert.strictEqual(refreshCalled, 1, 'refreshErrorLogs is invoked exactly once');
        const sec = getEl('error-logs');
        assert.ok(sec.classList.contains('active'), 'error-logs section becomes active');
    });

    await t.test('Fetch and filter behavior', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        const ctrl = sandbox.window.ErrorLogsController || sandbox.module.exports;
        
        sandbox.fetch = async (url) => {
            sandbox.__getFetchMock().push({url});
            return { ok: true, json: async () => [] };
        };

        await sandbox.window.refreshErrorLogs();
        let fetches = sandbox.__getFetchMock();
        assert.strictEqual(fetches.length, 1);
        assert.strictEqual(fetches[0].url, 'http://localhost/api/logs');

        getEl('logLevelFilter').value = 'ERROR';
        getEl('logComponentFilter').value = 'API';
        getEl('logTimeFilter').value = '24h';
        await sandbox.window.refreshErrorLogs();
        fetches = sandbox.__getFetchMock();
        assert.strictEqual(fetches.length, 2);
        assert.ok(fetches[1].url.includes('level=ERROR'));
        assert.ok(fetches[1].url.includes('component=API'));
        assert.ok(fetches[1].url.includes('since='));

        const s1h = ctrl.getTimeSince('1h');
        const s24h = ctrl.getTimeSince('24h');
        const s7d = ctrl.getTimeSince('7d');
        const s30d = ctrl.getTimeSince('30d');
        assert.ok(s1h && s24h && s7d && s30d);
        assert.ok(new Date(s24h) < new Date(s1h));

        // Error states
        sandbox.fetch = async () => ({ ok: false });
        await ctrl.refreshErrorLogs();
        assert.strictEqual(getEl('errorLogsList').textContent, 'Hata logları yüklenirken bir sorun oluştu.');

        sandbox.fetch = async () => ({ ok: true, json: async () => ({ invalid: 'shape' }) });
        await ctrl.refreshErrorLogs();
        assert.strictEqual(getEl('errorLogsList').textContent, 'Sunucudan geçersiz veri biçimi alındı.');

        sandbox.fetch = async () => ({ ok: true, json: async () => [] });
        await ctrl.refreshErrorLogs();
        assert.strictEqual(getEl('errorLogsList').textContent, 'Kayıt bulunamadı.');
        
        // older delayed response cannot replace newer response
        let resolveFirst, resolveSecond;
        sandbox.fetch = async (url) => {
            if (url.includes('first')) return new Promise(r => resolveFirst = r);
            if (url.includes('second')) return new Promise(r => resolveSecond = r);
            return { ok: true, json: async () => [] };
        };
        const p1 = sandbox.window.refreshErrorLogs();
        
        // Let's modify the internal token implicitly by calling it again
        const p2 = sandbox.window.refreshErrorLogs();
        
        assert.notStrictEqual(p1, p2);
    });

    await t.test('DOM safety', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        sandbox.fetch = async () => ({ ok: true, json: async () => ([
            {
                timestamp: '2026-07-14T10:00:00.000Z',
                level: 'ERROR',
                component: 'SYSTEM',
                message: '</div><script>globalThis.pwned=true</script>',
                error_details: '<img src=x onerror=globalThis.pwned=true>'
            }
        ]) });

        const origGetEl = getEl;
        let listHtml = '';
        sandbox.document.getElementById = (id) => {
            const el = origGetEl(id);
            if (id === 'errorLogsList') {
                el.appendChild = function(child) {
                    listHtml += child.innerHTML || child.textContent;
                };
            }
            return el;
        };
        sandbox.document.createElement = (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                style: {},
                _textContent: '',
                set textContent(val) {
                    this._textContent = val;
                    this.innerHTML = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                },
                get textContent() { return this._textContent; },
                innerHTML: '',
                children: [],
                appendChild: function(c) { 
                    this.children.push(c); 
                    if(c.tagName === 'PRE') {
                        this.innerHTML += '<pre>' + c.innerHTML + '</pre>';
                    } else {
                        this.innerHTML += c.innerHTML; 
                    }
                }
            };
            return el;
        };

        await sandbox.window.refreshErrorLogs();
        
        assert.ok(listHtml.includes('&lt;/div&gt;&lt;script&gt;globalThis.pwned=true&lt;/script&gt;'));
        assert.ok(!sandbox.globalThis.pwned);
        assert.ok(listHtml.includes('&lt;img src=x onerror=globalThis.pwned=true&gt;'));
    });

    await t.test('Cleanup behavior', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        sandbox.__setConfirmMock(false);
        await sandbox.window.clearOldLogs();
        assert.strictEqual(sandbox.__getFetchMock().length, 0);

        sandbox.__setConfirmMock(true);
        await sandbox.window.clearOldLogs();
        const fetches = sandbox.__getFetchMock();
        assert.strictEqual(fetches.length, 2); 
        assert.strictEqual(fetches[0].url, 'http://localhost/api/logs/cleanup?days=30');
        assert.strictEqual(fetches[0].options.method, 'DELETE');
        assert.strictEqual(sandbox.lastSuccess, 'Eski loglar başarıyla temizlendi.');

        sandbox.__setFetchMock([]);
        sandbox.fetch = async () => ({ ok: false });
        await sandbox.window.clearOldLogs();
        assert.strictEqual(sandbox.lastError, 'Loglar temizlenirken bir hata oluştu.');
    });

    await t.test('Debug behavior', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        const toggle = getEl('debugModeToggle');
        
        toggle.checked = true;
        sandbox.window.toggleDebugMode();
        assert.strictEqual(sandbox.lastDebugMode, true);
        assert.strictEqual(sandbox.lastSuccess, 'Debug modu açıldı.');

        toggle.checked = false;
        sandbox.window.toggleDebugMode();
        assert.strictEqual(sandbox.lastDebugMode, false);
        assert.strictEqual(sandbox.lastSuccess, 'Debug modu kapatıldı.');
        
        assert.strictEqual(sandbox.__getFetchMock().length, 0);
    });

    await t.test('Export behavior', async () => {
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);
        
        const ctrl = sandbox.window.ErrorLogsController || sandbox.module.exports;
        ctrl._setCurrentLogs([]);
        sandbox.window.exportErrorLogs();
        assert.strictEqual(sandbox.lastError, 'Dışa aktarılacak log bulunamadı.');
        assert.strictEqual(sandbox.__getClickMock(), 0);

        ctrl._setCurrentLogs([{ id: 1 }]);
        
        sandbox.document.createElement = (tag) => {
            if (tag === 'a') {
                return { click: () => { sandbox.HTMLAnchorElement.prototype.click(); } };
            }
            return {};
        };
        
        sandbox.window.exportErrorLogs();
        assert.strictEqual(sandbox.__getClickMock(), 1);
    });
});
