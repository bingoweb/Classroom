(function() {
    // Only initialize if query param matches
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gelistirme') !== '1') {
        return; // Normal mode, completely hidden
    }

    // Load CSS safely
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/dev-time-simulator.css';
    document.head.appendChild(link);

    // Create DOM safely
    const container = document.createElement('div');
    container.id = 'dev-time-simulator';
    container.setAttribute('aria-label', 'Zaman Simülatörü');
    container.innerHTML = `
        <header>
            <h4>Zaman Simülatörü</h4>
            <button class="toggle-btn" aria-label="Paneli Daralt">Paneli Daralt</button>
        </header>
        <div class="badge real-time" id="sim-badge">GERÇEK ZAMAN</div>
        <div class="buttons-grid">
            <button class="sim-btn real-time-btn" data-preset="real">Gerçek Zaman</button>
            <button class="sim-btn" data-preset="08:30" data-day="1">Ders Öncesi</button>
            <button class="sim-btn" data-preset="09:10" data-day="1">1. Ders</button>
            <button class="sim-btn" data-preset="09:45" data-day="1">Teneffüs</button>
            <button class="sim-btn" data-preset="10:00" data-day="1">2. Ders</button>
            <button class="sim-btn" data-preset="12:30" data-day="1">Öğle Teneffüsü</button>
            <button class="sim-btn" data-preset="14:00" data-day="1">Son Ders</button>
            <button class="sim-btn" data-preset="15:00" data-day="1">Okul Çıkışı</button>
            <button class="sim-btn" data-preset="10:00" data-day="6">Hafta Sonu</button>
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

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            if (preset === 'real') {
                if (window.TimeProvider) window.TimeProvider.clearSimulation();
            } else {
                const day = btn.getAttribute('data-day');
                // Calculate correct date (1=Monday=01, 6=Saturday=06). 2024-01-01 was a Monday.
                const dateStr = `2024-01-0${day}T${preset}:00`;
                const dateObj = new Date(dateStr);
                if (window.TimeProvider) window.TimeProvider.setSimulatedDate(dateObj);
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

    // Initial state
    if (window.TimeProvider && window.TimeProvider.isSimulating()) {
        updateBadge();
    }
})();
