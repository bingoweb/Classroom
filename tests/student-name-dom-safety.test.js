const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('Student Name DOM Safety Tests', async (t) => {
    
    // We mock the DOM environment for the VMs
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
                    addEventListener: () => {},
                    getAttribute: function(attr) { return this[attr]; },
                    getContext: () => ({ fillRect: () => {} }),
                    appendChild: () => {},
                    removeChild: () => {},
                    children: []
                };
            }
            return domElements[id];
        };
        
        const documentMock = {
            getElementById: getEl,
            addEventListener: (event, handler) => {
                if (event === 'DOMContentLoaded') {
                    // Defer execution slightly to ensure all script defines are done, or execute inline
                    setTimeout(handler, 0);
                }
            },
            querySelector: () => getEl('qs_mock'),
            createElement: (tag) => getEl('create_' + tag)
        };
        
        const sandbox = {
            document: documentMock,
            console: { log: () => {}, error: () => {}, warn: () => {} },
            fetch: async (url) => {
                if (url && url.includes('/theme')) return { json: async () => ({ colors: 'blue,red' }) };
                return { json: async () => ({}) };
            },
            module: {},
            globalThis: {},
            CONFIG: { API_URL: '', DEFAULT_AVATAR_BOY: 'boy.png', DEFAULT_AVATAR_GIRL: 'girl.png' },
            Utils: { 
                fetchWithErrorHandling: async () => [], 
                getAvatarPath: () => 'avatar.png'
            },
            intervalManager: { setTimeout: () => {}, setInterval: () => {} },
            faceFocusEngine: { focusFace: () => {} },
            localStorage: { getItem: () => null, setItem: () => {} },
            FormData: class {},
            logger: { error: () => {}, warn: () => {}, info: () => {}, init: () => {} },
            COMPONENTS: { DASHBOARD: 'Dashboard', ADMIN_PANEL: 'AdminPanel' },
            navigator: { userAgent: '' },
            addEventListener: () => {},
            location: { reload: () => {} },
            setInterval: () => {},
            setTimeout: () => {}
        };
        sandbox.window = sandbox; // Make window reference the global sandbox
        sandbox.globalThis = sandbox; // Ensure globalThis points to sandbox
        
        return { sandbox, domElements, getEl };
    };

    const maliciousNames = [
        '"><img src=x onerror="globalThis.__xss=1">',
        '<script>globalThis.__xss=1</script>',
        'İpek & Ece <3'
    ];

    await t.test('Utils.escapeHtml correctly escapes HTML entities', () => {
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        const { sandbox } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        
        const Utils = sandbox.window.Utils || sandbox.module.exports || sandbox.Utils;
        
        assert.ok(Utils, 'Utils should be loaded');
        assert.strictEqual(typeof Utils.escapeHtml, 'function', 'escapeHtml should be exported');
        
        const input = '<script>alert("xss")</script> & "O\'Connor"';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;O&#039;Connor&quot;';
        
        assert.strictEqual(Utils.escapeHtml(input), expected, 'should successfully escape special characters');
        assert.strictEqual(Utils.escapeHtml(null), '', 'should handle null gracefully');
        assert.strictEqual(Utils.escapeHtml(undefined), '', 'should handle undefined gracefully');
        assert.strictEqual(Utils.escapeHtml('Normal Text'), 'Normal Text', 'should leave normal text untouched');
    });

    await t.test('Dashboard (script.js) safely escapes injected names', async () => {
        const scriptSource = fs.readFileSync(path.join(__dirname, '../public/js/script.js'), 'utf8');
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        sandbox.Utils = sandbox.window.Utils;
        
        const instrumentedSource = scriptSource + `
            globalThis.__testApi = { fetchData, updateStats };
        `;
        vm.runInContext(instrumentedSource, sandbox);
        
        sandbox.Utils.fetchWithErrorHandling = async (url) => {
            if (url.includes('/roles')) {
                return [
                    { role_type: 'president', id: 1, name: maliciousNames[0] },
                    { role_type: 'vice_president', id: 2, name: maliciousNames[1] },
                    { role_type: 'duty', id: 3, name: maliciousNames[2] },
                    { role_type: 'star', id: 4, name: maliciousNames[0] }
                ];
            }
            if (url.includes('/settings')) {
                return [];
            }
            return [];
        };
        
        sandbox.fetch = async (url) => {
            if (url.includes('/stats')) {
                return {
                    json: async () => ({
                        total: 10, girls: 5, boys: 5,
                        todayPresent: 9, todayAbsent: 1,
                        absentStudents: [ { id: 5, name: maliciousNames[1] } ]
                    })
                };
            }
            return { json: async () => ({}) };
        };
        
        sandbox.lastRolesHash = null;

        await sandbox.globalThis.__testApi.fetchData();
        await sandbox.globalThis.__testApi.updateStats();
        
        assert.strictEqual(sandbox.globalThis.__xss, undefined, 'XSS should not execute');
        
        const presidentHtml = getEl('president-container').innerHTML;
        const starsHtml = getEl('stars-container').innerHTML;
        const absentHtml = getEl('absent-list').innerHTML;
        
        assert.ok(!presidentHtml.includes('<script>'), 'No raw script tag in president');
        assert.ok(!presidentHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in president');
        assert.ok(presidentHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'President name is escaped');
        assert.ok(!presidentHtml.includes('Henüz sınıf başkanı belirlenmedi'), 'Assigned president does not show empty state');

        assert.ok(!presidentHtml.includes('<script>globalThis.__xss=1</script>'), 'No raw script tag in VP');
        assert.ok(presidentHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'VP name is escaped');
        
        assert.ok(!starsHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in star');
        assert.ok(starsHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Star name is escaped');
        assert.ok(!getEl('duty-container').innerHTML.includes('Bugün için nöbetçi belirlenmedi'), 'Assigned duty student does not show empty state');
        
        assert.ok(!absentHtml.includes('<script>globalThis.__xss=1</script>'), 'No raw script tag in absent list');
        assert.ok(absentHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'Absent name is escaped');
    });

    await t.test('Dashboard renders explanatory empty states for unassigned roles', async () => {
        const scriptSource = fs.readFileSync(path.join(__dirname, '../public/js/script.js'), 'utf8');
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        const { sandbox, getEl } = createSandbox();

        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        sandbox.Utils = sandbox.window.Utils;
        vm.runInContext(`${scriptSource}\n globalThis.__testApi = { fetchData };`, sandbox);

        sandbox.Utils.fetchWithErrorHandling = async (url) => {
            if (url.includes('/roles') || url.includes('/settings')) return [];
            return [];
        };

        await sandbox.globalThis.__testApi.fetchData();

        const presidentHtml = getEl('president-container').innerHTML;
        const dutyHtml = getEl('duty-container').innerHTML;

        assert.ok(presidentHtml.includes('Henüz sınıf başkanı belirlenmedi'));
        assert.ok(dutyHtml.includes('Bugün için nöbetçi belirlenmedi'));
        assert.ok(!presidentHtml.includes('>---<'));
        assert.ok(!dutyHtml.includes('>---<'));
    });

    await t.test('Admin Panel (admin.js) safely escapes injected names and handles event delegation', async () => {
        const adminSource = fs.readFileSync(path.join(__dirname, '../public/admin/admin.js'), 'utf8');
        const utilsSource = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
        
        const { sandbox, domElements, getEl } = createSandbox();
        vm.createContext(sandbox);
        vm.runInContext(utilsSource, sandbox);
        sandbox.Utils = sandbox.window.Utils;
        
        let studentListClickHandler = null;
        getEl('studentList').addEventListener = (event, handler) => {
            if (event === 'click') studentListClickHandler = handler;
        };

        const students = [
            { id: 1, name: maliciousNames[0], gender: 'M', photo: '' },
            { id: 2, name: maliciousNames[1], gender: 'F', photo: '' },
            { id: 3, name: maliciousNames[2], gender: 'M', photo: '' }
        ];

        sandbox.fetch = async (url) => {
            if (url && url.includes('/theme')) return { json: async () => ({ colors: 'blue,red' }) };
            if (url && url.includes('/students')) return { json: async () => students };
            return { json: async () => ([]) };
        };

        const instrumentedSource = adminSource + `
            globalThis.__testApi = { 
                displayStudents, 
                updateRoleSelects, 
                renderRoles, 
                renderAttendanceList
            };
        `;
        vm.runInContext(instrumentedSource, sandbox);
        
        // Wait for setTimeout to fire DOMContentLoaded
        await new Promise(resolve => setTimeout(resolve, 50));

        const roles = [
            { role_type: 'president', role_id: 1, name: maliciousNames[0] },
            { role_type: 'vice_president', role_id: 2, name: maliciousNames[1] },
            { role_type: 'duty', role_id: 3, name: maliciousNames[2] },
            { role_type: 'star', role_id: 4, name: maliciousNames[0] }
        ];

        sandbox.globalThis.__testApi.displayStudents(students);
        const listHtml = getEl('studentList').innerHTML;
        
        assert.ok(!listHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in student card');
        assert.ok(listHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Student card name is escaped');
        
        sandbox.globalThis.__testApi.updateRoleSelects(students);
        const presidentSelectHtml = getEl('presidentSelect').innerHTML;
        assert.ok(!presidentSelectHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in role select');
        assert.ok(presidentSelectHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Role select name is escaped');

        sandbox.globalThis.__testApi.renderRoles(roles);
        const currentPresidentHtml = getEl('currentPresident').innerHTML;
        const currentVicePresidentsHtml = getEl('currentVicePresidents').innerHTML;
        const currentDutyHtml = getEl('currentDuty').innerHTML;
        const currentStarsHtml = getEl('currentStars').innerHTML;
        assert.ok(!currentPresidentHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in president display');
        assert.ok(currentPresidentHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'President display name is escaped');
        assert.ok(!currentVicePresidentsHtml.includes('<script>'), 'No raw script tag in VP display');
        assert.ok(currentVicePresidentsHtml.includes('&lt;script&gt;globalThis.__xss=1&lt;/script&gt;'), 'VP display name is escaped');
        assert.ok(currentDutyHtml.includes('İpek &amp; Ece &lt;3'), 'Duty display name is escaped and preserves characters');
        assert.ok(currentStarsHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Star display name is escaped');

        sandbox.globalThis.__testApi.renderAttendanceList(students, {});
        const attendanceListHtml = getEl('attendanceList').innerHTML;
        assert.ok(!attendanceListHtml.includes('onerror="globalThis.__xss=1"'), 'No raw injected onerror attribute in attendance list');
        assert.ok(attendanceListHtml.includes('&quot;&gt;&lt;img src=x onerror=&quot;globalThis.__xss=1&quot;&gt;'), 'Attendance list name is escaped');
        
        assert.ok(attendanceListHtml.includes('İpek &amp; Ece &lt;3'), 'Turkish characters preserved while escaping special characters');
        
        let photoModalReceivedId = null;
        let photoModalReceivedName = null;
        sandbox.window.showPhotoUploadModal = (id, name) => {
            photoModalReceivedId = id;
            photoModalReceivedName = name;
        };

        const handler = studentListClickHandler;
        assert.ok(handler, 'Student list click handler should be registered');
        
        const mockEvent = {
            target: {
                classList: { contains: (cls) => cls === 'upload-photo-btn' },
                getAttribute: (attr) => {
                    if (attr === 'data-id') return 1;
                    if (attr === 'data-name') return 'ATTACKER_INJECTED_NAME';
                    return null;
                }
            }
        };
        
        handler(mockEvent);
        
        assert.strictEqual(photoModalReceivedId, 1, 'Modal received correct ID');
        assert.strictEqual(photoModalReceivedName, maliciousNames[0], 'Modal received exact unescaped malicious name from allStudents array');
        assert.notStrictEqual(photoModalReceivedName, 'ATTACKER_INJECTED_NAME', 'Modal should not read from vulnerable data-name attribute');
    });
});
