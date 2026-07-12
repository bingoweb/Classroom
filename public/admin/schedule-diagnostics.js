(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.AdminScheduleDiagnostics = factory();
    }
}(this, (function () {
    'use strict';

    function translateDiagnosticCode(code) {
        const mappings = {
            'INVALID_ROW': 'Geçersiz satır formatı.',
            'MISSING_NAME': 'Dönem adlarından biri eksik.',
            'UNKNOWN_TYPE': 'Bilinmeyen dönem türü.',
            'INVALID_START_TIME': 'Başlangıç zamanı geçersiz.',
            'INVALID_END_TIME': 'Bitiş zamanı geçersiz.',
            'ZERO_DURATION': 'Dönem süresi sıfır veya negatif.',
            'END_BEFORE_START': 'Bitiş zamanı başlangıçtan önce.',
            'DUPLICATE_PERIOD': 'Aynı saate denk gelen birden fazla dönem var.',
            'OVERLAP': 'Dönemler arası çakışma var.',
            'SCHEDULE_GAP': 'Program dönemleri arasında zaman boşluğu var.',
            'NO_CLASS_PERIOD': 'Hiç ders (class) dönemi bulunamadı.',
            'PARTIAL_SCHEDULE_REJECTED': 'Bazı satırlar geçersiz olduğu için programın tamamı reddedildi.',
            'INVALID_NORMALIZER_RESULT': 'Normalleştirici geçersiz bir sonuç döndürdü.',
            'SCHEDULE_VALIDATION_EXCEPTION': 'Program doğrulanırken sistem hatası oluştu.',
            'INVALID_SCHEDULE_DAY': 'Geçersiz program günü.',
            'INVALID_SCHEDULE_BODY': 'Geçersiz program formatı.',
            'SCHEDULE_STORAGE_UNAVAILABLE': 'Program depolama alanına ulaşılamıyor.'
        };
        return mappings[code] || 'Program verisinde tanımlanamayan bir sorun bulundu.';
    }

    function translateSource(source) {
        switch (source) {
            case 'database': return 'Veritabanı';
            case 'empty': return 'Kayıt yok';
            case 'legacy-incomplete': return 'Eski veya eksik veri';
            default: return 'Bilinmeyen kaynak';
        }
    }

    function translateDay(day) {
        if (day === 'weekday') return 'Hafta içi';
        return day;
    }

    function translateType(type) {
        if (type === 'class') return 'Ders';
        if (type === 'break') return 'Teneffüs';
        return 'Bilinmeyen';
    }

    function isPlainObject(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    function normalizeDiagnostics(items) {
        if (!Array.isArray(items)) {
            return {
                valid: false,
                diagnostics: []
            };
        }

        const diagnostics = [];

        for (const item of items) {
            if (
                !isPlainObject(item) ||
                typeof item.code !== 'string' ||
                item.code.trim() === ''
            ) {
                return {
                    valid: false,
                    diagnostics: []
                };
            }

            diagnostics.push({
                code: item.code,
                message: translateDiagnosticCode(item.code)
            });
        }

        return {
            valid: true,
            diagnostics
        };
    }

    function createScheduleDiagnosticsViewModel(response, expectedDay = 'weekday') {
        const invalidModel = {
            state: 'invalid',
            valid: false,
            source: 'unknown',
            sourceLabel: 'Bilinmeyen kaynak',
            day: expectedDay,
            dayLabel: translateDay(expectedDay),
            periods: [],
            warnings: [],
            errors: [],
            periodCount: 0
        };

        if (!isPlainObject(response)) {
            return invalidModel;
        }

        if (response.day !== expectedDay) {
            return invalidModel;
        }

        if (typeof response.source !== 'string' || !['database', 'empty', 'legacy-incomplete'].includes(response.source)) {
            return invalidModel;
        }

        if (typeof response.valid !== 'boolean') {
            return invalidModel;
        }

        if (!Array.isArray(response.periods)) {
            return invalidModel;
        }

        const warningsResult = normalizeDiagnostics(response.warnings);
        if (!warningsResult.valid) {
            return invalidModel;
        }

        const errorsResult = normalizeDiagnostics(response.errors);
        if (!errorsResult.valid) {
            return invalidModel;
        }

        const source = response.source;
        const warnings = warningsResult.diagnostics;
        const errors = errorsResult.diagnostics;

        if (source === 'empty' || source === 'legacy-incomplete') {
            return {
                state: source,
                valid: false,
                source: source,
                sourceLabel: translateSource(source),
                day: expectedDay,
                dayLabel: translateDay(expectedDay),
                periods: [],
                warnings: warnings,
                errors: errors,
                periodCount: 0
            };
        }

        if (source === 'database' && response.valid === false) {
            return {
                state: 'invalid',
                valid: false,
                source: 'database',
                sourceLabel: translateSource(source),
                day: expectedDay,
                dayLabel: translateDay(expectedDay),
                periods: [],
                warnings: warnings,
                errors: errors,
                periodCount: 0
            };
        }

        // Defensive copy of periods
        const periods = response.periods.map(p => ({ ...p }));

        return {
            state: 'valid',
            valid: response.valid,
            source: source,
            sourceLabel: translateSource(source),
            day: expectedDay,
            dayLabel: translateDay(expectedDay),
            periods: periods,
            warnings: warnings,
            errors: errors,
            periodCount: periods.length
        };
    }

    function createScheduleDiagnosticsController(options = {}) {
        const api = options.api;
        const view = options.view;
        const logger = options.logger;
        const endpoint = options.endpoint || '/schedule/normalized';
        const day = options.day || 'weekday';
        const timeoutMs = options.timeoutMs || 5000;

        let currentRequestPromise = null;
        let lastResult = null;
        let hasLoadedFlag = false;
        let inFlight = false;

        const endpointWithQuery = `${endpoint}?day=${encodeURIComponent(day)}`;

        function load() {
            if (currentRequestPromise) {
                return currentRequestPromise;
            }

            if (!api || typeof api.request !== 'function') {
                const errorResult = { status: 'dependency-error', dependency: 'api', message: 'Ders programı tanılama hizmeti başlatılamadı.' };
                lastResult = errorResult;
                hasLoadedFlag = true;
                if (logger && logger.error) logger.error('ADMIN_DIAGNOSTICS', 'api dependency missing or malformed');
                return Promise.resolve(errorResult);
            }

            if (!view || typeof view.renderLoading !== 'function' || typeof view.renderResult !== 'function' || typeof view.renderTransportError !== 'function') {
                const errorResult = { status: 'dependency-error', dependency: 'view', message: 'Ders programı tanılama hizmeti başlatılamadı.' };
                lastResult = errorResult;
                hasLoadedFlag = true;
                if (logger && logger.error) logger.error('ADMIN_DIAGNOSTICS', 'view dependency missing or malformed');
                return Promise.resolve(errorResult);
            }

            inFlight = true;
            try { view.renderLoading(); } catch (e) { }

            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const signal = controller ? controller.signal : undefined;
            
            let timeoutId;
            const requestPromise = new Promise((resolve, reject) => {
                if (controller) {
                    timeoutId = setTimeout(() => {
                        controller.abort();
                    }, timeoutMs);
                }

                api.request(endpointWithQuery, { method: 'GET', signal: signal })
                    .then(resolve)
                    .catch(reject);
            });

            currentRequestPromise = requestPromise
                .then(response => {
                    const viewModel = createScheduleDiagnosticsViewModel(response, day);
                    lastResult = viewModel;
                    hasLoadedFlag = true;
                    try { view.renderResult(viewModel); } catch (e) { }
                    return viewModel;
                })
                .catch(error => {
                    const transportError = { message: 'Ders programı bilgisi alınamadı.', retryable: true };
                    lastResult = transportError;
                    hasLoadedFlag = true;
                    try { view.renderTransportError(transportError); } catch (e) { }
                    if (logger && logger.error) {
                        logger.error('ADMIN_DIAGNOSTICS', 'Schedule request failed', error);
                    }
                    return transportError;
                })
                .finally(() => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    currentRequestPromise = null;
                    inFlight = false;
                });

            return currentRequestPromise;
        }

        return {
            load,
            isLoading: () => inFlight,
            getLastResult: () => {
                if (!lastResult) return null;
                if (lastResult.status === 'dependency-error' || lastResult.retryable) {
                    return { ...lastResult };
                }
                return {
                    ...lastResult,
                    periods: (lastResult.periods || []).map(p => ({ ...p })),
                    warnings: (lastResult.warnings || []).map(w => ({ ...w })),
                    errors: (lastResult.errors || []).map(e => ({ ...e }))
                };
            },
            hasLoaded: () => hasLoadedFlag
        };
    }

    function createDomScheduleDiagnosticsView(document) {
        function getEl(id) {
            return document.getElementById(id);
        }

        function renderLoading() {
            const loadingEl = getEl('sdLoading');
            const errorEl = getEl('sdError');
            const contentEl = getEl('sdContent');
            if (loadingEl) loadingEl.style.display = 'block';
            if (errorEl) errorEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'none';
        }

        function renderTransportError(error) {
            const loadingEl = getEl('sdLoading');
            const errorEl = getEl('sdError');
            const contentEl = getEl('sdContent');
            const errorMsgEl = getEl('sdErrorMessage');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'block';
            if (errorMsgEl) {
                errorMsgEl.textContent = error.message;
            }
        }

        function renderResult(viewModel) {
            const loadingEl = getEl('sdLoading');
            const errorEl = getEl('sdError');
            const contentEl = getEl('sdContent');
            
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';

            const statusEl = getEl('sdStatus');
            const sourceEl = getEl('sdSource');
            const sourceTechEl = getEl('sdSourceTechnical');
            const dayEl = getEl('sdDay');
            const countEl = getEl('sdCount');
            const lastUpdateEl = getEl('sdLastUpdate');
            
            if (statusEl) {
                if (viewModel.state === 'valid') {
                    statusEl.textContent = viewModel.valid ? 'Geçerli' : 'Geçersiz';
                    statusEl.style.color = viewModel.valid ? '#10b981' : '#dc2626';
                } else if (viewModel.state === 'empty') {
                    statusEl.textContent = 'Boş';
                    statusEl.style.color = '#64748b';
                } else if (viewModel.state === 'legacy-incomplete') {
                    statusEl.textContent = 'Geçersiz (Eski)';
                    statusEl.style.color = '#f59e0b';
                } else if (viewModel.state === 'invalid' && viewModel.source === 'database') {
                    statusEl.textContent = 'Geçersiz';
                    statusEl.style.color = '#dc2626';
                } else {
                    statusEl.textContent = 'Tanımsız Hata';
                    statusEl.style.color = '#dc2626';
                }
            }

            if (sourceEl) sourceEl.textContent = viewModel.sourceLabel;
            if (sourceTechEl) sourceTechEl.textContent = viewModel.source;
            if (dayEl) dayEl.textContent = viewModel.dayLabel;
            if (countEl) countEl.textContent = String(viewModel.periodCount);
            
            if (lastUpdateEl) {
                const now = new Date();
                lastUpdateEl.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }

            const warningsListEl = getEl('sdWarningsList');
            const warningsUlEl = getEl('sdWarningsUl');
            if (warningsListEl && warningsUlEl) {
                if (viewModel.warnings && viewModel.warnings.length > 0) {
                    warningsListEl.style.display = 'block';
                    warningsUlEl.replaceChildren();
                    viewModel.warnings.forEach(w => {
                        const li = document.createElement('li');
                        li.textContent = w.message;
                        const codeSpan = document.createElement('span');
                        codeSpan.textContent = ` (${w.code})`;
                        codeSpan.style.fontFamily = 'monospace';
                        codeSpan.style.fontSize = '0.8rem';
                        codeSpan.style.opacity = '0.7';
                        li.appendChild(codeSpan);
                        warningsUlEl.appendChild(li);
                    });
                } else {
                    warningsListEl.style.display = 'none';
                }
            }

            const errorsListEl = getEl('sdErrorsList');
            const errorsUlEl = getEl('sdErrorsUl');
            if (errorsListEl && errorsUlEl) {
                if (viewModel.errors && viewModel.errors.length > 0) {
                    errorsListEl.style.display = 'block';
                    errorsUlEl.replaceChildren();
                    viewModel.errors.forEach(e => {
                        const li = document.createElement('li');
                        li.textContent = e.message;
                        const codeSpan = document.createElement('span');
                        codeSpan.textContent = ` (${e.code})`;
                        codeSpan.style.fontFamily = 'monospace';
                        codeSpan.style.fontSize = '0.8rem';
                        codeSpan.style.opacity = '0.7';
                        li.appendChild(codeSpan);
                        errorsUlEl.appendChild(li);
                    });
                } else {
                    errorsListEl.style.display = 'none';
                }
            }

            const tbody = getEl('sdPeriodsTableBody');
            if (tbody) {
                tbody.replaceChildren();
                
                if (viewModel.periods.length === 0) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 6;
                    td.textContent = 'Gösterilecek dönem yok.';
                    td.style.padding = '15px';
                    td.style.textAlign = 'center';
                    td.style.color = '#64748b';
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                } else {
                    viewModel.periods.forEach((p, idx) => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid #e2e8f0';
                        
                        const tdIdx = document.createElement('td');
                        tdIdx.style.padding = '12px 15px';
                        tdIdx.textContent = String(idx + 1);
                        tr.appendChild(tdIdx);

                        const tdType = document.createElement('td');
                        tdType.style.padding = '12px 15px';
                        tdType.textContent = translateType(p.type);
                        tr.appendChild(tdType);

                        const tdName = document.createElement('td');
                        tdName.style.padding = '12px 15px';
                        tdName.textContent = p.name || '—';
                        tr.appendChild(tdName);

                        const tdStart = document.createElement('td');
                        tdStart.style.padding = '12px 15px';
                        tdStart.textContent = p.start || '—';
                        tr.appendChild(tdStart);

                        const tdEnd = document.createElement('td');
                        tdEnd.style.padding = '12px 15px';
                        tdEnd.textContent = p.end || '—';
                        tr.appendChild(tdEnd);

                        const tdDur = document.createElement('td');
                        tdDur.style.padding = '12px 15px';
                        if (typeof p.duration === 'number' && !isNaN(p.duration)) {
                            tdDur.textContent = p.duration + ' dk';
                        } else {
                            tdDur.textContent = '—';
                        }
                        tr.appendChild(tdDur);

                        tbody.appendChild(tr);
                    });
                }
            }
        }

        return {
            renderLoading,
            renderTransportError,
            renderResult
        };
    }

    return {
        createScheduleDiagnosticsViewModel,
        createScheduleDiagnosticsController,
        createDomScheduleDiagnosticsView,
        translateDiagnosticCode,
        translatePeriodType: translateType,
        translateSource,
        translateDay
    };

})));
