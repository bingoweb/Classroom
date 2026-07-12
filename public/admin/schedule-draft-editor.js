const AdminScheduleDraftEditor = (function() {

    function isPlainObject(val) {
        return Object.prototype.toString.call(val) === '[object Object]';
    }

    function translateDraftIssueCode(code) {
        const translations = {
            'INPUT_NOT_ARRAY': 'Girdi bir dizi değil.',
            'EMPTY_SCHEDULE': 'Taslakta henüz dönem bulunmuyor.',
            'INVALID_ROW': 'Bir satır düzensiz formata sahip.',
            'MISSING_NAME': 'Bir taslak satırının adı eksik.',
            'UNKNOWN_TYPE': 'Bir taslak satırının türü bilinmiyor veya eksik.',
            'INVALID_START_TIME': 'Bir taslak satırının başlangıç saati geçersiz.',
            'INVALID_END_TIME': 'Bir taslak satırının bitiş saati geçersiz.',
            'ZERO_DURATION': 'Bir taslak satırının süresi sıfır.',
            'END_BEFORE_START': 'Bir taslak satırının bitiş saati başlangıcından önce.',
            'NO_VALID_PERIODS': 'Geçerli hiçbir dönem bulunamadı.',
            'DUPLICATE_PERIOD': 'Aynı dönem taslakta birden fazla kez bulunuyor.',
            'OVERLAP': 'Taslaktaki dönemlerin saatleri çakışıyor.',
            'SCHEDULE_VALIDATION_EXCEPTION': 'Taslak doğrulanırken bir hata fırlatıldı.'
        };
        return translations[code] || 'Taslak doğrulanırken tanımlanamayan bir sorun bulundu.';
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

    function areDraftRowsEqual(rowsA, rowsB) {
        if (!Array.isArray(rowsA) || !Array.isArray(rowsB)) return false;
        if (rowsA.length !== rowsB.length) return false;

        for (let i = 0; i < rowsA.length; i++) {
            const a = createCanonicalDraftRow(rowsA[i]);
            const b = createCanonicalDraftRow(rowsB[i]);
            if (a.name !== b.name || a.type !== b.type || a.start !== b.start || a.end !== b.end) {
                return false;
            }
        }
        return true;
    }

    function generateId() {
        return 'draft-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    }

    function createDraftValidationResult(normalizerResult, inputRowCount) {
        if (!isPlainObject(normalizerResult)) {
            return {
                ready: false,
                rawValid: false,
                normalizedPeriods: [],
                warnings: [],
                errors: [],
                inputRowCount: inputRowCount,
                normalizedRowCount: 0
            };
        }

        const warnings = Array.isArray(normalizerResult.warnings) ? normalizerResult.warnings.map(w => ({...w})) : [];
        const errors = Array.isArray(normalizerResult.errors) ? normalizerResult.errors.map(e => ({...e})) : [];
        const periods = Array.isArray(normalizerResult.periods) ? normalizerResult.periods.map(p => ({...p})) : [];

        let ready = false;
        if (
            normalizerResult.valid === true &&
            warnings.length === 0 &&
            errors.length === 0 &&
            periods.length === inputRowCount &&
            inputRowCount > 0
        ) {
            ready = true;
        }

        return {
            ready,
            rawValid: !!normalizerResult.valid,
            normalizedPeriods: periods,
            warnings,
            errors,
            inputRowCount,
            normalizedRowCount: periods.length
        };
    }

    function createDomScheduleDraftEditorView(document) {
        return {
            render(state) {
                const tableBody = document.getElementById('sdeEditableTableBody');
                if (tableBody) {
                    tableBody.replaceChildren();
                    state.draft.forEach((row, index) => {
                        const tr = document.createElement('tr');
                        
                        // Index
                        const tdIndex = document.createElement('td');
                        tdIndex.textContent = index + 1;
                        tdIndex.style.padding = '8px';
                        tdIndex.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdIndex);

                        // Type
                        const tdType = document.createElement('td');
                        tdType.style.padding = '8px';
                        tdType.style.border = '1px solid #e2e8f0';
                        const selectType = document.createElement('select');
                        selectType.style.width = '100%';
                        selectType.style.padding = '5px';
                        const optClass = document.createElement('option');
                        optClass.value = 'class';
                        optClass.textContent = 'Ders';
                        const optBreak = document.createElement('option');
                        optBreak.value = 'break';
                        optBreak.textContent = 'Teneffüs';
                        
                        // Unknown Type
                        if (row.type !== 'class' && row.type !== 'break') {
                            const optUnknown = document.createElement('option');
                            optUnknown.value = row.type || '';
                            optUnknown.textContent = row.type || 'Bilinmiyor';
                            selectType.appendChild(optUnknown);
                        }

                        selectType.appendChild(optClass);
                        selectType.appendChild(optBreak);
                        selectType.value = row.type || '';

                        selectType.addEventListener('change', (e) => {
                            if (window.scheduleDraftEditorController) {
                                window.scheduleDraftEditorController.updateRow(row.id, { type: e.target.value });
                            }
                        });
                        tdType.appendChild(selectType);
                        tr.appendChild(tdType);

                        // Name
                        const tdName = document.createElement('td');
                        tdName.style.padding = '8px';
                        tdName.style.border = '1px solid #e2e8f0';
                        const inputName = document.createElement('input');
                        inputName.type = 'text';
                        inputName.value = row.name || '';
                        inputName.style.width = '100%';
                        inputName.style.padding = '5px';
                        inputName.addEventListener('change', (e) => {
                            if (window.scheduleDraftEditorController) {
                                window.scheduleDraftEditorController.updateRow(row.id, { name: e.target.value });
                            }
                        });
                        tdName.appendChild(inputName);
                        tr.appendChild(tdName);

                        // Start
                        const tdStart = document.createElement('td');
                        tdStart.style.padding = '8px';
                        tdStart.style.border = '1px solid #e2e8f0';
                        const inputStart = document.createElement('input');
                        inputStart.type = 'time';
                        inputStart.value = row.start || '';
                        inputStart.style.width = '100%';
                        inputStart.style.padding = '5px';
                        inputStart.addEventListener('change', (e) => {
                            if (window.scheduleDraftEditorController) {
                                window.scheduleDraftEditorController.updateRow(row.id, { start: e.target.value });
                            }
                        });
                        tdStart.appendChild(inputStart);
                        tr.appendChild(tdStart);

                        // End
                        const tdEnd = document.createElement('td');
                        tdEnd.style.padding = '8px';
                        tdEnd.style.border = '1px solid #e2e8f0';
                        const inputEnd = document.createElement('input');
                        inputEnd.type = 'time';
                        inputEnd.value = row.end || '';
                        inputEnd.style.width = '100%';
                        inputEnd.style.padding = '5px';
                        inputEnd.addEventListener('change', (e) => {
                            if (window.scheduleDraftEditorController) {
                                window.scheduleDraftEditorController.updateRow(row.id, { end: e.target.value });
                            }
                        });
                        tdEnd.appendChild(inputEnd);
                        tr.appendChild(tdEnd);

                        // Actions
                        const tdActions = document.createElement('td');
                        tdActions.style.padding = '8px';
                        tdActions.style.border = '1px solid #e2e8f0';
                        const btnDelete = document.createElement('button');
                        btnDelete.type = 'button';
                        btnDelete.textContent = 'Sil';
                        btnDelete.style.padding = '5px 10px';
                        btnDelete.style.background = '#ef4444';
                        btnDelete.style.color = 'white';
                        btnDelete.style.border = 'none';
                        btnDelete.style.borderRadius = '5px';
                        btnDelete.style.cursor = 'pointer';
                        btnDelete.addEventListener('click', () => {
                            if (window.scheduleDraftEditorController) {
                                window.scheduleDraftEditorController.removeRow(row.id);
                            }
                        });
                        tdActions.appendChild(btnDelete);
                        tr.appendChild(tdActions);

                        tableBody.appendChild(tr);
                    });
                }

                // Update Info Fields
                const statusEl = document.getElementById('sdeStatus');
                const dirtyEl = document.getElementById('sdeDirtyStatus');
                const rowCountEl = document.getElementById('sdeRowCount');
                const validCountEl = document.getElementById('sdeValidCount');
                const infoMsgEl = document.getElementById('sdeInfoMessage');

                if (statusEl) {
                    if (!state.initialized) {
                        statusEl.textContent = 'Henüz hazırlanmadı';
                        statusEl.style.color = '#64748b';
                    } else if (!state.sourceAvailable) {
                        statusEl.textContent = 'Kaynak program alınamadı';
                        statusEl.style.color = '#f59e0b';
                    } else if (state.validation.ready) {
                        statusEl.textContent = 'Taslak geçerli';
                        statusEl.style.color = '#10b981';
                    } else {
                        statusEl.textContent = 'Düzeltme gerekli';
                        statusEl.style.color = '#ef4444';
                    }
                }

                if (dirtyEl) {
                    if (state.dirty) {
                        dirtyEl.textContent = 'Kaydedilmemiş değişiklik var';
                        dirtyEl.style.color = '#f59e0b';
                    } else {
                        dirtyEl.textContent = 'Değişiklik yok';
                        dirtyEl.style.color = '#10b981';
                    }
                }

                if (rowCountEl) rowCountEl.textContent = state.draft.length;
                if (validCountEl) validCountEl.textContent = state.validation.normalizedRowCount;

                if (infoMsgEl) {
                    if (state.sourceUpdatedWhileDirty) {
                        infoMsgEl.textContent = 'Kaynak program yenilendi; yerel taslağınız korundu.';
                        infoMsgEl.style.display = 'block';
                    } else {
                        infoMsgEl.style.display = 'none';
                        infoMsgEl.textContent = '';
                    }
                }

                // Warnings
                const warnContainer = document.getElementById('sdeWarningsList');
                const warnUl = document.getElementById('sdeWarningsUl');
                if (warnContainer && warnUl) {
                    if (state.validation.warnings && state.validation.warnings.length > 0) {
                        warnUl.replaceChildren();
                        state.validation.warnings.forEach(w => {
                            const li = document.createElement('li');
                            const tr = translateDraftIssueCode(w.code);
                            li.textContent = tr;
                            const span = document.createElement('span');
                            span.style.fontFamily = 'monospace';
                            span.style.fontSize = '0.8rem';
                            span.style.color = '#9ca3af';
                            span.style.marginLeft = '10px';
                            span.textContent = w.code || 'Bilinmeyen Kod';
                            li.appendChild(span);
                            warnUl.appendChild(li);
                        });
                        warnContainer.style.display = 'block';
                    } else {
                        warnContainer.style.display = 'none';
                    }
                }

                // Errors
                const errContainer = document.getElementById('sdeErrorsList');
                const errUl = document.getElementById('sdeErrorsUl');
                if (errContainer && errUl) {
                    if (state.validation.errors && state.validation.errors.length > 0) {
                        errUl.replaceChildren();
                        state.validation.errors.forEach(e => {
                            const li = document.createElement('li');
                            const tr = translateDraftIssueCode(e.code);
                            li.textContent = tr;
                            const span = document.createElement('span');
                            span.style.fontFamily = 'monospace';
                            span.style.fontSize = '0.8rem';
                            span.style.color = '#9ca3af';
                            span.style.marginLeft = '10px';
                            span.textContent = e.code || 'Bilinmeyen Kod';
                            li.appendChild(span);
                            errUl.appendChild(li);
                        });
                        errContainer.style.display = 'block';
                    } else {
                        errContainer.style.display = 'none';
                    }
                }

                // Normalized Preview
                const previewTableBody = document.getElementById('sdePreviewTableBody');
                if (previewTableBody) {
                    previewTableBody.replaceChildren();
                    state.validation.normalizedPeriods.forEach((p, idx) => {
                        const tr = document.createElement('tr');
                        
                        const tdIdx = document.createElement('td');
                        tdIdx.textContent = idx + 1;
                        tdIdx.style.padding = '8px';
                        tdIdx.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdIdx);

                        const tdType = document.createElement('td');
                        let typeText = 'Bilinmeyen';
                        if (p.type === 'class') typeText = 'Ders';
                        if (p.type === 'break') typeText = 'Teneffüs';
                        tdType.textContent = typeText;
                        tdType.style.padding = '8px';
                        tdType.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdType);

                        const tdName = document.createElement('td');
                        tdName.textContent = p.name || '';
                        tdName.style.padding = '8px';
                        tdName.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdName);

                        const tdStart = document.createElement('td');
                        tdStart.textContent = p.start || '';
                        tdStart.style.padding = '8px';
                        tdStart.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdStart);

                        const tdEnd = document.createElement('td');
                        tdEnd.textContent = p.end || '';
                        tdEnd.style.padding = '8px';
                        tdEnd.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdEnd);

                        const tdDur = document.createElement('td');
                        if (typeof p.duration === 'number' && p.duration > 0) {
                            tdDur.textContent = p.duration + ' dk';
                        } else {
                            tdDur.textContent = '—';
                        }
                        tdDur.style.padding = '8px';
                        tdDur.style.border = '1px solid #e2e8f0';
                        tr.appendChild(tdDur);

                        previewTableBody.appendChild(tr);
                    });
                }
            }
        };
    }

    function createScheduleDraftEditorController(options) {
        if (!isPlainObject(options)) {
            options = {};
        }

        const normalizer = options.normalizer;
        const view = options.view;
        const logger = options.logger;

        let sourceSnapshot = [];
        let draftRows = [];
        let initialized = false;
        let dirty = false;
        let sourceUpdatedWhileDirty = false;
        let sourceAvailable = false;
        let lastValidation = createDraftValidationResult(null, 0);

        function validateDraft() {
            if (!normalizer || typeof normalizer.normalizeSchedule !== 'function') {
                return createDraftValidationResult(null, draftRows.length);
            }

            const canonicalInput = draftRows.map(createCanonicalDraftRow);
            try {
                const result = normalizer.normalizeSchedule(canonicalInput);
                return createDraftValidationResult(result, draftRows.length);
            } catch (err) {
                if (logger && logger.error) {
                    logger.error('DRAFT_EDITOR', 'Normalizer threw during validation', err);
                }
                return createDraftValidationResult({
                    valid: false,
                    periods: [],
                    warnings: [],
                    errors: [{ code: 'SCHEDULE_VALIDATION_EXCEPTION', message: String(err) }]
                }, draftRows.length);
            }
        }

        function revalidate() {
            lastValidation = validateDraft();
        }

        function rerender() {
            if (view && typeof view.render === 'function') {
                try {
                    view.render(controller.getState());
                } catch (e) {
                    if (logger && logger.error) {
                        logger.error('DRAFT_EDITOR', 'View threw during render', e);
                    }
                }
            }
        }

        function copyRows(rows) {
            return rows.map(r => {
                const c = { ...r };
                if (c.id === undefined) c.id = generateId();
                return c;
            });
        }

        function copySourceRows(periods) {
            return periods.map(p => {
                return {
                    id: generateId(),
                    name: p.name || '',
                    type: p.type || 'class',
                    start: p.start || '',
                    end: p.end || ''
                };
            });
        }

        const controller = {
            acceptDiagnosticsResult: function(result) {
                if (!isPlainObject(result)) {
                    if (!initialized) {
                        sourceSnapshot = [];
                        draftRows = [];
                        initialized = true;
                        sourceAvailable = false;
                        dirty = false;
                        sourceUpdatedWhileDirty = false;
                        revalidate();
                        rerender();
                    }
                    return;
                }

                let incomingPeriods = [];
                let incomingSourceAvailable = false;

                if (result.state === 'valid' && result.valid === true && Array.isArray(result.periods)) {
                    incomingPeriods = copySourceRows(result.periods);
                    incomingSourceAvailable = true;
                } else if (result.state === 'empty' || result.state === 'legacy-incomplete' || result.state === 'invalid') {
                    incomingPeriods = [];
                    incomingSourceAvailable = false;
                } else {
                    if (!initialized) {
                        sourceSnapshot = [];
                        draftRows = [];
                        initialized = true;
                        sourceAvailable = false;
                        dirty = false;
                        sourceUpdatedWhileDirty = false;
                        revalidate();
                        rerender();
                    }
                    return;
                }

                if (!initialized) {
                    sourceSnapshot = copyRows(incomingPeriods);
                    draftRows = copyRows(incomingPeriods);
                    initialized = true;
                    sourceAvailable = incomingSourceAvailable;
                    dirty = false;
                    sourceUpdatedWhileDirty = false;
                    revalidate();
                    rerender();
                    return;
                }

                if (!dirty) {
                    sourceSnapshot = copyRows(incomingPeriods);
                    draftRows = copyRows(incomingPeriods);
                    sourceAvailable = incomingSourceAvailable;
                    sourceUpdatedWhileDirty = false;
                    revalidate();
                    rerender();
                    return;
                }

                if (areDraftRowsEqual(sourceSnapshot, incomingPeriods)) {
                    sourceAvailable = incomingSourceAvailable;
                    return;
                }

                sourceSnapshot = copyRows(incomingPeriods);
                sourceAvailable = incomingSourceAvailable;
                sourceUpdatedWhileDirty = true;
                rerender();
            },

            loadSourcePeriods: function() {
                return { status: 'ok' };
            },

            addRow: function() {
                if (!initialized) return { status: 'not_initialized' };
                draftRows.push({
                    id: generateId(),
                    name: '',
                    type: 'class',
                    start: '',
                    end: ''
                });
                dirty = !areDraftRowsEqual(sourceSnapshot, draftRows);
                revalidate();
                rerender();
                return { status: 'ok' };
            },

            updateRow: function(id, patch) {
                if (!initialized) return { status: 'not_initialized' };
                if (!isPlainObject(patch)) return { status: 'invalid_patch' };
                
                const idx = draftRows.findIndex(r => r.id === id);
                if (idx === -1) return { status: 'not_found' };

                const row = draftRows[idx];
                let changed = false;

                ['name', 'type', 'start', 'end'].forEach(key => {
                    if (patch[key] !== undefined && typeof patch[key] === 'string') {
                        row[key] = patch[key];
                        changed = true;
                    }
                });

                if (changed) {
                    dirty = !areDraftRowsEqual(sourceSnapshot, draftRows);
                    revalidate();
                    rerender();
                }

                return { status: 'ok' };
            },

            removeRow: function(id) {
                if (!initialized) return { status: 'not_initialized' };
                const idx = draftRows.findIndex(r => r.id === id);
                if (idx === -1) return { status: 'not_found' };

                draftRows.splice(idx, 1);
                dirty = !areDraftRowsEqual(sourceSnapshot, draftRows);
                revalidate();
                rerender();

                return { status: 'ok' };
            },

            resetToSource: function() {
                if (!initialized) return { status: 'not_initialized' };
                draftRows = copyRows(sourceSnapshot);
                dirty = false;
                sourceUpdatedWhileDirty = false;
                revalidate();
                rerender();
                return { status: 'ok' };
            },

            validate: function() {
                if (!initialized) return { status: 'not_initialized' };
                revalidate();
                rerender();
                return { status: 'ok' };
            },

            getState: function() {
                return {
                    initialized,
                    dirty,
                    sourceAvailable,
                    sourceUpdatedWhileDirty,
                    sourceSnapshot: copyRows(sourceSnapshot),
                    draft: copyRows(draftRows),
                    validation: JSON.parse(JSON.stringify(lastValidation))
                };
            },

            isDirty: function() {
                return dirty;
            },

            isInitialized: function() {
                return initialized;
            }
        };

        return controller;
    }

    return {
        createScheduleDraftEditorController,
        createDomScheduleDraftEditorView,
        createDraftValidationResult,
        createCanonicalDraftRow,
        areDraftRowsEqual,
        translateDraftIssueCode
    };

})();

if (typeof window !== 'undefined') {
    window.AdminScheduleDraftEditor = AdminScheduleDraftEditor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminScheduleDraftEditor;
}
