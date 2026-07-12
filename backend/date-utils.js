const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';

const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TIME_ZONE,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function getIstanbulDateKey(date = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new TypeError('A valid Date instance is required');
    }

    const parts = istanbulDateFormatter.formatToParts(date);
    const values = {};

    for (const part of parts) {
        if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
            values[part.type] = part.value;
        }
    }

    if (!values.year || !values.month || !values.day) {
        throw new Error('Unable to generate Istanbul date key');
    }

    return `${values.year}-${values.month}-${values.day}`;
}

module.exports = {
    ISTANBUL_TIME_ZONE,
    getIstanbulDateKey
};
