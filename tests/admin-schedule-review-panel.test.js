const test = require('node:test');
const assert = require('node:assert');
const AdminScheduleReviewPanel = require('../public/admin/schedule-review-panel.js');

test('AdminScheduleReviewPanel Tests', async (t) => {

    await t.test('compareSchedules: invalid inputs', () => {
        const result1 = AdminScheduleReviewPanel.compareSchedules(null, []);
        assert.strictEqual(result1.status, 'invalid-input');

        const result2 = AdminScheduleReviewPanel.compareSchedules([], null);
        assert.strictEqual(result2.status, 'invalid-input');

        const result3 = AdminScheduleReviewPanel.compareSchedules([{ name: 'A' }], [ 'invalid' ]);
        assert.strictEqual(result3.status, 'invalid-input');
        
        const result4 = AdminScheduleReviewPanel.compareSchedules(undefined, undefined);
        assert.strictEqual(result4.status, 'invalid-input');
    });

    await t.test('compareSchedules: empty schedules', () => {
        const result = AdminScheduleReviewPanel.compareSchedules([], []);
        assert.strictEqual(result.status, 'ok');
        assert.strictEqual(result.hasChanges, false);
        assert.strictEqual(result.counts.unchanged, 0);
    });

    await t.test('compareSchedules: identical schedules', () => {
        const source = [
            { id: 1, name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { id: 2, name: 'Break', type: 'break', start: '08:40', end: '08:50' }
        ];
        const draft = [
            { id: 'uuid-1', name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { id: 'uuid-2', name: 'Break', type: 'break', start: '08:40', end: '08:50' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.status, 'ok');
        assert.strictEqual(result.hasChanges, false);
        assert.strictEqual(result.counts.unchanged, 2);
        assert.strictEqual(result.counts.added, 0);
        assert.strictEqual(result.counts.removed, 0);
        assert.strictEqual(result.counts.changed, 0);
    });

    await t.test('compareSchedules: row added at start', () => {
        const source = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' }
        ];
        const draft = [
            { name: 'Morning Assembly', type: 'class', start: '07:30', end: '08:00' },
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.hasChanges, true);
        assert.strictEqual(result.counts.unchanged, 1);
        assert.strictEqual(result.counts.added, 1);
        assert.strictEqual(result.counts.removed, 0);
        assert.strictEqual(result.added[0].row.name, 'Morning Assembly');
        assert.strictEqual(result.added[0].draftIndex, 0);
    });

    await t.test('compareSchedules: row added at end', () => {
        const source = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' }
        ];
        const draft = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { name: 'Break', type: 'break', start: '08:40', end: '08:50' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.hasChanges, true);
        assert.strictEqual(result.counts.unchanged, 1);
        assert.strictEqual(result.counts.added, 1);
        assert.strictEqual(result.counts.removed, 0);
        assert.strictEqual(result.added[0].row.name, 'Break');
        assert.strictEqual(result.added[0].draftIndex, 1);
    });

    await t.test('compareSchedules: row removed from middle', () => {
        const source = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { name: 'Break', type: 'break', start: '08:40', end: '08:50' },
            { name: 'Science', type: 'class', start: '08:50', end: '09:30' }
        ];
        const draft = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { name: 'Science', type: 'class', start: '08:50', end: '09:30' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.hasChanges, true);
        assert.strictEqual(result.counts.unchanged, 2);
        assert.strictEqual(result.counts.removed, 1);
        assert.strictEqual(result.removed[0].row.name, 'Break');
        assert.strictEqual(result.removed[0].sourceIndex, 1);
    });

    await t.test('compareSchedules: row changed (paired block)', () => {
        const source = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { name: 'Science', type: 'class', start: '08:50', end: '09:30' }
        ];
        const draft = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' },
            { name: 'Physics', type: 'class', start: '08:50', end: '09:30' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.hasChanges, true);
        assert.strictEqual(result.counts.unchanged, 1);
        assert.strictEqual(result.counts.changed, 1);
        assert.strictEqual(result.changed[0].before.name, 'Science');
        assert.strictEqual(result.changed[0].after.name, 'Physics');
        assert.deepStrictEqual(result.changed[0].changedFields, ['Ad']);
    });
    
    await t.test('compareSchedules: row changed multiple fields', () => {
        const source = [
            { name: 'Math', type: 'class', start: '08:00', end: '08:40' }
        ];
        const draft = [
            { name: 'Mathematics', type: 'class', start: '08:00', end: '08:45' }
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.counts.changed, 1);
        assert.deepStrictEqual(result.changed[0].changedFields, ['Ad', 'Bitiş']);
    });

    await t.test('compareSchedules: complex mixed insert, remove, change', () => {
        const source = [
            { name: 'A', type: 'class', start: '1', end: '2' },
            { name: 'B', type: 'class', start: '3', end: '4' }, // changed
            { name: 'C', type: 'class', start: '5', end: '6' }, // unchanged
            { name: 'D', type: 'class', start: '7', end: '8' }  // removed
        ];
        const draft = [
            { name: 'X', type: 'class', start: '0', end: '1' }, // added
            { name: 'A', type: 'class', start: '1', end: '2' }, // unchanged
            { name: 'B-edited', type: 'class', start: '3', end: '4' }, // changed
            { name: 'C', type: 'class', start: '5', end: '6' }  // unchanged
        ];
        const result = AdminScheduleReviewPanel.compareSchedules(source, draft);
        assert.strictEqual(result.counts.unchanged, 2); // A and C
        assert.strictEqual(result.counts.changed, 1); // B -> B-edited
        assert.strictEqual(result.counts.added, 1); // X
        assert.strictEqual(result.counts.removed, 1); // D
        
        assert.strictEqual(result.added[0].row.name, 'X');
        assert.strictEqual(result.removed[0].row.name, 'D');
        assert.strictEqual(result.changed[0].before.name, 'B');
        assert.strictEqual(result.changed[0].after.name, 'B-edited');
    });

    await t.test('createDomScheduleReviewPanelView: renders valid changes', () => {
        let textContents = [];
        let replacedChildren = false;
        const fakeDocument = {
            getElementById: (id) => {
                if (id !== 'srpContainer') return null;
                return {
                    children: [],
                    style: {},
                    replaceChildren: function() { replacedChildren = true; },
                    appendChild: function(node) { this.children.push(node); },
                    set textContent(val) { textContents.push(val); }
                };
            },
            createElement: (tag) => {
                return {
                    tagName: tag,
                    style: {},
                    children: [],
                    appendChild: function(node) { this.children.push(node); },
                    classList: { add: () => {} },
                    set textContent(val) { textContents.push(val); },
                    set innerHTML(val) { textContents.push(val); }
                };
            }
        };

        const view = AdminScheduleReviewPanel.createDomScheduleReviewPanelView(fakeDocument);
        
        const state = {
            initialized: true,
            sourceAvailable: true,
            sourceSnapshot: [{ name: 'A', type: 'class', start: '1', end: '2' }],
            draft: [{ name: 'B', type: 'class', start: '1', end: '2' }]
        };
        view.render(state);
        
        assert.strictEqual(replacedChildren, true);
        assert.ok(textContents.some(t => t && t.includes('Değiştirilen:')));
    });

    await t.test('createDomScheduleReviewPanelView: handles uninitialized state', () => {
        let containerTextContent = '';
        const fakeDocument = {
            getElementById: (id) => {
                if (id !== 'srpContainer') return null;
                return {
                    style: {},
                    set textContent(val) { containerTextContent = val; }
                };
            }
        };
        const view = AdminScheduleReviewPanel.createDomScheduleReviewPanelView(fakeDocument);
        view.render({ initialized: false });
        assert.strictEqual(containerTextContent, 'Karşılaştırma için program henüz hazırlanmadı.');
    });

    await t.test('createDomScheduleReviewPanelView: handles unavailable source', () => {
        let containerTextContent = '';
        const fakeDocument = {
            getElementById: (id) => {
                if (id !== 'srpContainer') return null;
                return {
                    style: {},
                    set textContent(val) { containerTextContent = val; }
                };
            }
        };
        const view = AdminScheduleReviewPanel.createDomScheduleReviewPanelView(fakeDocument);
        view.render({ initialized: true, sourceAvailable: false });
        assert.strictEqual(containerTextContent, 'Geçerli kaynak program alınamadığı için karşılaştırma yapılamıyor.');
    });

});
