const AdminScheduleReviewPanel = (function() {

    function isPlainObject(val) {
        return Object.prototype.toString.call(val) === '[object Object]';
    }

    function areCanonicalRowsEqual(a, b) {
        return a.name === b.name && a.type === b.type && a.start === b.start && a.end === b.end;
    }

    function getChangedFields(a, b) {
        const fields = [];
        if (a.name !== b.name) fields.push('Ad');
        if (a.type !== b.type) fields.push('Tür');
        if (a.start !== b.start) fields.push('Başlangıç');
        if (a.end !== b.end) fields.push('Bitiş');
        return fields;
    }

    function computeLCS(sourceCanonicals, draftCanonicals) {
        const m = sourceCanonicals.length;
        const n = draftCanonicals.length;
        
        // DP table
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (areCanonicalRowsEqual(sourceCanonicals[i - 1], draftCanonicals[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Backtrack to find matching indices
        const sourceMatches = new Set();
        const draftMatches = new Set();
        
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (areCanonicalRowsEqual(sourceCanonicals[i - 1], draftCanonicals[j - 1])) {
                sourceMatches.add(i - 1);
                draftMatches.add(j - 1);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return { sourceMatches, draftMatches, length: dp[m][n] };
    }

    function compareSchedules(sourceSnapshot, draftRows) {
        if (!Array.isArray(sourceSnapshot) || !Array.isArray(draftRows)) {
            return { status: 'invalid-input', side: 'root' };
        }

        const sourceCanonicals = [];
        for (let i = 0; i < sourceSnapshot.length; i++) {
            const row = sourceSnapshot[i];
            if (!isPlainObject(row)) return { status: 'invalid-input', side: 'source', index: i, field: 'row' };
            if (typeof row.name !== 'string') return { status: 'invalid-input', side: 'source', index: i, field: 'name' };
            if (typeof row.type !== 'string') return { status: 'invalid-input', side: 'source', index: i, field: 'type' };
            if (typeof row.start !== 'string') return { status: 'invalid-input', side: 'source', index: i, field: 'start' };
            if (typeof row.end !== 'string') return { status: 'invalid-input', side: 'source', index: i, field: 'end' };
            sourceCanonicals.push({
                name: row.name.trim(),
                type: row.type.trim(),
                start: row.start.trim(),
                end: row.end.trim()
            });
        }

        const draftCanonicals = [];
        for (let j = 0; j < draftRows.length; j++) {
            const row = draftRows[j];
            if (!isPlainObject(row)) return { status: 'invalid-input', side: 'draft', index: j, field: 'row' };
            if (typeof row.name !== 'string') return { status: 'invalid-input', side: 'draft', index: j, field: 'name' };
            if (typeof row.type !== 'string') return { status: 'invalid-input', side: 'draft', index: j, field: 'type' };
            if (typeof row.start !== 'string') return { status: 'invalid-input', side: 'draft', index: j, field: 'start' };
            if (typeof row.end !== 'string') return { status: 'invalid-input', side: 'draft', index: j, field: 'end' };
            draftCanonicals.push({
                name: row.name.trim(),
                type: row.type.trim(),
                start: row.start.trim(),
                end: row.end.trim()
            });
        }

        const { sourceMatches, draftMatches, length: unchangedCount } = computeLCS(sourceCanonicals, draftCanonicals);

        const added = [];
        const removed = [];
        const changed = [];

        // Traverse blocks between matches to pair changes
        const unmatchedSourceBlocks = [];
        const unmatchedDraftBlocks = [];

        // Convert matches to sorted arrays
        const sortedSourceMatches = Array.from(sourceMatches).sort((a, b) => a - b);
        const sortedDraftMatches = Array.from(draftMatches).sort((a, b) => a - b);

        // There are exactly `unchangedCount + 1` spaces between matches (including before first and after last)
        let lastS = -1;
        let lastD = -1;

        for (let i = 0; i <= unchangedCount; i++) {
            const nextS = i < unchangedCount ? sortedSourceMatches[i] : sourceCanonicals.length;
            const nextD = i < unchangedCount ? sortedDraftMatches[i] : draftCanonicals.length;

            const sBlock = [];
            for (let k = lastS + 1; k < nextS; k++) sBlock.push(k);
            unmatchedSourceBlocks.push(sBlock);

            const dBlock = [];
            for (let k = lastD + 1; k < nextD; k++) dBlock.push(k);
            unmatchedDraftBlocks.push(dBlock);

            lastS = nextS;
            lastD = nextD;
        }

        // Now both block arrays have exactly unchangedCount + 1 elements, and they perfectly align.
        for (let b = 0; b < unmatchedSourceBlocks.length; b++) {
            const sList = unmatchedSourceBlocks[b];
            const dList = unmatchedDraftBlocks[b];

            const minLen = Math.min(sList.length, dList.length);

            // Pair as changed
            for (let k = 0; k < minLen; k++) {
                const sIdx = sList[k];
                const dIdx = dList[k];
                const sRow = sourceCanonicals[sIdx];
                const dRow = draftCanonicals[dIdx];

                changed.push({
                    sourceIndex: sIdx,
                    draftIndex: dIdx,
                    before: { ...sRow },
                    after: { ...dRow },
                    changedFields: getChangedFields(sRow, dRow)
                });
            }

            // Remaining are removed
            for (let k = minLen; k < sList.length; k++) {
                const sIdx = sList[k];
                removed.push({
                    sourceIndex: sIdx,
                    row: { ...sourceCanonicals[sIdx] }
                });
            }

            // Remaining are added
            for (let k = minLen; k < dList.length; k++) {
                const dIdx = dList[k];
                added.push({
                    draftIndex: dIdx,
                    row: { ...draftCanonicals[dIdx] }
                });
            }
        }

        const counts = {
            added: added.length,
            removed: removed.length,
            changed: changed.length,
            unchanged: unchangedCount
        };

        const hasChanges = counts.added > 0 || counts.removed > 0 || counts.changed > 0;

        return {
            status: 'ok',
            hasChanges,
            counts,
            added,
            removed,
            changed
        };
    }

    function createScheduleReviewPanelView(document) {
        
        function formatType(typeValue) {
            if (typeValue === 'class') return 'Ders';
            if (typeValue === 'break') return 'Teneffüs';
            return `Bilinmeyen: ${typeValue || ''}`;
        }

        function createRowText(row) {
            const t = formatType(row.type);
            return `${row.start || '-'} - ${row.end || '-'} | ${t} | ${row.name || '-'}`;
        }

        function getContainer() {
            const container = document.getElementById('srpContainer');
            if (!container) throw new Error('dependency-container');
            return container;
        }

        return {
            renderNotInitialized() {
                const container = getContainer();
                container.textContent = 'Karşılaştırma için program henüz hazırlanmadı.';
                container.style.color = '#64748b';
            },
            renderSourceUnavailable() {
                const container = getContainer();
                container.textContent = 'Geçerli kaynak program alınamadığı için karşılaştırma yapılamıyor.';
                container.style.color = '#f59e0b';
            },
            renderInvalidInput() {
                const container = getContainer();
                container.textContent = 'Geçersiz veri biçimi nedeniyle karşılaştırma yapılamıyor.';
                container.style.color = '#ef4444';
            },
            renderComparison(comparison) {
                const container = getContainer();
                container.replaceChildren();

                // Explanatory Notice
                const notice = document.createElement('div');
                notice.style.fontSize = '0.9rem';
                notice.style.color = '#64748b';
                notice.style.marginBottom = '15px';
                notice.textContent = 'Bu karşılaştırma yalnızca inceleme amaçlıdır. Değişiklikler sunucuya gönderilmez.';
                container.appendChild(notice);

                if (!comparison.hasChanges) {
                    const noDiff = document.createElement('div');
                    noDiff.textContent = 'Kaynak program ile yerel taslak arasında fark yok.';
                    noDiff.style.fontWeight = 'bold';
                    noDiff.style.color = '#10b981';
                    container.appendChild(noDiff);
                    return;
                }

                // Counts
                const countsDiv = document.createElement('div');
                countsDiv.style.display = 'flex';
                countsDiv.style.gap = '15px';
                countsDiv.style.marginBottom = '20px';
                countsDiv.style.flexWrap = 'wrap';

                const cAdded = document.createElement('div');
                cAdded.style.padding = '10px';
                cAdded.style.background = '#ecfdf5';
                cAdded.style.border = '1px solid #10b981';
                cAdded.style.borderRadius = '8px';
                cAdded.style.color = '#047857';
                const sAdded = document.createElement('strong');
                sAdded.textContent = 'Eklenen: ';
                cAdded.appendChild(sAdded);
                cAdded.appendChild(document.createTextNode(comparison.counts.added));
                countsDiv.appendChild(cAdded);

                const cRemoved = document.createElement('div');
                cRemoved.style.padding = '10px';
                cRemoved.style.background = '#fef2f2';
                cRemoved.style.border = '1px solid #ef4444';
                cRemoved.style.borderRadius = '8px';
                cRemoved.style.color = '#b91c1c';
                const sRemoved = document.createElement('strong');
                sRemoved.textContent = 'Kaldırılan: ';
                cRemoved.appendChild(sRemoved);
                cRemoved.appendChild(document.createTextNode(comparison.counts.removed));
                countsDiv.appendChild(cRemoved);

                const cChanged = document.createElement('div');
                cChanged.style.padding = '10px';
                cChanged.style.background = '#eff6ff';
                cChanged.style.border = '1px solid #3b82f6';
                cChanged.style.borderRadius = '8px';
                cChanged.style.color = '#1d4ed8';
                const sChanged = document.createElement('strong');
                sChanged.textContent = 'Değiştirilen: ';
                cChanged.appendChild(sChanged);
                cChanged.appendChild(document.createTextNode(comparison.counts.changed));
                countsDiv.appendChild(cChanged);

                const cUnchanged = document.createElement('div');
                cUnchanged.style.padding = '10px';
                cUnchanged.style.background = '#f8fafc';
                cUnchanged.style.border = '1px solid #cbd5e1';
                cUnchanged.style.borderRadius = '8px';
                cUnchanged.style.color = '#475569';
                const sUnchanged = document.createElement('strong');
                sUnchanged.textContent = 'Değişmeyen: ';
                cUnchanged.appendChild(sUnchanged);
                cUnchanged.appendChild(document.createTextNode(comparison.counts.unchanged));
                countsDiv.appendChild(cUnchanged);

                container.appendChild(countsDiv);

                // Added Section
                if (comparison.added.length > 0) {
                    const addH = document.createElement('h4');
                    addH.textContent = 'Eklenen Dönemler';
                    addH.style.color = '#047857';
                    addH.style.margin = '0 0 10px 0';
                    container.appendChild(addH);

                    const addList = document.createElement('ul');
                    addList.style.paddingLeft = '20px';
                    addList.style.marginBottom = '20px';
                    addList.style.color = '#065f46';
                    comparison.added.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = createRowText(item.row);
                        addList.appendChild(li);
                    });
                    container.appendChild(addList);
                }

                // Removed Section
                if (comparison.removed.length > 0) {
                    const remH = document.createElement('h4');
                    remH.textContent = 'Kaldırılan Dönemler';
                    remH.style.color = '#b91c1c';
                    remH.style.margin = '0 0 10px 0';
                    container.appendChild(remH);

                    const remList = document.createElement('ul');
                    remList.style.paddingLeft = '20px';
                    remList.style.marginBottom = '20px';
                    remList.style.color = '#991b1b';
                    comparison.removed.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = createRowText(item.row);
                        remList.appendChild(li);
                    });
                    container.appendChild(remList);
                }

                // Changed Section
                if (comparison.changed.length > 0) {
                    const chH = document.createElement('h4');
                    chH.textContent = 'Değiştirilen Dönemler';
                    chH.style.color = '#1d4ed8';
                    chH.style.margin = '0 0 10px 0';
                    container.appendChild(chH);

                    const chList = document.createElement('ul');
                    chList.style.paddingLeft = '20px';
                    chList.style.marginBottom = '20px';
                    chList.style.color = '#1e40af';
                    comparison.changed.forEach(item => {
                        const li = document.createElement('li');
                        li.style.marginBottom = '10px';
                        
                        const topDiv = document.createElement('div');
                        topDiv.style.fontWeight = 'bold';
                        topDiv.textContent = `Değişen alanlar: ${item.changedFields.join(', ')}`;
                        li.appendChild(topDiv);

                        const prevDiv = document.createElement('div');
                        prevDiv.style.fontSize = '0.9rem';
                        prevDiv.style.color = '#ef4444';
                        prevDiv.style.textDecoration = 'line-through';
                        prevDiv.textContent = `Önceki değer: ${createRowText(item.before)}`;
                        li.appendChild(prevDiv);

                        const newDiv = document.createElement('div');
                        newDiv.style.fontSize = '0.9rem';
                        newDiv.style.color = '#10b981';
                        newDiv.textContent = `Taslak değeri: ${createRowText(item.after)}`;
                        li.appendChild(newDiv);

                        chList.appendChild(li);
                    });
                    container.appendChild(chList);
                }
            }
        };
    }

    function createScheduleReviewPanelController({ view, logger }) {
        return {
            renderEditorState(editorState) {
                if (!view) {
                    return { status: 'dependency-error', dependency: 'view', rendered: false };
                }

                if (!editorState || !editorState.initialized) {
                    try {
                        view.renderNotInitialized();
                        return { status: 'not-initialized', rendered: true };
                    } catch (e) {
                        if (e.message === 'dependency-container') {
                            return { status: 'dependency-error', dependency: 'container', rendered: false };
                        }
                        return { status: 'render-error', dependency: 'view', rendered: false };
                    }
                }

                if (!editorState.sourceAvailable) {
                    try {
                        view.renderSourceUnavailable();
                        return { status: 'source-unavailable', rendered: true };
                    } catch (e) {
                        if (e.message === 'dependency-container') {
                            return { status: 'dependency-error', dependency: 'container', rendered: false };
                        }
                        return { status: 'render-error', dependency: 'view', rendered: false };
                    }
                }

                let comparison;
                try {
                    comparison = compareSchedules(editorState.sourceSnapshot, editorState.draft);
                } catch (e) {
                    return { status: 'render-error', dependency: 'view', rendered: false };
                }

                if (comparison.status === 'invalid-input') {
                    try {
                        view.renderInvalidInput();
                        return { 
                            status: 'invalid-input', 
                            side: comparison.side, 
                            index: comparison.index, 
                            field: comparison.field, 
                            rendered: true 
                        };
                    } catch (e) {
                        if (e.message === 'dependency-container') {
                            return { status: 'dependency-error', dependency: 'container', rendered: false };
                        }
                        return { status: 'render-error', dependency: 'view', rendered: false };
                    }
                }

                try {
                    view.renderComparison(comparison);
                    return { 
                        status: 'ok', 
                        rendered: true, 
                        comparison: JSON.parse(JSON.stringify(comparison)) 
                    };
                } catch (e) {
                    if (e.message === 'dependency-container') {
                        return { status: 'dependency-error', dependency: 'container', rendered: false };
                    }
                    return { status: 'render-error', dependency: 'view', rendered: false };
                }
            }
        };
    }

    return {
        compareSchedules,
        createScheduleReviewPanelView,
        createScheduleReviewPanelController
    };

})();

if (typeof window !== 'undefined') {
    window.AdminScheduleReviewPanel = AdminScheduleReviewPanel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminScheduleReviewPanel;
}
