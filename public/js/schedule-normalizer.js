const ScheduleNormalizer = (function() {

    function isPlainObject(val) {
        return Object.prototype.toString.call(val) === '[object Object]';
    }

    function timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function normalizeName(row) {
        for (const field of ['name', 'course']) {
            if (typeof row[field] === 'string') {
                const val = row[field].trim();
                if (val.length > 0) return val;
            }
        }
        return null;
    }

    function normalizeType(row) {
        for (const field of ['type', 'period_type']) {
            if (typeof row[field] === 'string') {
                const val = row[field].trim().toLowerCase();
                if (['class', 'lesson', 'ders'].includes(val)) return 'class';
                if (['break', 'recess', 'teneffüs', 'teneffus', 'ara'].includes(val)) return 'break';
            }
        }
        return null;
    }

    function normalizeTime(row, fields) {
        for (const field of fields) {
            if (typeof row[field] === 'string') {
                const val = row[field].trim();
                if (/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(val)) return val;
            }
        }
        return null;
    }

    function createIssue(code, message, index = null, field = null) {
        const issue = { code, message };
        if (index !== null) issue.index = index;
        if (field !== null) issue.field = field;
        return issue;
    }

    function normalizeSchedule(rows) {
        const result = {
            periods: [],
            warnings: [],
            errors: [],
            valid: false
        };

        if (!Array.isArray(rows)) {
            result.errors.push(createIssue('INPUT_NOT_ARRAY', 'Input must be an array of schedule rows.'));
            return result;
        }

        if (rows.length === 0) {
            result.errors.push(createIssue('EMPTY_SCHEDULE', 'Schedule array is empty.'));
            return result;
        }

        const validPeriods = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!isPlainObject(row)) {
                result.warnings.push(createIssue('INVALID_ROW', `Row at index ${i} is not a plain object.`, i));
                continue;
            }

            const name = normalizeName(row);
            if (!name) {
                result.warnings.push(createIssue('MISSING_NAME', `Row at index ${i} has no usable name.`, i, 'name'));
                continue;
            }

            const type = normalizeType(row);
            if (!type) {
                result.warnings.push(createIssue('UNKNOWN_TYPE', `Row at index ${i} has an unknown or missing type.`, i, 'type'));
                continue;
            }

            const start = normalizeTime(row, ['start', 'start_time']);
            if (!start) {
                result.warnings.push(createIssue('INVALID_START_TIME', `Row at index ${i} has an invalid or missing start time.`, i, 'start'));
                continue;
            }

            const end = normalizeTime(row, ['end', 'end_time']);
            if (!end) {
                result.warnings.push(createIssue('INVALID_END_TIME', `Row at index ${i} has an invalid or missing end time.`, i, 'end'));
                continue;
            }

            const startMin = timeToMinutes(start);
            const endMin = timeToMinutes(end);
            const duration = endMin - startMin;

            if (duration === 0) {
                result.warnings.push(createIssue('ZERO_DURATION', `Row at index ${i} has zero duration.`, i));
                continue;
            }

            if (duration < 0) {
                result.warnings.push(createIssue('END_BEFORE_START', `Row at index ${i} ends before it starts.`, i));
                continue;
            }

            validPeriods.push({
                name,
                type,
                start,
                end,
                duration,
                _sourceIndex: i
            });
        }

        if (validPeriods.length === 0) {
            result.errors.push(createIssue('NO_VALID_PERIODS', 'No valid periods could be extracted from the input array.'));
            return result;
        }

        // Sort by start, then end, then source index
        validPeriods.sort((a, b) => {
            const startDiff = timeToMinutes(a.start) - timeToMinutes(b.start);
            if (startDiff !== 0) return startDiff;
            const endDiff = timeToMinutes(a.end) - timeToMinutes(b.end);
            if (endDiff !== 0) return endDiff;
            return a._sourceIndex - b._sourceIndex;
        });

        // Deduplicate exact matches and detect overlaps
        const finalPeriods = [];
        let overlapFound = false;

        for (let i = 0; i < validPeriods.length; i++) {
            const current = validPeriods[i];
            
            // Check against all accepted so far
            let isExactDuplicate = false;
            let overlaps = false;
            let overlappingIndex = -1;

            for (let j = 0; j < finalPeriods.length; j++) {
                const accepted = finalPeriods[j];
                
                // Exact match check
                if (current.name === accepted.name &&
                    current.type === accepted.type &&
                    current.start === accepted.start &&
                    current.end === accepted.end) {
                    isExactDuplicate = true;
                    break;
                }

                // Overlap check
                // Two periods overlap if one starts strictly before the other ends, and ends strictly after the other starts.
                // Since they are sorted by start time, current.start >= accepted.start
                const currentStartMin = timeToMinutes(current.start);
                const currentEndMin = timeToMinutes(current.end);
                const acceptedStartMin = timeToMinutes(accepted.start);
                const acceptedEndMin = timeToMinutes(accepted.end);
                
                if (currentStartMin < acceptedEndMin && currentEndMin > acceptedStartMin) {
                    overlaps = true;
                    overlappingIndex = accepted._sourceIndex;
                    break;
                }
            }

            if (isExactDuplicate) {
                result.warnings.push(createIssue('DUPLICATE_PERIOD', `Exact duplicate of period found at source index ${current._sourceIndex}. Kept the first occurrence.`, current._sourceIndex));
                continue;
            }

            if (overlaps) {
                result.errors.push(createIssue('OVERLAP', `Period at source index ${current._sourceIndex} overlaps with another period at source index ${overlappingIndex}.`, current._sourceIndex));
                overlapFound = true;
                finalPeriods.push(current); // Keep for diagnostics
                continue;
            }

            finalPeriods.push(current);
        }

        result.periods = finalPeriods.map(p => {
            const copy = { ...p };
            delete copy._sourceIndex;
            return copy;
        });

        if (!overlapFound) {
            result.valid = true;
        }

        return result;
    }

    return {
        normalizeSchedule
    };
})();

if (typeof window !== 'undefined') {
    window.ScheduleNormalizer = ScheduleNormalizer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleNormalizer;
}
