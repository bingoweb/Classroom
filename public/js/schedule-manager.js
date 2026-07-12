/**
 * Gelişmiş Ders Saatleri Yönetim Modülü
 * Hafta içi/hafta sonu tespiti, ders başlamadan önce countdown,
 * ders saatleri içinde teneffüs countdown, okul sonrası goodbye mode
 */

// Ders programı (Pazartesi-Cuma)
const SCHOOL_SCHEDULE = {
    // Dersler ve teneffüsler
    periods: [
        { start: '09:00', end: '09:40', type: 'class', name: '1. Ders' },
        { start: '09:40', end: '09:55', type: 'break', name: '1. Teneffüs', duration: 15 },
        { start: '09:55', end: '10:35', type: 'class', name: '2. Ders' },
        { start: '10:35', end: '10:50', type: 'break', name: '2. Teneffüs', duration: 15 },
        { start: '10:50', end: '11:30', type: 'class', name: '3. Ders (Beslenme)' },
        { start: '11:30', end: '11:40', type: 'break', name: '3. Teneffüs', duration: 10 },
        { start: '11:40', end: '12:20', type: 'class', name: '4. Ders' },
        { start: '12:20', end: '13:00', type: 'break', name: 'Öğle Teneffüsü', duration: 40 },
        { start: '13:00', end: '13:40', type: 'class', name: '5. Ders' },
        { start: '13:40', end: '13:50', type: 'break', name: 'Son Teneffüs', duration: 10 },
        { start: '13:50', end: '14:30', type: 'class', name: 'Son Ders' }
    ],
    schoolStart: '09:00',
    schoolEnd: '14:30'
};

function clonePeriod(period) {
    return { ...period };
}

function cloneSchedule(schedule) {
    return {
        periods: schedule.periods.map(clonePeriod),
        schoolStart: schedule.schoolStart,
        schoolEnd: schedule.schoolEnd
    };
}

let activeExternalSchedule = null;

function getInternalActiveSchedule() {
    return activeExternalSchedule || SCHOOL_SCHEDULE;
}

function getActiveSchedule() {
    return cloneSchedule(getInternalActiveSchedule());
}

function getScheduleSource() {
    return activeExternalSchedule ? 'external' : 'fallback';
}

function clearExternalSchedule() {
    activeExternalSchedule = null;
    return {
        source: 'fallback',
        fallbackActive: true,
        schedule: cloneSchedule(SCHOOL_SCHEDULE)
    };
}

function rejectExternalSchedule(reason, warnings = [], errors = []) {
    activeExternalSchedule = null;
    return {
        accepted: false,
        fallbackActive: true,
        source: 'fallback',
        reason,
        warnings: warnings.map(item => ({ ...item })),
        errors: errors.map(item => ({ ...item })),
        schedule: cloneSchedule(SCHOOL_SCHEDULE)
    };
}

function isNormalizerResult(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        typeof value.valid === 'boolean' &&
        Array.isArray(value.periods) &&
        Array.isArray(value.warnings) &&
        Array.isArray(value.errors)
    );
}

function setExternalSchedule(rows) {
    let result;
    try {
        const Normalizer = typeof window !== 'undefined' ? window.ScheduleNormalizer : require('./schedule-normalizer.js');
        if (!Normalizer || !Normalizer.normalizeSchedule) {
            return rejectExternalSchedule('Normalizer missing');
        }
        result = Normalizer.normalizeSchedule(rows);
    } catch (e) {
        return rejectExternalSchedule('SCHEDULE_VALIDATION_EXCEPTION', [], [{ code: 'SCHEDULE_VALIDATION_EXCEPTION', message: e.message }]);
    }

    if (!isNormalizerResult(result)) {
        return rejectExternalSchedule('INVALID_NORMALIZER_RESULT');
    }

    if (!result.valid || result.periods.length === 0) {
        return rejectExternalSchedule('Invalid schedule', result.warnings, result.errors);
    }

    const hasLesson = result.periods.some(p => p.type === 'class');
    if (!hasLesson) {
        return rejectExternalSchedule('No lessons found', result.warnings, result.errors);
    }

    for (let i = 0; i < result.periods.length - 1; i++) {
        const current = result.periods[i];
        const next = result.periods[i + 1];
        if (current.end !== next.start) {
            const integrationErrors = [
                ...(Array.isArray(result.errors) ? result.errors : []),
                {
                    code: 'SCHEDULE_GAP',
                    message: `Gap detected between ${current.end} and ${next.start}.`
                }
            ];
            return rejectExternalSchedule('SCHEDULE_GAP', result.warnings, integrationErrors);
        }
    }

    const newSchedule = {
        periods: result.periods.map(clonePeriod),
        schoolStart: result.periods[0].start,
        schoolEnd: result.periods[result.periods.length - 1].end
    };

    activeExternalSchedule = newSchedule;

    return {
        accepted: true,
        fallbackActive: false,
        source: 'external',
        reason: null,
        warnings: result.warnings.map(item => ({ ...item })),
        errors: result.errors.map(item => ({ ...item })),
        schedule: cloneSchedule(newSchedule)
    };
}

/**
 * Saati dakikaya çevir (örn: '09:00' -> 540)
 */
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Dakikayı saat formatına çevir (örn: 540 -> '09:00')
 */
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Hafta içi mi kontrolü (Pazartesi=1, Cuma=5)
 */
function isWeekday(dayIndex) {
    return dayIndex >= 1 && dayIndex <= 5;
}

/**
 * Hafta sonu mu kontrolü (Cumartesi=6, Pazar=0)
 */
function isWeekend(dayIndex) {
    return dayIndex === 0 || dayIndex === 6;
}

/**
 * İleriye dönük geçerli bir periyodu bul (type veya name kontrolü yaparak null değerleri atlar)
 */
function findNextPeriod(periods, currentIndex) {
    return periods.slice(currentIndex + 1).find(p => p && p.type && p.name) || null;
}

/**
 * İleriye dönük belirli bir tipe sahip periyodu bul
 */
function findNextPeriodByType(periods, currentIndex, type) {
    return periods.slice(currentIndex + 1).find(p => p && p.type === type && p.name) || null;
}

/**
 * Mevcut zamanın durumunu belirle
 * @param {Date} now - Şu anki zaman
 * @returns {Object} - { mode, message, countdown, progress, visual }
 */
function getScheduleStatus(now) {
    const dayIndex = now.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;

    const activeSchedule = getInternalActiveSchedule();

    const schoolStartMinutes = timeToMinutes(activeSchedule.schoolStart);
    const schoolEndMinutes = timeToMinutes(activeSchedule.schoolEnd);

    // Hafta sonu kontrolü
    if (isWeekend(dayIndex)) {
        const weekendMessages = {
            0: { // Pazar
                iconChar: '🌅',
                iconId: 'icon-sun',
                title: 'Yarın Yeni Bir Hafta Başlıyor!',
                subtitle: 'İyi dinlenin, yarın görüşürüz!'
            },
            6: { // Cumartesi
                iconChar: '🏖️',
                iconId: 'icon-sun',
                title: 'İyi Hafta Sonları!',
                subtitle: 'Tatilinizin tadını çıkarın!'
            }
        };

        const message = weekendMessages[dayIndex] || weekendMessages[6];
        return {
            mode: 'weekend',
            message: message.title,
            subtitle: message.subtitle,
            icon: message.iconChar,
            iconId: message.iconId,
            countdown: null,
            progress: 0,
            visual: 'weekend'
        };
    }

    // Ders başlamadan önce (09:00'dan önce)
    if (currentTime < schoolStartMinutes) {
        const minutesUntilStart = schoolStartMinutes - currentTime;
        const hours = Math.floor(minutesUntilStart / 60);
        const mins = minutesUntilStart % 60;

        return {
            mode: 'before-school',
            message: 'Ders Başlamasına Kalan Süre',
            subtitle: `${activeSchedule.schoolStart} - Ders Başlıyor`,
            countdown: `${hours}:${String(mins).padStart(2, '0')}`,
            progress: 0,
            visual: 'clock',
            hoursUntilStart: hours,
            minutesUntilStart: mins,
            iconId: 'icon-school'
        };
    }

    // Okul bittikten sonra (14:30'dan sonra)
    if (currentTime >= schoolEndMinutes) {
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayThemes = {
            1: { icon: '🌅', iconId: 'icon-home', subtitle: 'Harika bir hafta geçirdin!' },
            2: { icon: '🌙', iconId: 'icon-home', subtitle: 'İyi dinlenin, yarın görüşürüz!' },
            3: { icon: '🌸', iconId: 'icon-home', subtitle: 'Haftanın yarısını geçtik!' },
            4: { icon: '🦊', iconId: 'icon-home', subtitle: 'Yarın Cuma, biraz daha sabır!' },
            5: { icon: '🎉', iconId: 'icon-sun', subtitle: 'Harika bir hafta sonu geçirin!' }
        };

        const theme = dayThemes[dayIndex] || dayThemes[1];
        return {
            mode: 'after-school',
            message: 'Yarın Görüşürüz',
            subtitle: theme.subtitle,
            icon: theme.icon,
            iconId: theme.iconId,
            countdown: null,
            progress: 100,
            visual: 'goodbye',
            dayName: dayNames[dayIndex]
        };
    }

    // Ders saatleri içinde - teneffüs countdown hesapla
    let currentPeriod = null;
    let nextBreak = null;
    let periodProgress = 0;

    let nextEventNameStr = null;
    let nextLessonNameStr = null;

    for (let i = 0; i < activeSchedule.periods.length; i++) {
        const period = activeSchedule.periods[i];
        if (!period || !period.type || !period.name) continue;

        const periodStart = timeToMinutes(period.start);
        const periodEnd = timeToMinutes(period.end);

        // Şu anki dönem içindeyiz
        if (currentTime >= periodStart && currentTime < periodEnd) {
            currentPeriod = period;

            const nextPeriod = findNextPeriod(activeSchedule.periods, i);
            const nextClassPeriod = findNextPeriodByType(activeSchedule.periods, i, 'class');

            nextEventNameStr = nextPeriod ? nextPeriod.name : 'Okul Sonu';
            nextLessonNameStr = nextClassPeriod ? nextClassPeriod.name : null;

            if (period.type === 'class') {
                // Bu dersin bitiş zamanı = sonraki etkinliğin başlangıcı
                nextBreak = {
                    time: periodEnd,
                    name: nextEventNameStr,
                    duration: nextPeriod && nextPeriod.duration ? nextPeriod.duration : 0
                };

                // Progress hesapla
                const periodDuration = periodEnd - periodStart;
                const elapsed = currentTime - periodStart;
                periodProgress = Math.min(100, Math.max(0, (elapsed / periodDuration) * 100));
            } else {
                // Teneffüsteyiz
                if (nextPeriod) {
                    nextBreak = {
                        time: periodEnd,
                        name: nextPeriod.name,
                        duration: 0
                    };
                }
                periodProgress = 0;
            }
            break;
        }
    }

    // Eğer hiçbir dönem içinde değilsek (bu durumda bir hata var)
    if (!currentPeriod) {
        return {
            mode: 'error',
            message: 'Program hatası',
            subtitle: 'Lütfen yöneticiye bildirin',
            countdown: '--:--',
            progress: 0,
            visual: 'error'
        };
    }

    // Countdown hesapla
    let countdownText = '--:--';
    if (nextBreak) {
        const minutesUntilBreak = nextBreak.time - currentTime;
        if (minutesUntilBreak > 0) {
            const hours = Math.floor(minutesUntilBreak / 60);
            const mins = minutesUntilBreak % 60;
            countdownText = hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}` : `${mins}:00`;
        } else {
            countdownText = '0:00';
        }
    }

    return {
        mode: currentPeriod.type === 'class' ? 'in-class' : 'in-break',
        message: currentPeriod.type === 'class' ? 'Teneffüse Kalan Zaman' : 'Derse Kalan Zaman',
        subtitle: currentPeriod.name,
        countdown: countdownText,
        progress: periodProgress,
        visual: currentPeriod.type === 'class' ? 'countdown' : 'break',
        currentPeriod: currentPeriod.name,
        nextEvent: nextBreak ? nextBreak.name : 'Okul Sonu',
        currentPeriodName: currentPeriod.name,
        currentPeriodType: currentPeriod.type,
        nextEventName: nextEventNameStr,
        nextLessonName: nextLessonNameStr
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ScheduleManager = {
        getScheduleStatus,
        isWeekday,
        isWeekend,
        SCHOOL_SCHEDULE,
        setExternalSchedule,
        clearExternalSchedule,
        getActiveSchedule,
        getScheduleSource
    };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getScheduleStatus,
        isWeekday,
        isWeekend,
        SCHOOL_SCHEDULE,
        setExternalSchedule,
        clearExternalSchedule,
        getActiveSchedule,
        getScheduleSource
    };
}





