// Settings Handler for Admin Panel - DATABASE DRIVEN
// All settings are stored in the database, not localStorage

// Current settings state (will be loaded from database)
let currentSettings = {
    displayMode: 'normal',
    colorTheme: 'light',
    fontSize: '100',
    autoRefreshInterval: '0',
    clockFormat: '24',
    noiseSensitivity: '5',
    warningThreshold: '70',
    dangerThreshold: '85',
    equalizerTheme: 'neon',
    slideshowAutoPlay: 'true',
    slideshowLoop: 'true',
    slideshowProgress: 'true'
};

let isInitialLoad = true;
let toastContainer = null;

// ========== API FUNCTIONS ==========

// Load all settings from database
async function loadSettingsFromDatabase() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/settings`);
        const settings = await res.json();
        console.log('Settings loaded from database:', settings);
        return settings;
    } catch (error) {
        console.error('Error loading settings from database:', error);
        return {};
    }
}

// Save a single setting to database
async function saveSettingToDatabase(key, value) {
    try {
        const res = await fetch(`${CONFIG.API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: String(value) })
        });
        if (!res.ok) throw new Error('Save failed');
        console.log(`Setting saved: ${key} = ${value}`);
        return true;
    } catch (error) {
        console.error('Error saving setting:', error);
        return false;
    }
}

// Save multiple settings to database
async function saveAllSettingsToDatabase(settings) {
    const promises = Object.entries(settings).map(([key, value]) =>
        saveSettingToDatabase(key, value)
    );
    const results = await Promise.all(promises);
    return results.every(r => r === true);
}

// ========== TOAST NOTIFICATIONS ==========

function createToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);

        // Add animation styles
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    return toastContainer;
}

function showToast(message, type = 'info') {
    if (isInitialLoad) return;

    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.style.cssText = `
        min-width: 250px;
        max-width: 400px;
        padding: 15px 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #45a049)' : 'linear-gradient(135deg, #667eea, #764ba2)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-weight: 600;
        font-size: 0.95rem;
        animation: slideInRight 0.3s ease;
        pointer-events: auto;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ========== DISPLAY SETTINGS ==========

window.setDisplayMode = function (mode) {
    currentSettings.displayMode = mode;

    ['normal', 'fullscreen', 'kiosk'].forEach(m => {
        const btn = document.getElementById(`displayMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) {
            if (m === mode) {
                btn.style.border = '2px solid #667eea';
                btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                btn.style.color = 'white';
            } else {
                btn.style.border = '2px solid rgba(0,0,0,0.1)';
                btn.style.background = 'white';
                btn.style.color = '#333';
            }
        }
    });

    // Save to database
    saveSettingToDatabase('displayMode', mode);

    const messages = { normal: '🪟 Normal mod', fullscreen: '⛶ Tam ekran', kiosk: '🏢 Kiosk' };
    showToast(messages[mode] || 'Mod değişti');
};

window.setColorTheme = function (theme) {
    currentSettings.colorTheme = theme;

    ['light', 'dark', 'auto'].forEach(t => {
        const btn = document.getElementById(`theme${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn) {
            if (t === theme) {
                btn.style.border = '2px solid #667eea';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.border = '2px solid rgba(0,0,0,0.1)';
                btn.style.transform = 'scale(1)';
            }
        }
    });

    saveSettingToDatabase('colorTheme', theme);

    const messages = { light: '☀️ Açık tema', dark: '🌙 Koyu tema', auto: '🌗 Otomatik' };
    showToast(messages[theme] || 'Tema değişti');
};

window.updateFontSizeDisplay = function () {
    const slider = document.getElementById('fontSize');
    const display = document.getElementById('fontSizeValue');
    const preview = document.getElementById('fontSizePreview');

    if (slider && display) {
        currentSettings.fontSize = slider.value;
        display.textContent = slider.value + '%';
        if (preview) preview.style.fontSize = (slider.value / 100) + 'rem';

        saveSettingToDatabase('fontSize', slider.value);
        showToast(`🔤 Yazı boyutu: ${slider.value}%`);
    }
};

window.updateRefreshDisplay = function () {
    const slider = document.getElementById('autoRefreshInterval');
    const status = document.getElementById('refreshStatus');

    if (slider && status) {
        const value = slider.value;
        currentSettings.autoRefreshInterval = value;

        if (value === '0') {
            status.innerHTML = '⏸️ Kapalı';
            status.style.color = '#666';
        } else {
            status.innerHTML = `⏱️ ${value} dakikada bir`;
            status.style.color = '#667eea';
        }

        saveSettingToDatabase('autoRefreshInterval', value);
        showToast(value === '0' ? '⏸️ Yenileme kapalı' : `🔄 ${value} dk aralık`);
    }
};

window.updateClockPreview = function () {
    const select = document.getElementById('clockFormat');
    const preview = document.getElementById('clockPreview');

    if (select && preview) {
        currentSettings.clockFormat = select.value;
        const now = new Date();

        if (select.value === '24') {
            preview.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            preview.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
    }
};

window.saveClockFormat = function () {
    const select = document.getElementById('clockFormat');
    if (select) {
        saveSettingToDatabase('clockFormat', select.value);
        showToast(`🕐 Saat formatı: ${select.value === '24' ? '24 saat' : '12 saat'}`);
    }
};

// ========== NOISE METER SETTINGS ==========

const sensitivityDescriptions = {
    1: '🔇 Çok düşük', 2: '📉 Düşük', 3: '📊 Az', 4: '📈 Orta-Az',
    5: '⚖️ Orta', 6: '📈 Orta-Yüksek', 7: '📊 Yüksek',
    8: '🔊 Çok yüksek', 9: '📢 Maksimum', 10: '🎯 Ultra hassas'
};

window.setNoisePreset = function (preset) {
    const presets = {
        quiet: { sensitivity: 8, warning: 60, danger: 75 },
        normal: { sensitivity: 5, warning: 70, danger: 85 },
        active: { sensitivity: 3, warning: 80, danger: 95 }
    };

    const config = presets[preset];
    if (!config) return;

    const sensitivity = document.getElementById('noiseSensitivity');
    const warning = document.getElementById('warningThreshold');
    const danger = document.getElementById('dangerThreshold');

    if (sensitivity) { sensitivity.value = config.sensitivity; updateSensitivityDisplay(); }
    if (warning) { warning.value = config.warning; }
    if (danger) { danger.value = config.danger; }

    updateThresholdDisplay();

    // Save all to database
    saveSettingToDatabase('noiseSensitivity', config.sensitivity);
    saveSettingToDatabase('warning_threshold', config.warning);
    saveSettingToDatabase('danger_threshold', config.danger);

    const messages = { quiet: '😌 Sessiz profil', normal: '😊 Normal profil', active: '🎉 Aktif profil' };
    showToast(messages[preset], 'success');
};

window.updateSensitivityDisplay = function () {
    const slider = document.getElementById('noiseSensitivity');
    const display = document.getElementById('sensitivityValue');
    const desc = document.getElementById('sensitivityDescription');

    if (slider && display) {
        const value = parseInt(slider.value);
        currentSettings.noiseSensitivity = value;
        display.textContent = value;
        if (desc) desc.textContent = sensitivityDescriptions[value] || '';

        saveSettingToDatabase('noiseSensitivity', value);
        showToast(`📊 Hassasiyet: ${value}/10`);
    }
};

window.updateThresholdDisplay = function () {
    const warning = document.getElementById('warningThreshold');
    const danger = document.getElementById('dangerThreshold');

    if (warning && danger) {
        const wVal = parseInt(warning.value);
        const dVal = parseInt(danger.value);

        currentSettings.warningThreshold = wVal;
        currentSettings.dangerThreshold = dVal;

        // Update displays
        const wDisplay = document.getElementById('warningValue');
        const dDisplay = document.getElementById('dangerValue');
        const wLabel = document.getElementById('warningLabel');
        const dLabel = document.getElementById('dangerLabel');

        if (wDisplay) wDisplay.textContent = wVal + '%';
        if (dDisplay) dDisplay.textContent = dVal + '%';
        if (wLabel) wLabel.textContent = wVal + '%';
        if (dLabel) dLabel.textContent = dVal + '%';

        // Update preview bars
        const green = document.getElementById('previewGreen');
        const orange = document.getElementById('previewOrange');
        const red = document.getElementById('previewRed');

        if (green && orange && red) {
            green.style.width = wVal + '%';
            orange.style.width = (dVal - wVal) + '%';
            red.style.width = (100 - dVal) + '%';
        }
    }
};

window.saveThresholds = function () {
    const warning = document.getElementById('warningThreshold');
    const danger = document.getElementById('dangerThreshold');

    if (warning && danger) {
        saveSettingToDatabase('warning_threshold', warning.value);
        saveSettingToDatabase('danger_threshold', danger.value);
        showToast(`⚠️ Eşikler: ${warning.value}% / ${danger.value}%`);
    }
};

window.testNoiseMeter = function () {
    const result = document.getElementById('testResult');
    if (!result) return;

    result.innerHTML = '🎤 Test ediliyor...';
    result.style.color = '#667eea';

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            result.innerHTML = '✅ Mikrofon çalışıyor!';
            result.style.color = '#4caf50';
            showToast('✅ Mikrofon OK', 'success');
            setTimeout(() => stream.getTracks().forEach(t => t.stop()), 2000);
        })
        .catch(() => {
            result.innerHTML = '❌ Mikrofon erişimi yok';
            result.style.color = '#f44336';
        });
};

// ========== SAVE ALL SETTINGS ==========

window.saveAllSettings = async function () {
    const settings = {
        displayMode: currentSettings.displayMode,
        colorTheme: currentSettings.colorTheme,
        fontSize: document.getElementById('fontSize')?.value || '100',
        autoRefreshInterval: document.getElementById('autoRefreshInterval')?.value || '0',
        clockFormat: document.getElementById('clockFormat')?.value || '24',
        noiseSensitivity: document.getElementById('noiseSensitivity')?.value || '5',
        warning_threshold: document.getElementById('warningThreshold')?.value || '70',
        danger_threshold: document.getElementById('dangerThreshold')?.value || '85',
        slideshowAutoPlay: document.getElementById('slideshowAutoPlay')?.checked ? 'true' : 'false',
        slideshowLoop: document.getElementById('slideshowLoop')?.checked ? 'true' : 'false',
        slideshowProgress: document.getElementById('slideshowProgress')?.checked ? 'true' : 'false'
    };

    const success = await saveAllSettingsToDatabase(settings);
    showToast(success ? '💾 Tüm ayarlar kaydedildi!' : '❌ Kayıt hatası', success ? 'success' : 'error');
};

// ========== LOAD AND APPLY SETTINGS ==========

async function applySettingsToUI(settings) {
    // Display Mode
    if (settings.displayMode) {
        currentSettings.displayMode = settings.displayMode;
        ['normal', 'fullscreen', 'kiosk'].forEach(m => {
            const btn = document.getElementById(`displayMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
            if (btn) {
                if (m === settings.displayMode) {
                    btn.style.border = '2px solid #667eea';
                    btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                    btn.style.color = 'white';
                } else {
                    btn.style.border = '2px solid rgba(0,0,0,0.1)';
                    btn.style.background = 'white';
                    btn.style.color = '#333';
                }
            }
        });
    }

    // Color Theme
    if (settings.colorTheme) {
        currentSettings.colorTheme = settings.colorTheme;
        ['light', 'dark', 'auto'].forEach(t => {
            const btn = document.getElementById(`theme${t.charAt(0).toUpperCase() + t.slice(1)}`);
            if (btn) {
                if (t === settings.colorTheme) {
                    btn.style.border = '2px solid #667eea';
                    btn.style.transform = 'scale(1.05)';
                } else {
                    btn.style.border = '2px solid rgba(0,0,0,0.1)';
                    btn.style.transform = 'scale(1)';
                }
            }
        });
    }

    // Font Size
    const fontSize = document.getElementById('fontSize');
    if (fontSize && settings.fontSize) {
        fontSize.value = settings.fontSize;
        const display = document.getElementById('fontSizeValue');
        const preview = document.getElementById('fontSizePreview');
        if (display) display.textContent = settings.fontSize + '%';
        if (preview) preview.style.fontSize = (settings.fontSize / 100) + 'rem';
    }

    // Auto Refresh
    const refresh = document.getElementById('autoRefreshInterval');
    if (refresh && settings.autoRefreshInterval) {
        refresh.value = settings.autoRefreshInterval;
        const status = document.getElementById('refreshStatus');
        if (status) {
            if (settings.autoRefreshInterval === '0') {
                status.innerHTML = '⏸️ Kapalı';
                status.style.color = '#666';
            } else {
                status.innerHTML = `⏱️ ${settings.autoRefreshInterval} dakikada bir`;
                status.style.color = '#667eea';
            }
        }
    }

    // Clock Format
    const clock = document.getElementById('clockFormat');
    if (clock && settings.clockFormat) {
        clock.value = settings.clockFormat;
    }

    // Noise Sensitivity
    const sensitivity = document.getElementById('noiseSensitivity');
    if (sensitivity && settings.noiseSensitivity) {
        sensitivity.value = settings.noiseSensitivity;
        const display = document.getElementById('sensitivityValue');
        const desc = document.getElementById('sensitivityDescription');
        if (display) display.textContent = settings.noiseSensitivity;
        if (desc) desc.textContent = sensitivityDescriptions[parseInt(settings.noiseSensitivity)] || '';
    }

    // Warning/Danger Thresholds
    const warning = document.getElementById('warningThreshold');
    const danger = document.getElementById('dangerThreshold');
    if (warning && settings.warning_threshold) warning.value = settings.warning_threshold;
    if (danger && settings.danger_threshold) danger.value = settings.danger_threshold;

    // Update threshold display
    updateThresholdDisplay();

    // Slideshow settings
    const autoPlay = document.getElementById('slideshowAutoPlay');
    const loop = document.getElementById('slideshowLoop');
    const progress = document.getElementById('slideshowProgress');
    if (autoPlay) autoPlay.checked = settings.slideshowAutoPlay === 'true';
    if (loop) loop.checked = settings.slideshowLoop !== 'false';
    if (progress) progress.checked = settings.slideshowProgress !== 'false';

    // Equalizer Theme Display
    if (settings.equalizer_theme) {
        const display = document.getElementById('currentThemeDisplay');
        if (display) display.textContent = `Seçili Tema: ${settings.equalizer_theme.toUpperCase()}`;
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing settings from database...');

    setTimeout(async () => {
        // Load all settings from database
        const settings = await loadSettingsFromDatabase();

        // Apply to UI
        await applySettingsToUI(settings);

        // Update clock preview
        updateClockPreview();
        setInterval(updateClockPreview, 1000);

        // Enable toasts after load
        setTimeout(() => {
            isInitialLoad = false;
            console.log('Settings loaded, toasts enabled');
        }, 500);
    }, 200);
});
