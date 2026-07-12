(function(factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        api.init(window, document);
    }
})(function() {
    // Pure helpers
    function timeToMinutes(str) {
        if (!str || typeof str !== 'string') return null;
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(str)) return null;
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    }

    function createLocalDate(dayIndex, hours, minutes) {
        // Use Tuesday Jan 2, 2024 for weekdays, Jan 6, 2024 for weekends
        const dateDay = (dayIndex === 6) ? 6 : 2; 
        
        // Handle negative hours (midnight crossing for before-school) safely 
        // e.g. -30 mins -> h=-1, m=30. Date constructor handles it correctly.
        return new Date(2024, 0, dateDay, hours, minutes, 0, 0);
    }

    function resolveSemanticPresetDate(preset, schedule) {
        if (preset === 'weekend') {
            return createLocalDate(6, 10, 0);
        }

        if (!schedule || !Array.isArray(schedule.periods)) return null;
        if (!schedule.schoolStart || !schedule.schoolEnd) return null;

        const periods = schedule.periods;

        if (preset === 'before-school') {
            const startMins = timeToMinutes(schedule.schoolStart);
            if (startMins === null) return null;
            const target = startMins - 30;
            return createLocalDate(2, 0, target);
        }

        if (preset === 'after-school') {
            const endMins = timeToMinutes(schedule.schoolEnd);
            if (endMins === null) return null;
            const target = endMins + 30;
            return createLocalDate(2, 0, target);
        }

        const classes = periods.filter(p => p && typeof p === 'object' && p.type === 'class');
        const breaks = periods.filter(p => p && typeof p === 'object' && p.type === 'break');

        let targetPeriod = null;

        if (preset === 'first-class') {
            targetPeriod = classes[0];
        } else if (preset === 'second-class') {
            targetPeriod = classes[1];
        } else if (preset === 'last-class') {
            targetPeriod = classes[classes.length - 1];
        } else if (preset === 'first-break') {
            targetPeriod = breaks[0];
        } else if (preset === 'longest-break') {
            if (breaks.length === 0) return null;
            let maxDuration = -1;
            let longest = null;
            for (let i = 0; i < breaks.length; i++) {
                const b = breaks[i];
                const s = timeToMinutes(b.start);
                const e = timeToMinutes(b.end);
                if (s === null || e === null) continue;
                const dur = e - s;
                if (dur > maxDuration) {
                    maxDuration = dur;
                    longest = b;
                }
            }
            targetPeriod = longest;
        } else {
            return null; // Unknown preset
        }

        if (!targetPeriod) return null;
        const sMins = timeToMinutes(targetPeriod.start);
        const eMins = timeToMinutes(targetPeriod.end);
        if (sMins === null || eMins === null || eMins <= sMins) return null;

        const midpoint = sMins + Math.floor((eMins - sMins) / 2);
        return createLocalDate(2, 0, midpoint);
    }

    function isSemanticPresetAvailable(preset, schedule) {
        if (preset === 'real-time') return true;
        if (preset === 'weekend') return true;
        return resolveSemanticPresetDate(preset, schedule) !== null;
    }

    function init(window, document) {
        if (document.getElementById('dev-time-simulator')) return;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('gelistirme') !== '1') {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/dev-time-simulator.css';
        document.head.appendChild(link);

        const container = document.createElement('div');
        container.id = 'dev-time-simulator';
        container.setAttribute('aria-label', 'Zaman Simülatörü');
        
        // Layout: Keep existing layout and text but use semantic identifiers for data-preset
        container.innerHTML = `
            <header>
                <h4>Zaman Simülatörü</h4>
                <button class="toggle-btn" aria-label="Paneli Daralt">Paneli Daralt</button>
            </header>
            <div class="badge real-time" id="sim-badge">GERÇEK ZAMAN</div>
            <div class="buttons-grid">
                <button class="sim-btn real-time-btn" data-preset="real-time">Gerçek Zaman</button>
                <button class="sim-btn" data-preset="before-school">Ders Öncesi</button>
                <button class="sim-btn" data-preset="first-class">1. Ders</button>
                <button class="sim-btn" data-preset="first-break">Teneffüs</button>
                <button class="sim-btn" data-preset="second-class">2. Ders</button>
                <button class="sim-btn" data-preset="longest-break">Öğle Teneffüsü</button>
                <button class="sim-btn" data-preset="last-class">Son Ders</button>
                <button class="sim-btn" data-preset="after-school">Okul Çıkışı</button>
                <button class="sim-btn" data-preset="weekend">Hafta Sonu</button>
            </div>
            <div class="custom-time">
                <label for="sim-custom-time">Özel Tarih ve Saat</label>
                <input type="datetime-local" id="sim-custom-time">
                <div class="error-msg" id="sim-error">Geçersiz tarih.</div>
                <button class="sim-btn" id="sim-apply-btn">Uygula</button>
            </div>
        `;
        document.body.appendChild(container);

        const toggleBtn = container.querySelector('.toggle-btn');
        const badge = container.querySelector('#sim-badge');
        const buttons = container.querySelectorAll('.buttons-grid .sim-btn');
        const customInput = container.querySelector('#sim-custom-time');
        const applyBtn = container.querySelector('#sim-apply-btn');
        const errorMsg = container.querySelector('#sim-error');

        let collapsed = false;
        toggleBtn.addEventListener('click', () => {
            collapsed = !collapsed;
            if (collapsed) {
                container.classList.add('collapsed');
                toggleBtn.textContent = 'Paneli Aç';
                toggleBtn.setAttribute('aria-label', 'Paneli Aç');
            } else {
                container.classList.remove('collapsed');
                toggleBtn.textContent = 'Paneli Daralt';
                toggleBtn.setAttribute('aria-label', 'Paneli Daralt');
            }
        });

        function updateBadge() {
            if (window.TimeProvider && window.TimeProvider.isSimulating()) {
                const currentObj = window.ScheduleManager ? window.ScheduleManager.getScheduleStatus(window.TimeProvider.now()) : null;
                const simDate = window.TimeProvider.now();
                
                const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                const dayName = days[simDate.getDay()];
                const timeStr = `${String(simDate.getHours()).padStart(2,'0')}:${String(simDate.getMinutes()).padStart(2,'0')}`;
                
                let statusName = "Özel Zaman";
                if (currentObj) {
                    if (currentObj.mode === 'weekend') statusName = 'Hafta Sonu';
                    else if (currentObj.mode === 'before-school') statusName = 'Ders Öncesi';
                    else if (currentObj.mode === 'after-school') statusName = 'Okul Çıkışı';
                    else statusName = currentObj.currentPeriodName || (currentObj.mode === 'in-break' ? 'Teneffüs' : 'Ders');
                }

                badge.textContent = `SİMÜLASYON: ${statusName} — ${dayName} ${timeStr}`;
                badge.className = 'badge';
            } else {
                badge.textContent = 'GERÇEK ZAMAN';
                badge.className = 'badge real-time';
            }
        }

        function refreshButtonAvailability() {
            if (!window.TimeProvider) {
                buttons.forEach(btn => {
                    btn.disabled = true;
                    btn.setAttribute('aria-disabled', 'true');
                    btn.title = 'Zaman sağlayıcısı kullanılamıyor.';
                });
                return;
            }

            const schedule = window.ScheduleManager ? window.ScheduleManager.getActiveSchedule() : null;

            buttons.forEach(btn => {
                const preset = btn.getAttribute('data-preset');
                if (isSemanticPresetAvailable(preset, schedule)) {
                    btn.disabled = false;
                    btn.removeAttribute('aria-disabled');
                    btn.title = '';
                } else {
                    btn.disabled = true;
                    btn.setAttribute('aria-disabled', 'true');
                    btn.title = 'Bu programda uygun dönem bulunmuyor.';
                }
            });
        }

        // Attach interaction events to refresh availability without a global interval/event
        container.addEventListener('pointerover', refreshButtonAvailability);
        container.addEventListener('focusin', refreshButtonAvailability);
        container.addEventListener('keydown', refreshButtonAvailability);

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                errorMsg.style.display = 'none';
                
                const preset = btn.getAttribute('data-preset');
                if (preset === 'real-time') {
                    if (window.TimeProvider) window.TimeProvider.clearSimulation();
                    return;
                }

                if (preset === 'weekend') {
                    if (window.TimeProvider) window.TimeProvider.setSimulatedDate(resolveSemanticPresetDate('weekend', null));
                    return;
                }

                refreshButtonAvailability();

                const schedule = window.ScheduleManager ? window.ScheduleManager.getActiveSchedule() : null;
                const resolved = resolveSemanticPresetDate(preset, schedule);

                if (!resolved) {
                    errorMsg.textContent = 'Bu programda seçilen zaman dilimi bulunmuyor.';
                    errorMsg.style.display = 'block';
                    return;
                }

                if (window.TimeProvider) {
                    window.TimeProvider.setSimulatedDate(resolved);
                }
            });
        });

        applyBtn.addEventListener('click', () => {
            errorMsg.style.display = 'none';
            const val = customInput.value;
            if (!val) {
                errorMsg.textContent = 'Lütfen tarih seçin.';
                errorMsg.style.display = 'block';
                return;
            }
            const dateObj = new Date(val);
            if (isNaN(dateObj.getTime())) {
                errorMsg.textContent = 'Geçersiz tarih formatı.';
                errorMsg.style.display = 'block';
                return;
            }
            if (window.TimeProvider) window.TimeProvider.setSimulatedDate(dateObj);
        });

        window.addEventListener('timeSimulationChanged', updateBadge);

        refreshButtonAvailability();
        if (window.TimeProvider && window.TimeProvider.isSimulating()) {
            updateBadge();
        }
    }

    return {
        resolveSemanticPresetDate,
        isSemanticPresetAvailable,
        init
    };
});
