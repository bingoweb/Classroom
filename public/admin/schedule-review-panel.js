const AdminScheduleReviewPanel = (function() {

    function isPlainObject(val) {
        return Object.prototype.toString.call(val) === '[object Object]';
    }

    function createCanonicalDraftRow(row) {
        if (!isPlainObject(row)) return {};
        const canonical = {};
        if (typeof row.name === 'string') canonical.name = row.name.trim();
        else if (row.name !== undefined && row.name !== null) canonical.name = String(row.name).trim();

        if (typeof row.type === 'string') canonical.type = row.type.trim();
        else if (row.type !== undefined && row.type !== null) canonical.type = String(row.type).trim();

        if (typeof row.start === 'string') canonical.start = row.start.trim();
        else if (row.start !== undefined && row.start !== null) canonical.start = String(row.start).trim();

        if (typeof row.end === 'string') canonical.end = row.end.trim();
        else if (row.end !== undefined && row.end !== null) canonical.end = String(row.end).trim();

        return canonical;
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
            return { status: 'invalid-input' };
        }

        const sourceCanonicals = [];
        for (let i = 0; i < sourceSnapshot.length; i++) {
            if (!isPlainObject(sourceSnapshot[i])) return { status: 'invalid-input' };
            sourceCanonicals.push(createCanonicalDraftRow(sourceSnapshot[i]));
        }

        const draftCanonicals = [];
        for (let i = 0; i < draftRows.length; i++) {
            if (!isPlainObject(draftRows[i])) return { status: 'invalid-input' };
            draftCanonicals.push(createCanonicalDraftRow(draftRows[i]));
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

    function createDomScheduleReviewPanelView(document) {
        
        function formatType(typeValue) {
            if (typeValue === 'class') return 'Ders';
            if (typeValue === 'break') return 'Teneffüs';
            return `Bilinmeyen: ${typeValue || ''}`;
        }

        function createRowText(row) {
            const t = formatType(row.type);
            return `${row.start || '-'} - ${row.end || '-'} | ${t} | ${row.name || '-'}`;
        }

        return {
            render(state) {
                const container = document.getElementById('srpContainer');
                if (!container) return; // Optional in DOM

                if (!state || !state.initialized) {
                    container.textContent = 'Karşılaştırma için program henüz hazırlanmadı.';
                    container.style.color = '#64748b';
                    return;
                }

                if (!state.sourceAvailable) {
                    container.textContent = 'Geçerli kaynak program alınamadığı için karşılaştırma yapılamıyor.';
                    container.style.color = '#f59e0b';
                    return;
                }

                // If view rendering throws, draft editor catches it, but this view should ideally be robust.
                // Draft editor guarantees state.sourceSnapshot and state.draft are arrays.
                let comparison;
                try {
                    comparison = compareSchedules(state.sourceSnapshot, state.draft);
                } catch (e) {
                    container.textContent = 'Karşılaştırma sırasında bir hata oluştu.';
                    container.style.color = '#ef4444';
                    return;
                }

                if (comparison.status === 'invalid-input') {
                    container.textContent = 'Geçersiz veri formatı nedeniyle karşılaştırma yapılamıyor.';
                    container.style.color = '#ef4444';
                    return;
                }

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
                cAdded.innerHTML = `<strong>Eklenen:</strong> ${comparison.counts.added}`;
                countsDiv.appendChild(cAdded);

                const cRemoved = document.createElement('div');
                cRemoved.style.padding = '10px';
                cRemoved.style.background = '#fef2f2';
                cRemoved.style.border = '1px solid #ef4444';
                cRemoved.style.borderRadius = '8px';
                cRemoved.style.color = '#b91c1c';
                cRemoved.innerHTML = `<strong>Kaldırılan:</strong> ${comparison.counts.removed}`;
                countsDiv.appendChild(cRemoved);

                const cChanged = document.createElement('div');
                cChanged.style.padding = '10px';
                cChanged.style.background = '#eff6ff';
                cChanged.style.border = '1px solid #3b82f6';
                cChanged.style.borderRadius = '8px';
                cChanged.style.color = '#1d4ed8';
                cChanged.innerHTML = `<strong>Değiştirilen:</strong> ${comparison.counts.changed}`;
                countsDiv.appendChild(cChanged);

                const cUnchanged = document.createElement('div');
                cUnchanged.style.padding = '10px';
                cUnchanged.style.background = '#f8fafc';
                cUnchanged.style.border = '1px solid #cbd5e1';
                cUnchanged.style.borderRadius = '8px';
                cUnchanged.style.color = '#475569';
                cUnchanged.innerHTML = `<strong>Değişmeyen:</strong> ${comparison.counts.unchanged}`;
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
                        prevDiv.textContent = createRowText(item.before);
                        li.appendChild(prevDiv);

                        const newDiv = document.createElement('div');
                        newDiv.style.fontSize = '0.9rem';
                        newDiv.style.color = '#10b981';
                        newDiv.textContent = createRowText(item.after);
                        li.appendChild(newDiv);

                        chList.appendChild(li);
                    });
                    container.appendChild(chList);
                }

            }
        };
    }

    return {
        compareSchedules,
        createDomScheduleReviewPanelView
    };

})();

if (typeof window !== 'undefined') {
    window.AdminScheduleReviewPanel = AdminScheduleReviewPanel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminScheduleReviewPanel;
}
