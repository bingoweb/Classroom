(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DashboardScheduleLoader = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function classifyNormalizedScheduleResponse(response, expectedDay = 'weekday') {
        if (!response || typeof response !== 'object' || Array.isArray(response)) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: [], errors: [], reason: 'INVALID_RESPONSE' };
        }
        
        const warningsCopy = Array.isArray(response.warnings) ? [...response.warnings] : [];
        const errorsCopy = Array.isArray(response.errors) ? [...response.errors] : [];

        if (!response.day || response.day !== expectedDay) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'DAY_MISMATCH' };
        }

        if (!response.source) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'UNKNOWN_SOURCE' };
        }

        if (response.source === 'legacy-incomplete') {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'LEGACY_INCOMPLETE_SOURCE' };
        }

        if (response.source !== 'database') {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'NON_DATABASE_SOURCE' };
        }

        if (response.valid !== true) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'BACKEND_MARKED_INVALID' };
        }

        if (!response.periods || !Array.isArray(response.periods)) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'NON_ARRAY_PERIODS' };
        }

        if (response.periods.length === 0) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'EMPTY_PERIODS' };
        }

        if (!Array.isArray(response.warnings)) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: [], errors: errorsCopy, reason: 'MISSING_WARNINGS' };
        }

        if (!Array.isArray(response.errors)) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: [], reason: 'MISSING_ERRORS' };
        }

        if (response.errors.length > 0) {
            return { accepted: false, kind: 'unsafe-response', periods: [], warnings: warningsCopy, errors: errorsCopy, reason: 'BACKEND_ERRORS_PRESENT' };
        }

        // Defensive copy of periods
        const defensivePeriods = JSON.parse(JSON.stringify(response.periods));

        return {
            accepted: true,
            kind: 'valid-database-schedule',
            periods: defensivePeriods,
            warnings: warningsCopy,
            reason: null
        };
    }

    function createDashboardScheduleLoader(options = {}) {
        const {
            api,
            scheduleManager,
            logger,
            endpoint = '/schedule/normalized',
            day = 'weekday',
            timeoutMs = 4000,
            onScheduleChanged
        } = options;

        let inFlightPromise = null;
        let lastResult = null;
        
        function logOnce(level, message, obj = null) {
            if (logger && typeof logger[level] === 'function') {
                logger[level]('DashboardScheduleLoader', message, null, obj);
            }
        }

        function checkDependencies() {
            if (!api || typeof api.request !== 'function') {
                return { status: 'dependency-error', error: 'Missing or malformed api dependency' };
            }
            if (!scheduleManager || 
                typeof scheduleManager.getScheduleSource !== 'function' ||
                typeof scheduleManager.getActiveSchedule !== 'function' ||
                typeof scheduleManager.setExternalSchedule !== 'function' ||
                typeof scheduleManager.clearExternalSchedule !== 'function') {
                return { status: 'dependency-error', error: 'Missing or malformed scheduleManager dependency' };
            }
            return null;
        }

        async function performLoad() {
            const depError = checkDependencies();
            if (depError) {
                logOnce('error', depError.error);
                lastResult = depError;
                return depError;
            }

            const initialSource = scheduleManager.getScheduleSource();
            const initialActive = JSON.stringify(scheduleManager.getActiveSchedule());
            const endpointWithQuery = `${endpoint}?day=${encodeURIComponent(day)}`;

            let response;
            try {
                // Using API service
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const signal = controller ? controller.signal : undefined;
                
                let timeoutId;
                if (controller) {
                    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                }

                const fetchPromise = api.request(endpointWithQuery, { method: 'GET', signal });
                
                if (!controller) {
                    // Safe timeout race if AbortController is not available
                    response = await Promise.race([
                        fetchPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
                    ]);
                } else {
                    response = await fetchPromise;
                    clearTimeout(timeoutId);
                }
            } catch (error) {
                // Transport failure: do not clear, do not throw
                lastResult = {
                    status: 'transport-error',
                    changed: false,
                    source: scheduleManager.getScheduleSource(),
                    error: error.message || String(error)
                };
                logOnce('warn', 'schedule request failed; current schedule preserved', { error: lastResult.error });
                return lastResult;
            }

            const classification = classifyNormalizedScheduleResponse(response, day);

            if (classification.accepted) {
                const activation = scheduleManager.setExternalSchedule(classification.periods);
                if (activation && activation.accepted === true && activation.source === 'external' && activation.fallbackActive === false) {
                    const newSource = scheduleManager.getScheduleSource();
                    const newActive = JSON.stringify(scheduleManager.getActiveSchedule());
                    const changed = initialSource !== 'external' || initialActive !== newActive;
                    
                    lastResult = {
                        status: 'activated',
                        changed: changed,
                        source: 'external',
                        activation: JSON.parse(JSON.stringify(activation))
                    };
                    
                    if (changed) {
                        logOnce('info', 'normalized schedule activated');
                        if (typeof onScheduleChanged === 'function') {
                            onScheduleChanged(JSON.parse(JSON.stringify(lastResult)));
                        }
                    }
                    return lastResult;
                } else {
                    // ScheduleManager rejected it
                    scheduleManager.clearExternalSchedule();
                    const newSource = scheduleManager.getScheduleSource();
                    const changed = initialSource !== 'fallback';
                    lastResult = {
                        status: 'fallback',
                        changed: changed,
                        source: 'fallback',
                        reason: 'MANAGER_REJECTION'
                    };
                    if (changed) {
                        logOnce('warn', 'external schedule rejected by ScheduleManager');
                        if (typeof onScheduleChanged === 'function') {
                            onScheduleChanged(JSON.parse(JSON.stringify(lastResult)));
                        }
                    }
                    return lastResult;
                }
            } else {
                // Safe HTTP 200 but unusable backend state
                scheduleManager.clearExternalSchedule();
                const newSource = scheduleManager.getScheduleSource();
                const changed = initialSource !== 'fallback';
                lastResult = {
                    status: 'fallback',
                    changed: changed,
                    source: 'fallback',
                    reason: classification.reason
                };
                if (changed) {
                    logOnce('info', 'backend schedule unavailable or incomplete; fallback active', { reason: classification.reason });
                    if (typeof onScheduleChanged === 'function') {
                        onScheduleChanged(JSON.parse(JSON.stringify(lastResult)));
                    }
                }
                return lastResult;
            }
        }

        return {
            load: function() {
                if (inFlightPromise) {
                    return inFlightPromise;
                }
                inFlightPromise = performLoad().finally(() => {
                    inFlightPromise = null;
                });
                return inFlightPromise;
            },
            getLastResult: function() {
                return lastResult ? JSON.parse(JSON.stringify(lastResult)) : null;
            },
            isLoading: function() {
                return inFlightPromise !== null;
            }
        };
    }

    return {
        classifyNormalizedScheduleResponse,
        createDashboardScheduleLoader
    };
}));
