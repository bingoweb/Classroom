const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const moduleContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'schedule-draft-editor.js'), 'utf8');
const scriptContext = {};
const factory = new Function('module', 'window', moduleContent + '\nreturn AdminScheduleDraftEditor;');
const AdminScheduleDraftEditor = factory(undefined, scriptContext);

const {
    createCanonicalDraftRow,
    areDraftRowsEqual,
    translateDraftIssueCode,
    createDraftValidationResult,
    createScheduleDraftEditorController
} = AdminScheduleDraftEditor;

// Canonicalization
test('createCanonicalDraftRow returns empty object for null', () => {
    assert.deepEqual(createCanonicalDraftRow(null), {});
});
test('createCanonicalDraftRow returns empty object for undefined', () => {
    assert.deepEqual(createCanonicalDraftRow(undefined), {});
});
test('createCanonicalDraftRow returns empty object for array', () => {
    assert.deepEqual(createCanonicalDraftRow([]), {});
});
test('createCanonicalDraftRow strips id and duration', () => {
    const row = { id: '123', name: 'A', duration: 40 };
    const canonical = createCanonicalDraftRow(row);
    assert.equal(canonical.id, undefined);
    assert.equal(canonical.duration, undefined);
    assert.equal(canonical.name, 'A');
});
test('createCanonicalDraftRow trims name', () => {
    assert.equal(createCanonicalDraftRow({ name: ' A ' }).name, 'A');
});
test('createCanonicalDraftRow trims type', () => {
    assert.equal(createCanonicalDraftRow({ type: ' break ' }).type, 'break');
});
test('createCanonicalDraftRow trims start', () => {
    assert.equal(createCanonicalDraftRow({ start: ' 09:00 ' }).start, '09:00');
});
test('createCanonicalDraftRow trims end', () => {
    assert.equal(createCanonicalDraftRow({ end: ' 09:40 ' }).end, '09:40');
});
test('createCanonicalDraftRow converts numbers to string', () => {
    assert.equal(createCanonicalDraftRow({ name: 123 }).name, '123');
});
test('createCanonicalDraftRow does not use silent type fallback', () => {
    assert.equal(createCanonicalDraftRow({ name: 'A' }).type, undefined);
});
test('areDraftRowsEqual returns false if not arrays', () => {
    assert.equal(areDraftRowsEqual(null, []), false);
});
test('areDraftRowsEqual returns false if different lengths', () => {
    assert.equal(areDraftRowsEqual([], [{}]), false);
});
test('areDraftRowsEqual returns true for identical canonical rows', () => {
    const a = [{ id: '1', name: ' A ', type: 'class', start: '09:00', end: '09:40' }];
    const b = [{ id: '2', name: 'A', type: ' class ', start: '09:00', end: '09:40', duration: 40 }];
    assert.equal(areDraftRowsEqual(a, b), true);
});
test('areDraftRowsEqual returns false if property differs', () => {
    const a = [{ name: 'A' }];
    const b = [{ name: 'B' }];
    assert.equal(areDraftRowsEqual(a, b), false);
});
test('areDraftRowsEqual is row order sensitive', () => {
    const a = [{ name: 'A' }, { name: 'B' }];
    const b = [{ name: 'B' }, { name: 'A' }];
    assert.equal(areDraftRowsEqual(a, b), false);
});

// Validation
test('translateDraftIssueCode translates known codes', () => {
    assert.equal(translateDraftIssueCode('INPUT_NOT_ARRAY'), 'Girdi bir dizi değil.');
    assert.equal(translateDraftIssueCode('OVERLAP'), 'Taslaktaki dönemlerin saatleri çakışıyor.');
});
test('translateDraftIssueCode provides fallback for unknown codes', () => {
    assert.equal(translateDraftIssueCode('UNKNOWN_MAGIC_CODE'), 'Taslak doğrulanırken tanımlanamayan bir sorun bulundu.');
});
test('createDraftValidationResult handles non-object input', () => {
    const res = createDraftValidationResult(null, 5);
    assert.equal(res.ready, false);
    assert.equal(res.rawValid, false);
    assert.deepEqual(res.normalizedPeriods, []);
    assert.deepEqual(res.warnings, []);
    assert.deepEqual(res.errors, []);
    assert.equal(res.inputRowCount, 5);
    assert.equal(res.normalizedRowCount, 0);
});
test('createDraftValidationResult ready when valid and lengths match', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [], errors: [], periods: [{ name: 'A' }] }, 1);
    assert.equal(res.ready, true);
});
test('createDraftValidationResult not ready if valid but warnings exist', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [{}], errors: [], periods: [{}] }, 1);
    assert.equal(res.ready, false);
});
test('createDraftValidationResult not ready if valid but input length mismatch', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [], errors: [], periods: [{}] }, 2);
    assert.equal(res.ready, false);
});
test('createDraftValidationResult defensively copies periods', () => {
    const normalizerResult = { periods: [{ name: 'A' }] };
    const res = createDraftValidationResult(normalizerResult, 1);
    normalizerResult.periods[0].name = 'B';
    assert.equal(res.normalizedPeriods[0].name, 'A');
});

const createMockNormalizer = (alwaysValid = true, overrideLength = null) => {
    return {
        normalizeSchedule: (rows) => {
            return {
                valid: alwaysValid,
                warnings: [],
                errors: alwaysValid ? [] : [{ code: 'MOCK_ERROR' }],
                periods: overrideLength !== null ? new Array(overrideLength).fill({}) : rows
            };
        }
    };
};

const createMockView = () => {
    let renderCount = 0;
    return {
        render: () => { renderCount++; },
        getRenderCount: () => renderCount
    };
};

// Lifecycle
test('Controller initial state is uninitialized', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    const state = controller.getState();
    assert.equal(state.initialized, false);
    assert.equal(state.dirty, false);
    assert.equal(state.sourceAvailable, false);
    assert.equal(state.sourceUpdatedWhileDirty, false);
    assert.deepEqual(state.sourceSnapshot, []);
    assert.deepEqual(state.draft, []);
    assert.equal(state.validation.ready, false);
});
test('loadSourcePeriods with invalid input returns invalid-source', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    const res = controller.loadSourcePeriods(null);
    assert.equal(res.status, 'invalid-source');
    assert.equal(res.changed, false);
});
test('loadSourcePeriods uninitialized valid array sets initialized state', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'initialized');
    assert.equal(res.changed, true);
    assert.equal(res.draftPreserved, false);
    assert.equal(controller.getState().initialized, true);
});
test('acceptDiagnosticsResult with valid periods calls loadSourcePeriods', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    const res = controller.acceptDiagnosticsResult({ state: 'valid', valid: true, periods: [{ name: 'A' }] });
    assert.equal(res.status, 'initialized');
    assert.equal(controller.getState().initialized, true);
});
test('acceptDiagnosticsResult with empty periods calls loadSourcePeriods', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    const res = controller.acceptDiagnosticsResult({ state: 'empty', valid: true, periods: [] });
    assert.equal(res.status, 'initialized');
    assert.equal(controller.getState().initialized, true);
});
test('acceptDiagnosticsResult with invalid periods initializes empty with sourceAvailable false', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    const res = controller.acceptDiagnosticsResult({ state: 'invalid', valid: false, errors: [] });
    assert.equal(res.status, 'source-unavailable');
    assert.equal(res.changed, true);
    const state = controller.getState();
    assert.equal(state.initialized, true);
    assert.equal(state.sourceAvailable, false);
    assert.equal(state.draft.length, 0);
});
test('acceptDiagnosticsResult with legacy-incomplete initializes empty with sourceAvailable false', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    controller.acceptDiagnosticsResult({ state: 'legacy-incomplete', valid: false, errors: [] });
    const state = controller.getState();
    assert.equal(state.initialized, true);
    assert.equal(state.sourceAvailable, false);
});
test('acceptDiagnosticsResult with network error does not initialize', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    const res = controller.acceptDiagnosticsResult(null);
    assert.equal(res.status, 'preserved');
    assert.equal(res.changed, false);
    const state = controller.getState();
    assert.equal(state.initialized, false);
});

// Editing
test('addRow on uninitialized returns not-initialized', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView(), normalizer: createMockNormalizer() });
    const res = controller.addRow();
    assert.equal(res.status, 'not-initialized');
});
test('addRow marks dirty and creates draft row', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([]);
    const res = controller.addRow();
    assert.equal(res.status, 'updated');
    const state = controller.getState();
    assert.equal(state.dirty, true);
    assert.equal(state.draft.length, 1);
    assert.equal(state.draft[0].type, 'class');
});
test('updateRow marks dirty', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    const res = controller.updateRow(rowId, { name: 'B' });
    assert.equal(res.status, 'updated');
    const newState = controller.getState();
    assert.equal(newState.dirty, true);
    assert.equal(newState.draft[0].name, 'B');
});
test('updateRow reverting to source marks clean', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    controller.updateRow(rowId, { name: 'B' });
    assert.equal(controller.getState().dirty, true);
    controller.updateRow(rowId, { name: 'A' });
    assert.equal(controller.getState().dirty, false);
});
test('updateRow ignores unknown patch fields', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    controller.updateRow(rowId, { name: 'B', unknownField: 'X' });
    assert.equal(controller.getState().draft[0].unknownField, undefined);
});
test('updateRow returns invalid-patch for non-objects', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    const res = controller.updateRow(rowId, null);
    assert.equal(res.status, 'invalid-patch');
});
test('updateRow protects ID', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    controller.updateRow(rowId, { id: 'new-id' });
    assert.equal(controller.getState().draft[0].id, rowId);
});
test('removeRow marks dirty', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    const rowId = state.draft[0].id;
    const res = controller.removeRow(rowId);
    assert.equal(res.status, 'updated');
    const newState = controller.getState();
    assert.equal(newState.dirty, true);
    assert.equal(newState.draft.length, 0);
});
test('removeRow returns not-found for unknown id', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const res = controller.removeRow('unknown');
    assert.equal(res.status, 'not-found');
});
test('removeRow final-row removal works', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    controller.removeRow(state.draft[0].id);
    assert.equal(controller.getState().draft.length, 0);
});

// Refresh protection
test('loadSourcePeriods clean identical refresh does not rerender', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ view, normalizer: createMockNormalizer() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const renderCountBefore = view.getRenderCount();
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'unchanged');
    assert.equal(res.changed, false);
    assert.equal(view.getRenderCount(), renderCountBefore);
});
test('loadSourcePeriods clean changed refresh replaces draft and rerenders', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ view, normalizer: createMockNormalizer() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const renderCountBefore = view.getRenderCount();
    const res = controller.loadSourcePeriods([{ name: 'B' }]);
    assert.equal(res.status, 'updated');
    assert.equal(res.draftPreserved, false);
    assert.equal(view.getRenderCount(), renderCountBefore + 1);
});
test('loadSourcePeriods dirty changed refresh preserves draft and sets flag', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ view, normalizer: createMockNormalizer() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.updateRow(controller.getState().draft[0].id, { name: 'A-modified' });
    const res = controller.loadSourcePeriods([{ name: 'B' }]);
    assert.equal(res.status, 'updated');
    assert.equal(res.draftPreserved, true);
    const state = controller.getState();
    assert.equal(state.sourceUpdatedWhileDirty, true);
    assert.equal(state.draft[0].name, 'A-modified');
});
test('loadSourcePeriods dirty identical refresh does not rerender or set flag', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ view, normalizer: createMockNormalizer() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.updateRow(controller.getState().draft[0].id, { name: 'A-modified' });
    const renderCountBefore = view.getRenderCount();
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'unchanged');
    assert.equal(view.getRenderCount(), renderCountBefore);
    assert.equal(controller.getState().sourceUpdatedWhileDirty, false);
});
test('resetToSource clears dirty and restores draft', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    controller.updateRow(state.draft[0].id, { name: 'B' });
    controller.resetToSource();
    const newState = controller.getState();
    assert.equal(newState.dirty, false);
    assert.equal(newState.draft[0].name, 'A');
    assert.equal(newState.sourceUpdatedWhileDirty, false);
});
test('resetToSource from empty source restores empty draft', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([]);
    controller.addRow();
    controller.resetToSource();
    const newState = controller.getState();
    assert.equal(newState.dirty, false);
    assert.equal(newState.draft.length, 0);
});
test('acceptDiagnosticsResult with invalid refresh preserves source and draft', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.updateRow(controller.getState().draft[0].id, { name: 'A-modified' });
    const res = controller.acceptDiagnosticsResult({ state: 'invalid', valid: false });
    assert.equal(res.status, 'source-unavailable');
    assert.equal(res.changed, false);
    const state = controller.getState();
    assert.equal(state.draft[0].name, 'A-modified');
    assert.equal(state.sourceSnapshot[0].name, 'A');
});
test('acceptDiagnosticsResult with legacy-incomplete refresh preserves source and draft', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const res = controller.acceptDiagnosticsResult({ state: 'legacy-incomplete', valid: false });
    assert.equal(res.status, 'source-unavailable');
    assert.equal(controller.getState().sourceSnapshot[0].name, 'A');
});
test('acceptDiagnosticsResult with transport failure preserves source and draft', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const res = controller.acceptDiagnosticsResult(null);
    assert.equal(res.status, 'preserved');
    assert.equal(controller.getState().sourceSnapshot[0].name, 'A');
});
test('identical refresh does not regenerate IDs', () => {
    const controller = createScheduleDraftEditorController({  normalizer: createMockNormalizer() , view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const idBefore = controller.getState().draft[0].id;
    controller.loadSourcePeriods([{ name: 'A' }]);
    const idAfter = controller.getState().draft[0].id;
    assert.equal(idBefore, idAfter);
});

// Dependency safety
test('validate sets validation state using normalizer', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(true), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const res = controller.validate();
    assert.equal(res.status, 'ok');
    const state = controller.getState();
    assert.equal(state.validation.ready, true);
    assert.equal(state.validation.normalizedRowCount, 1);
});
test('validate catches normalizer throws safely', () => {
    let called = 0;
    const throwingNormalizer = {
        normalizeSchedule: () => { called++; throw new Error('Boom'); }
    };
    const controller = createScheduleDraftEditorController({ normalizer: throwingNormalizer, view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.validate();
    assert.equal(called, 2);
    const state = controller.getState();
    assert.equal(state.validation.ready, false);
    assert.equal(state.validation.errors.length, 1);
    assert.equal(state.validation.errors[0].code, 'SCHEDULE_VALIDATION_EXCEPTION');
});
test('missing normalizer does not throw during validation and returns dependency-error', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'valid', valid: true, periods: [{ name: 'A' }] });
    const res = controller.validate();
    assert.equal(res.status, 'dependency-error');
    assert.equal(res.dependency, 'normalizer');
    const state = controller.getState();
    assert.equal(state.dependencies.normalizer, 'dependency-error');
    assert.equal(state.validation.ready, false);
});
test('missing view does not throw during mutations and returns dependency-error', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer() });
    controller.acceptDiagnosticsResult({ state: 'valid', valid: true, periods: [{ name: 'A' }] });
    const res = controller.addRow();
    assert.equal(res.status, 'dependency-error');
    assert.equal(res.dependency, 'view');
    const state = controller.getState();
    assert.equal(state.dependencies.view, 'dependency-error');
});
test('malformed view render throw is caught', () => {
    const throwingView = { render: () => { throw new Error("Render error"); } };
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: throwingView });
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'render-error');
    assert.equal(res.changed, true);
});
test('getState exposes safe dependency status', () => {
    const controller = createScheduleDraftEditorController({});
    const state = controller.getState();
    assert.equal(state.dependencies.normalizer, 'dependency-error');
    assert.equal(state.dependencies.view, 'dependency-error');
});
test('malformed method inputs return safe results', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    const res = controller.updateRow('nonexistent', null);
    assert.equal(res.status, 'not-initialized');
});

// Validation tests extended
test('createDraftValidationResult handles empty draft', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [], errors: [], periods: [] }, 0);
    assert.equal(res.ready, false);
});
test('createDraftValidationResult handles valid class row', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [], errors: [], periods: [{ type: 'class' }] }, 1);
    assert.equal(res.ready, true);
});
test('createDraftValidationResult handles break-only row', () => {
    const res = createDraftValidationResult({ valid: true, warnings: [], errors: [], periods: [{ type: 'break' }] }, 1);
    assert.equal(res.ready, true);
});
test('translateDraftIssueCode handles missing name', () => {
    assert.equal(translateDraftIssueCode('MISSING_NAME'), 'Bir taslak satırının adı eksik.');
});
test('translateDraftIssueCode handles invalid or missing times', () => {
    assert.equal(translateDraftIssueCode('INVALID_START_TIME'), 'Bir taslak satırının başlangıç saati geçersiz.');
});
test('translateDraftIssueCode handles zero duration', () => {
    assert.equal(translateDraftIssueCode('ZERO_DURATION'), 'Bir taslak satırının süresi sıfır.');
});
test('translateDraftIssueCode handles end before start', () => {
    assert.equal(translateDraftIssueCode('END_BEFORE_START'), 'Bir taslak satırının bitiş saati başlangıcından önce.');
});
test('translateDraftIssueCode handles overlap', () => {
    assert.equal(translateDraftIssueCode('OVERLAP'), 'Taslaktaki dönemlerin saatleri çakışıyor.');
});
test('translateDraftIssueCode handles duplicate period', () => {
    assert.equal(translateDraftIssueCode('DUPLICATE_PERIOD'), 'Aynı dönem taslakta birden fazla kez bulunuyor.');
});
test('translateDraftIssueCode handles warning prevents ready', () => {
    assert.equal(translateDraftIssueCode('NO_VALID_PERIODS'), 'Geçerli hiçbir dönem bulunamadı.');
});

// Static guarantees via parsing
const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'index.html'), 'utf8');
const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'schedule-draft-editor.js'), 'utf8');
const adminContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'admin.js'), 'utf8');
const normalizerContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'schedule-normalizer.js'), 'utf8');
const normalizerFactory = new Function('module', normalizerContent + '\nreturn ScheduleNormalizer;');
const realNormalizer = normalizerFactory({});

test('HTML buttons use type="button"', () => {
    assert.match(htmlContent, /<button type="button" id="sdeAddRowBtn"/);
    assert.match(htmlContent, /<button type="button" id="sdeValidateBtn"/);
    assert.match(htmlContent, /<button type="button" id="sdeResetBtn"/);
});
test('HTML uses correct exact prototype notice', () => {
    assert.match(htmlContent, /Bu bir prototip taslaktır. Değişiklikler sunucuya gönderilmez ve sayfa yenilendiğinde kaybolur./);
});
test('No fetch in draft editor script', () => {
    assert.equal(scriptContent.includes('fetch('), false);
});
test('No XMLHttpRequest in draft editor script', () => {
    assert.equal(scriptContent.includes('XMLHttpRequest'), false);
});
test('No window.api in draft editor script', () => {
    assert.equal(scriptContent.includes('window.api'), false);
});
test('No storage API in draft editor script', () => {
    assert.equal(scriptContent.includes('localStorage'), false);
    assert.equal(scriptContent.includes('sessionStorage'), false);
    assert.equal(scriptContent.includes('indexedDB'), false);
});
test('No cookies in draft editor script', () => {
    assert.equal(scriptContent.includes('document.cookie'), false);
});
test('No Cache API in draft editor script', () => {
    assert.equal(scriptContent.includes('caches.open'), false);
});
test('No service worker persistence in draft editor script', () => {
    assert.equal(scriptContent.includes('serviceWorker'), false);
});
test('No POST/PUT/PATCH/DELETE in draft editor script', () => {
    assert.equal(/\bPOST\b/.test(scriptContent), false);
    assert.equal(/\bPUT\b/.test(scriptContent), false);
    assert.equal(/\bPATCH\b/.test(scriptContent), false);
    assert.equal(/\bDELETE\b/.test(scriptContent), false);
});
test('No save button in HTML', () => {
    assert.equal(htmlContent.includes('sdeSaveBtn'), false);
});
test('No dynamic innerHTML in draft editor script', () => {
    assert.equal(scriptContent.includes('.innerHTML'), false);
});
test('structured diagnostics result is passed directly to editor (no DOM rereading)', () => {
    assert.match(adminContent, /const\s+result\s*=\s*await\s+window\.scheduleDiagnosticsController\.load\(\);/);
    assert.match(adminContent, /window\.scheduleDraftEditorController\.acceptDiagnosticsResult\(result\);/);
    assert.equal(adminContent.includes('innerText = result'), false);
});
test('unknown type is preserved correctly in edit view rendering', () => {
    const row = createCanonicalDraftRow({ type: 'unknown_magic' });
    assert.equal(row.type, 'unknown_magic');
});
test('no schedule write requests in draft editor script', () => {
    assert.equal(scriptContent.includes('request('), false);
});
test('missing normalizer validation returns dependency-error', () => {
    const controller = createScheduleDraftEditorController({ view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'valid', valid: true, periods: [{ name: 'A' }] });
    const res = controller.validate();
    assert.equal(res.status, 'dependency-error');
});
test('missing view mutation returns dependency-error', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer() });
    controller.acceptDiagnosticsResult({ state: 'valid', valid: true, periods: [{ name: 'A' }] });
    const res = controller.addRow();
    assert.equal(res.status, 'dependency-error');
});
test('all translations are ignored for raw english messages', () => {
    const tr = translateDraftIssueCode('INPUT_NOT_ARRAY');
    assert.notEqual(tr, 'INPUT_NOT_ARRAY');
    assert.ok(tr.includes('dizi'));
});
test('ID stability check', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const id = controller.getState().draft[0].id;
    controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(controller.getState().draft[0].id, id);
});
test('automatic revalidation on editing', () => {
    let calls = 0;
    const normalizer = {
        normalizeSchedule: (rows) => { calls++; return { valid: true, periods: rows, warnings: [], errors: [] }; }
    };
    const controller = createScheduleDraftEditorController({ normalizer, view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const prevCalls = calls;
    controller.updateRow(controller.getState().draft[0].id, { name: 'B' });
    assert.equal(calls, prevCalls + 1);
});
test('dirty state clearing after returning to source', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const id = controller.getState().draft[0].id;
    controller.updateRow(id, { name: 'B' });
    assert.equal(controller.getState().dirty, true);
    controller.updateRow(id, { name: 'A' });
    assert.equal(controller.getState().dirty, false);
});
test('empty draft is invalid', () => {
    const res = createDraftValidationResult({ valid: true, periods: [], warnings: [], errors: [] }, 0);
    assert.equal(res.ready, false);
});
test('defensive validation copies', () => {
    const result = { valid: true, periods: [{ name: 'A' }], warnings: [], errors: [] };
    const res = createDraftValidationResult(result, 1);
    result.periods[0].name = 'B';
    assert.equal(res.normalizedPeriods[0].name, 'A');
});
test('row-count mismatch prevents ready', () => {
    const res = createDraftValidationResult({ valid: true, periods: [{ name: 'A' }], warnings: [], errors: [] }, 2);
    assert.equal(res.ready, false);
});
test('ignored unknown patch fields is validated', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const id = controller.getState().draft[0].id;
    controller.updateRow(id, { name: 'B', unknown: 'C' });
    assert.equal(controller.getState().draft[0].unknown, undefined);
});
test('unknown remove ID returns not-found', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const res = controller.removeRow('123');
    assert.equal(res.status, 'not-found');
});
test('valid initialization creates separate source and draft objects', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state = controller.getState();
    assert.notEqual(state.sourceSnapshot, state.draft);
    assert.notEqual(state.sourceSnapshot[0], state.draft[0]);
});
test('valid empty initialization sets state correctly', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([]);
    const state = controller.getState();
    assert.equal(state.initialized, true);
    assert.equal(state.sourceAvailable, true);
});
test('empty source sets state correctly', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([]);
    const state = controller.getState();
    assert.equal(state.draft.length, 0);
});
test('invalid source sets state correctly', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'invalid', valid: false });
    const state = controller.getState();
    assert.equal(state.initialized, true);
    assert.equal(state.sourceAvailable, false);
});
test('legacy source sets state correctly', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'legacy-incomplete', valid: false });
    const state = controller.getState();
    assert.equal(state.initialized, true);
    assert.equal(state.sourceAvailable, false);
});
test('transport failure preserves source and draft', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.acceptDiagnosticsResult(null);
    const state = controller.getState();
    assert.equal(state.sourceSnapshot[0].name, 'A');
});
test('source/draft reference separation is maintained', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const state1 = controller.getState();
    state1.draft[0].name = 'B';
    const state2 = controller.getState();
    assert.equal(state2.draft[0].name, 'A');
});
test('immediate validation is performed', () => {
    let validated = false;
    const normalizer = {
        normalizeSchedule: (rows) => { validated = true; return { valid: true, periods: rows, warnings: [], errors: [] }; }
    };
    const controller = createScheduleDraftEditorController({ normalizer, view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(validated, true);
});
test('every permitted update field works', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A', type: 'class', start: '09:00', end: '09:40' }]);
    const id = controller.getState().draft[0].id;
    controller.updateRow(id, { name: 'B', type: 'break', start: '10:00', end: '10:40' });
    const row = controller.getState().draft[0];
    assert.equal(row.name, 'B');
    assert.equal(row.type, 'break');
    assert.equal(row.start, '10:00');
    assert.equal(row.end, '10:40');
});
test('clean identical refresh works', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const renders = view.getRenderCount();
    controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(view.getRenderCount(), renders);
});
test('dirty identical refresh works', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view });
    controller.loadSourcePeriods([{ name: 'A' }]);
    controller.updateRow(controller.getState().draft[0].id, { name: 'B' });
    const renders = view.getRenderCount();
    controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(view.getRenderCount(), renders);
});
test('empty latest-source reset works', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([]);
    controller.addRow();
    controller.resetToSource();
    assert.equal(controller.getState().draft.length, 0);
});
test('render deduplication works', () => {
    const view = createMockView();
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const renders = view.getRenderCount();
    controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(view.getRenderCount(), renders); // 0 extra renders
});

// Real normalizer tests
test('real normalizer: missing name', () => {
    const res = realNormalizer.normalizeSchedule([{ type: 'class', start: '09:00', end: '09:40' }]);
    assert.equal(res.valid, false);
    assert.equal(res.warnings[0].code, 'MISSING_NAME');
    assert.equal(res.errors[0].code, 'NO_VALID_PERIODS');
});
test('real normalizer: invalid start', () => {
    const res = realNormalizer.normalizeSchedule([{ name: 'A', type: 'class', start: 'xx:00', end: '09:40' }]);
    assert.equal(res.valid, false);
    assert.equal(res.warnings[0].code, 'INVALID_START_TIME');
});
test('real normalizer: invalid end', () => {
    const res = realNormalizer.normalizeSchedule([{ name: 'A', type: 'class', start: '09:00', end: 'xx:40' }]);
    assert.equal(res.valid, false);
    assert.equal(res.warnings[0].code, 'INVALID_END_TIME');
});
test('real normalizer: zero duration', () => {
    const res = realNormalizer.normalizeSchedule([{ name: 'A', type: 'class', start: '09:00', end: '09:00' }]);
    assert.equal(res.valid, false);
    assert.equal(res.warnings[0].code, 'ZERO_DURATION');
});
test('real normalizer: end before start', () => {
    const res = realNormalizer.normalizeSchedule([{ name: 'A', type: 'class', start: '09:40', end: '09:00' }]);
    assert.equal(res.valid, false);
    assert.equal(res.warnings[0].code, 'END_BEFORE_START');
});
test('real normalizer: duplicate period', () => {
    const res = realNormalizer.normalizeSchedule([
        { name: 'A', type: 'class', start: '09:00', end: '09:40' },
        { name: 'A', type: 'class', start: '09:00', end: '09:40' }
    ]);
    assert.equal(res.valid, true);
    assert.equal(res.warnings[0].code, 'DUPLICATE_PERIOD');
});
test('real normalizer: overlap', () => {
    const res = realNormalizer.normalizeSchedule([
        { name: 'A', type: 'class', start: '09:00', end: '09:40' },
        { name: 'B', type: 'class', start: '09:30', end: '10:10' }
    ]);
    assert.equal(res.valid, false);
    assert.equal(res.errors[0].code, 'OVERLAP');
});
test('real normalizer: chronological sorting', () => {
    const res = realNormalizer.normalizeSchedule([
        { name: 'B', type: 'class', start: '10:00', end: '10:40' },
        { name: 'A', type: 'class', start: '09:00', end: '09:40' }
    ]);
    assert.equal(res.valid, true);
    assert.equal(res.periods[0].name, 'A');
    assert.equal(res.periods[1].name, 'B');
});

// Malformed source row behaviour
test('loadSourcePeriods with malformed entries returns invalid-source', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    assert.equal(controller.loadSourcePeriods([null]).status, 'invalid-source');
    assert.equal(controller.loadSourcePeriods([undefined]).status, 'invalid-source');
    assert.equal(controller.loadSourcePeriods(['row']).status, 'invalid-source');
    assert.equal(controller.loadSourcePeriods([[]]).status, 'invalid-source');
});
test('loadSourcePeriods with valid empty type row is accepted', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'initialized');
});
test('loadSourcePeriods with malformed entries preserves state', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.loadSourcePeriods([{ name: 'A' }]);
    const stateBefore = controller.getState();
    controller.updateRow(stateBefore.draft[0].id, { name: 'B' });
    
    const res = controller.loadSourcePeriods([null]);
    assert.equal(res.status, 'invalid-source');
    assert.equal(res.changed, false);
    
    const stateAfter = controller.getState();
    assert.equal(stateAfter.dirty, true);
    assert.equal(stateAfter.sourceSnapshot[0].name, 'A');
    assert.equal(stateAfter.draft[0].name, 'B');
});

// Authoritative empty-source behavior
test('authoritative empty source transition works', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'invalid', valid: false });
    let state = controller.getState();
    assert.equal(state.sourceAvailable, false);
    
    const res = controller.acceptDiagnosticsResult({ state: 'empty', valid: true, periods: [] });
    assert.equal(res.status, 'updated');
    state = controller.getState();
    assert.equal(state.sourceAvailable, true);
    assert.deepEqual(state.sourceSnapshot, []);
    assert.deepEqual(state.draft, []);
});

test('authoritative empty source transition works without identical-draft bypass', () => {
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: createMockView() });
    controller.acceptDiagnosticsResult({ state: 'invalid', valid: false });
    const res = controller.loadSourcePeriods([]); 
    assert.equal(res.status, 'updated'); 
    assert.equal(controller.getState().sourceAvailable, true);
});

// Render-error behaviour
test('render failures honestly report render-error', () => {
    const throwingView = { render: () => { throw new Error('Render fail'); } };
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: throwingView });
    const res = controller.loadSourcePeriods([{ name: 'A' }]);
    assert.equal(res.status, 'render-error');
    assert.equal(res.dependency, 'view');
    assert.equal(controller.getState().dependencies.view, 'error');
});
test('render failures honestly report render-error during update', () => {
    let failRender = false;
    const mockView = { render: () => { if (failRender) throw new Error('Render fail'); } };
    const controller = createScheduleDraftEditorController({ normalizer: createMockNormalizer(), view: mockView });
    controller.loadSourcePeriods([{ name: 'A' }]);
    
    failRender = true;
    const res = controller.addRow();
    assert.equal(res.status, 'render-error');
    assert.equal(controller.getState().dependencies.view, 'error');
});
