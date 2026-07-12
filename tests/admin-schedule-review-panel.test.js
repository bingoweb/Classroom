const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const AdminScheduleReviewPanel = require('../public/admin/schedule-review-panel.js');

// --- Pure-Comparison Tests ---

test('compareSchedules: non-array source', () => {
    const result = AdminScheduleReviewPanel.compareSchedules(null, []);
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'root');
});

test('compareSchedules: non-array draft', () => {
    const result = AdminScheduleReviewPanel.compareSchedules([], null);
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'root');
});

test('compareSchedules: malformed source row', () => {
    const result = AdminScheduleReviewPanel.compareSchedules(['invalid'], []);
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'source');
    assert.strictEqual(result.index, 0);
    assert.strictEqual(result.field, 'row');
});

test('compareSchedules: malformed draft row', () => {
    const result = AdminScheduleReviewPanel.compareSchedules([], [null]);
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'draft');
    assert.strictEqual(result.index, 0);
    assert.strictEqual(result.field, 'row');
});

test('compareSchedules: missing canonical field', () => {
    const result = AdminScheduleReviewPanel.compareSchedules([{ name: 'Math', type: 'class', start: '08:00' }], []); // missing end
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'source');
    assert.strictEqual(result.field, 'end');
});

test('compareSchedules: non-string canonical field', () => {
    const result = AdminScheduleReviewPanel.compareSchedules([], [{ name: 'Math', type: 'class', start: '08:00', end: 9 }]);
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'draft');
    assert.strictEqual(result.field, 'end');
});

test('compareSchedules: empty source versus empty draft', () => {
    const result = AdminScheduleReviewPanel.compareSchedules([], []);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.counts.unchanged, 0);
});

test('compareSchedules: identical schedules', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.counts.unchanged, 1);
});

test('compareSchedules: regenerated IDs ignored', () => {
    const s = [{ id: 'old-1', name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ id: 'new-2', name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.hasChanges, false);
});

test('compareSchedules: unrelated metadata ignored', () => {
    const s = [{ metadata: 123, name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ foo: 'bar', name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.hasChanges, false);
});

test('compareSchedules: addition at beginning', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'X', type: 'class', start: '0', end: '1' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.hasChanges, true);
    assert.strictEqual(result.counts.added, 1);
    assert.strictEqual(result.added[0].draftIndex, 0);
    assert.strictEqual(result.added[0].row.name, 'X');
});

test('compareSchedules: addition in middle', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'C', type: 'class', start: '3', end: '4' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'B', type: 'class', start: '2', end: '3' }, { name: 'C', type: 'class', start: '3', end: '4' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.added, 1);
    assert.strictEqual(result.added[0].draftIndex, 1);
});

test('compareSchedules: addition at end', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'B', type: 'class', start: '2', end: '3' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.added, 1);
    assert.strictEqual(result.added[0].draftIndex, 1);
});

test('compareSchedules: removal at beginning', () => {
    const s = [{ name: 'X', type: 'class', start: '0', end: '1' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.removed, 1);
    assert.strictEqual(result.removed[0].sourceIndex, 0);
});

test('compareSchedules: removal in middle', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'X', type: 'class', start: '2', end: '3' }, { name: 'B', type: 'class', start: '3', end: '4' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'B', type: 'class', start: '3', end: '4' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.removed, 1);
    assert.strictEqual(result.removed[0].sourceIndex, 1);
});

test('compareSchedules: removal at end', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'X', type: 'class', start: '2', end: '3' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.removed, 1);
    assert.strictEqual(result.removed[0].sourceIndex, 1);
});

test('compareSchedules: changed name', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'B', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.changed, 1);
    assert.deepStrictEqual(result.changed[0].changedFields, ['Ad']);
});

test('compareSchedules: changed type', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'break', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.changed, 1);
    assert.deepStrictEqual(result.changed[0].changedFields, ['Tür']);
});

test('compareSchedules: changed start', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '0', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.changed, 1);
    assert.deepStrictEqual(result.changed[0].changedFields, ['Başlangıç']);
});

test('compareSchedules: changed end', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '3' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.changed, 1);
    assert.deepStrictEqual(result.changed[0].changedFields, ['Bitiş']);
});

test('compareSchedules: multiple changed fields', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'B', type: 'break', start: '0', end: '3' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.changed, 1);
    assert.strictEqual(result.changed[0].changedFields.length, 4);
});

test('compareSchedules: mixed addition/removal/change', () => {
    const s = [
        { name: 'A', type: 'class', start: '1', end: '2' },
        { name: 'B', type: 'class', start: '3', end: '4' },
        { name: 'C', type: 'class', start: '5', end: '6' },
        { name: 'D', type: 'class', start: '7', end: '8' }
    ];
    const d = [
        { name: 'X', type: 'class', start: '0', end: '1' },
        { name: 'A', type: 'class', start: '1', end: '2' },
        { name: 'B-edited', type: 'class', start: '3', end: '4' },
        { name: 'C', type: 'class', start: '5', end: '6' }
    ];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.unchanged, 2);
    assert.strictEqual(result.counts.changed, 1);
    assert.strictEqual(result.counts.added, 1);
    assert.strictEqual(result.counts.removed, 1);
});

test('compareSchedules: duplicate identical periods', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.unchanged, 2);
});

test('compareSchedules: deterministic duplicate matching', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.unchanged, 1);
    assert.strictEqual(result.counts.added, 1);
});

test('compareSchedules: reordered periods', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'B', type: 'class', start: '3', end: '4' }];
    const d = [{ name: 'B', type: 'class', start: '3', end: '4' }, { name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.unchanged, 1);
});

test('compareSchedules: unknown type preserved', () => {
    const s = [{ name: 'A', type: 'xyz', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'xyz', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.counts.unchanged, 1);
});

test('compareSchedules: correct source indexes', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'X', type: 'class', start: '3', end: '4' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.removed[0].sourceIndex, 1);
});

test('compareSchedules: correct draft indexes', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }, { name: 'X', type: 'class', start: '3', end: '4' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(result.added[0].draftIndex, 1);
});

test('compareSchedules: correct changed-field identifiers', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '5' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.deepStrictEqual(result.changed[0].changedFields, ['Bitiş']);
});

test('compareSchedules: source input not mutated', () => {
    const s = [{ name: ' A ', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(s[0].name, ' A ');
});

test('compareSchedules: draft input not mutated', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: ' A ', type: 'class', start: '1', end: '2' }];
    AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.strictEqual(d[0].name, ' A ');
});

test('compareSchedules: returned row objects are defensive copies', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'B', type: 'class', start: '1', end: '2' }];
    const result = AdminScheduleReviewPanel.compareSchedules(s, d);
    result.changed[0].before.name = 'HACK';
    assert.strictEqual(s[0].name, 'A');
});

test('compareSchedules: repeated calls return deeply equal results', () => {
    const s = [{ name: 'A', type: 'class', start: '1', end: '2' }];
    const d = [{ name: 'B', type: 'class', start: '1', end: '2' }];
    const result1 = AdminScheduleReviewPanel.compareSchedules(s, d);
    const result2 = AdminScheduleReviewPanel.compareSchedules(s, d);
    assert.deepStrictEqual(result1, result2);
});

// --- Controller Tests ---

function createFakeView() {
    return {
        _log: [],
        renderNotInitialized() { this._log.push('renderNotInitialized'); },
        renderSourceUnavailable() { this._log.push('renderSourceUnavailable'); },
        renderInvalidInput() { this._log.push('renderInvalidInput'); },
        renderComparison(c) { this._log.push(`renderComparison:${c.status}`); }
    };
}

test('controller: not initialized', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: false });
    assert.strictEqual(result.status, 'not-initialized');
    assert.strictEqual(view._log[0], 'renderNotInitialized');
});

test('controller: source unavailable', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: true, sourceAvailable: false });
    assert.strictEqual(result.status, 'source-unavailable');
    assert.strictEqual(view._log[0], 'renderSourceUnavailable');
});

test('controller: valid unchanged comparison', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const state = {
        initialized: true, sourceAvailable: true,
        sourceSnapshot: [{ name: 'A', type: 'class', start: '1', end: '2' }],
        draft: [{ name: 'A', type: 'class', start: '1', end: '2' }]
    };
    const result = ctrl.renderEditorState(state);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.comparison.hasChanges, false);
});

test('controller: valid changed comparison', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const state = {
        initialized: true, sourceAvailable: true,
        sourceSnapshot: [{ name: 'A', type: 'class', start: '1', end: '2' }],
        draft: [{ name: 'B', type: 'class', start: '1', end: '2' }]
    };
    const result = ctrl.renderEditorState(state);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.comparison.hasChanges, true);
});

test('controller: malformed editor state', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: true, sourceAvailable: true, sourceSnapshot: null, draft: [] });
    assert.strictEqual(result.status, 'invalid-input');
    assert.strictEqual(result.side, 'root');
    assert.strictEqual(view._log[0], 'renderInvalidInput');
});

test('controller: missing view', () => {
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view: null });
    const result = ctrl.renderEditorState({ initialized: true });
    assert.strictEqual(result.status, 'dependency-error');
    assert.strictEqual(result.dependency, 'view');
});

test('controller: missing container', () => {
    const view = {
        renderNotInitialized() { throw new Error('dependency-container'); }
    };
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: false });
    assert.strictEqual(result.status, 'dependency-error');
    assert.strictEqual(result.dependency, 'container');
});

test('controller: view throwing an exception', () => {
    const view = {
        renderNotInitialized() { throw new Error('Some random render error'); }
    };
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: false });
    assert.strictEqual(result.status, 'render-error');
    assert.strictEqual(result.dependency, 'view');
});

test('controller: structured success result', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const state = {
        initialized: true, sourceAvailable: true,
        sourceSnapshot: [], draft: []
    };
    const result = ctrl.renderEditorState(state);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.rendered, true);
    assert.ok(result.comparison);
});

test('controller: structured dependency result', () => {
    const view = {
        renderSourceUnavailable() { throw new Error('dependency-container'); }
    };
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: true, sourceAvailable: false });
    assert.strictEqual(result.status, 'dependency-error');
    assert.strictEqual(result.dependency, 'container');
});

test('controller: structured render-error result', () => {
    const view = {
        renderInvalidInput() { throw new Error('boom'); }
    };
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const result = ctrl.renderEditorState({ initialized: true, sourceAvailable: true, sourceSnapshot: null, draft: [] });
    assert.strictEqual(result.status, 'render-error');
});

test('controller: defensive controller results', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const state = {
        initialized: true, sourceAvailable: true,
        sourceSnapshot: [], draft: []
    };
    const result = ctrl.renderEditorState(state);
    result.comparison.counts.added = 999;
    
    const result2 = ctrl.renderEditorState(state);
    assert.strictEqual(result2.comparison.counts.added, 0);
});

test('controller: deterministic repeated rendering', () => {
    const view = createFakeView();
    const ctrl = AdminScheduleReviewPanel.createScheduleReviewPanelController({ view });
    const state = {
        initialized: true, sourceAvailable: true,
        sourceSnapshot: [], draft: []
    };
    ctrl.renderEditorState(state);
    ctrl.renderEditorState(state);
    assert.strictEqual(view._log.length, 2);
    assert.strictEqual(view._log[0], view._log[1]);
});

// --- Rendering Tests ---

function createFakeDocumentWithStrictInnerHTML() {
    let createdNodes = [];
    let textContents = [];
    const container = {
        _tag: 'div',
        _isContainer: true,
        children: [],
        style: {},
        textContent: '',
        replaceChildren() { this.children = []; },
        appendChild(node) { this.children.push(node); },
        set innerHTML(_) { throw new Error('innerHTML kullanımı yasaktır'); }
    };
    const doc = {
        getElementById(id) {
            if (id !== 'srpContainer') return null;
            return container;
        },
        createElement(tag) {
            const node = {
                _tag: tag,
                children: [],
                style: {},
                classList: { add() {} },
                textContent: '',
                replaceChildren() { this.children = []; },
                appendChild(child) { this.children.push(child); },
                set innerHTML(_) { throw new Error('innerHTML kullanımı yasaktır'); }
            };
            createdNodes.push(node);
            return node;
        },
        createTextNode(text) {
            return {
                _tag: '#text',
                textContent: text
            };
        },
        _createdNodes: createdNodes
    };
    return doc;
}

function extractText(node) {
    let t = node.textContent || '';
    if (node.children) {
        node.children.forEach(c => {
            t += ' ' + extractText(c);
        });
    }
    return t;
}

test('render: no-difference Turkish text', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules([], []);
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('Kaynak program ile yerel taslak arasında fark yok.'));
});

test('render: all four count labels', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules(
        [{ name: 'A', type: 'class', start: '1', end: '2' }],
        [{ name: 'B', type: 'class', start: '1', end: '2' }, { name: 'C', type: 'break', start: '2', end: '3' }]
    );
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('Eklenen:'));
    assert.ok(text.includes('Kaldırılan:'));
    assert.ok(text.includes('Değiştirilen:'));
    assert.ok(text.includes('Değişmeyen:'));
});

test('render: added section, removed section, changed section', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules(
        [
            { name: 'A', type: 'class', start: '1', end: '2' },
            { name: 'B', type: 'class', start: '3', end: '4' },
            { name: 'D', type: 'class', start: '7', end: '8' }
        ],
        [
            { name: 'X', type: 'class', start: '0', end: '1' },
            { name: 'A', type: 'class', start: '1', end: '2' },
            { name: 'B-edited', type: 'class', start: '3', end: '4' }
        ]
    );
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('Eklenen Dönemler'));
    assert.ok(text.includes('Kaldırılan Dönemler'));
    assert.ok(text.includes('Değiştirilen Dönemler'));
});

test('render: Değişen alanlar, Önceki değer, Taslak değeri', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules(
        [{ name: 'A', type: 'class', start: '1', end: '2' }],
        [{ name: 'B', type: 'class', start: '1', end: '2' }]
    );
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('Değişen alanlar: Ad'));
    assert.ok(text.includes('Önceki değer: 1 - 2 | Ders | A'));
    assert.ok(text.includes('Taslak değeri: 1 - 2 | Ders | B'));
});

test('render: unknown type display', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules(
        [],
        [{ name: 'A', type: 'weird', start: '1', end: '2' }]
    );
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('Bilinmeyen: weird'));
});

test('render: source/draft strings are assigned only through textContent', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules(
        [],
        [{ name: '<script>alert(1)</script>', type: 'class', start: '1', end: '2' }]
    );
    view.renderComparison(comparison);
    
    const container = doc.getElementById('srpContainer');
    const text = extractText(container);
    assert.ok(text.includes('<script>alert(1)</script>'));
});

test('render: replaceChildren is used safely', () => {
    const doc = createFakeDocumentWithStrictInnerHTML();
    const view = AdminScheduleReviewPanel.createScheduleReviewPanelView(doc);
    const comparison = AdminScheduleReviewPanel.compareSchedules([], []);
    
    const container = doc.getElementById('srpContainer');
    container.children = [ { _tag: 'old' } ];
    
    view.renderComparison(comparison);
    assert.ok(container.children.length > 0);
    assert.ok(!container.children.find(c => c._tag === 'old'));
});


// --- Static Integration Tests ---

test('static: Read real index.html', () => {
    const htmlPath = path.join(__dirname, '../public/admin/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('<tbody id="sdeEditableTableBody">'));
    assert.ok(html.includes('<tbody id="sdePreviewTableBody">'));
    assert.ok(html.includes('<div id="srpContainer"'));
    
    const diagIdx = html.indexOf('schedule-diagnostics.js');
    const draftIdx = html.indexOf('schedule-draft-editor.js');
    const reviewIdx = html.indexOf('schedule-review-panel.js');
    const adminIdx = html.indexOf('admin.js"');
    
    assert.ok(diagIdx < draftIdx, 'Diagnostics before draft editor');
    assert.ok(draftIdx < reviewIdx, 'Draft editor before review panel');
    assert.ok(reviewIdx < adminIdx, 'Review panel before admin');

    assert.ok(!html.includes('style="background: #f8fafc            <h3'));
});

test('static: Verify schedule-review-panel.js has no forbidden APIs', () => {
    const jsPath = path.join(__dirname, '../public/admin/schedule-review-panel.js');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.ok(!js.includes('innerHTML'), 'Forbidden: innerHTML');
    assert.ok(!js.includes('fetch('), 'Forbidden: fetch');
    assert.ok(!js.includes('XMLHttpRequest'), 'Forbidden: XMLHttpRequest');
    assert.ok(!js.includes('window.api'), 'Forbidden: window.api');
    assert.ok(!js.includes('localStorage'), 'Forbidden: localStorage');
    assert.ok(!js.includes('sessionStorage'), 'Forbidden: sessionStorage');
    assert.ok(!js.includes('indexedDB'), 'Forbidden: indexedDB');
    assert.ok(!js.includes('document.cookie'), 'Forbidden: document.cookie');
    assert.ok(!js.includes('caches.'), 'Forbidden: caches.');
    assert.ok(!js.includes('serviceWorker'), 'Forbidden: serviceWorker');
    assert.ok(!js.includes('POST'), 'Forbidden: POST');
    assert.ok(!js.includes('PUT'), 'Forbidden: PUT');
    assert.ok(!js.includes('PATCH'), 'Forbidden: PATCH');
    assert.ok(!js.includes('DELETE'), 'Forbidden: DELETE');
});

test('static: Verify admin.js creates and passes state to review controller', () => {
    const adminPath = path.join(__dirname, '../public/admin/admin.js');
    const adminJs = fs.readFileSync(adminPath, 'utf8');

    assert.ok(adminJs.includes('window.scheduleReviewPanelController'));
    assert.ok(adminJs.includes('createScheduleReviewPanelController'));
    assert.ok(adminJs.includes('window.scheduleReviewPanelController.renderEditorState(state)'));
    assert.ok(!adminJs.includes('reviewController.fetch'));
});
