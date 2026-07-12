const ScheduleNormalizer = require('../public/js/schedule-normalizer.js');

function validateNormalizedSchedule(rows) {
    if (!Array.isArray(rows)) {
        return { valid: false, errors: [{ code: 'INVALID_INPUT', message: 'Geçersiz veri biçimi.' }], warnings: [], periods: [] };
    }

    const rowsCopy = JSON.parse(JSON.stringify(rows));
    
    let normalizerResult;
    try {
        normalizerResult = ScheduleNormalizer.normalizeSchedule(rowsCopy);
    } catch (e) {
        return { valid: false, errors: [{ code: 'NORMALIZER_ERROR', message: 'Zaman çizelgesi doğrulanırken hata oluştu.' }], warnings: [], periods: [] };
    }

    if (!normalizerResult || typeof normalizerResult !== 'object' || !Array.isArray(normalizerResult.periods)) {
        return { valid: false, errors: [{ code: 'NORMALIZER_ERROR', message: 'Zaman çizelgesi doğrulanırken hata oluştu.' }], warnings: [], periods: [] };
    }

    const result = {
        valid: false,
        periods: JSON.parse(JSON.stringify(normalizerResult.periods)),
        warnings: JSON.parse(JSON.stringify(normalizerResult.warnings || [])),
        errors: JSON.parse(JSON.stringify(normalizerResult.errors || []))
    };

    const fatalWarnings = [
        'INVALID_ROW', 'MISSING_NAME', 'UNKNOWN_TYPE', 
        'INVALID_START_TIME', 'INVALID_END_TIME', 'ZERO_DURATION', 'END_BEFORE_START'
    ];
    
    let hasFatalWarning = false;
    for (const w of result.warnings) {
        if (fatalWarnings.includes(w.code)) {
            hasFatalWarning = true;
            break;
        }
    }

    if (hasFatalWarning) {
        result.errors.push({ code: 'PARTIAL_SCHEDULE_REJECTED', message: 'Eksik veya hatalı satırlar tespit edildiği için kayıt reddedildi.' });
        return result;
    }

    if (!normalizerResult.valid || result.errors.length > 0) {
        return result;
    }

    if (result.periods.length === 0) {
        result.errors.push({ code: 'EMPTY_SCHEDULE', message: 'Geçerli ders saati veya teneffüs bulunamadı.' });
        return result;
    }

    let classCount = 0;
    for (let i = 0; i < result.periods.length; i++) {
        const p = result.periods[i];
        if (p.type === 'class') classCount++;
        
        const [sh, sm] = p.start.split(':').map(Number);
        const [eh, em] = p.end.split(':').map(Number);
        p.duration = (eh * 60 + em) - (sh * 60 + sm);

        if (i > 0) {
            const prev = result.periods[i - 1];
            if (prev.end !== p.start) {
                result.errors.push({ code: 'SCHEDULE_GAP', message: 'Ders programında tanımlanmamış bir zaman boşluğu bulunuyor.' });
                return result;
            }
        }
    }

    if (classCount === 0) {
        result.errors.push({ code: 'NO_CLASS', message: 'Programda en az bir ders bulunmalıdır.' });
        return result;
    }

    if (result.errors.length === 0) {
        result.valid = true;
    }

    return result;
}

function isValidDayKey(day) {
    if (typeof day !== 'string') return false;
    const trimmed = day.trim();
    if (trimmed.length < 1 || trimmed.length > 32) return false;
    return /^[\p{L}\p{N}_-]{1,32}$/u.test(trimmed);
}

module.exports = {
    validateNormalizedSchedule,
    isValidDayKey
};
