// Settings Loader for Main Dashboard
// Loads settings from backend and applies them to the UI
// Polls for changes every 30 seconds

class SettingsLoader {
    constructor() {
        this.settings = {
            displayMode: 'normal',
            colorTheme: 'light',
            fontSize: '100',
            autoRefreshInterval: '0',
            clockFormat: '24',
            noiseSensitivity: '5',
            warning_threshold: '70',
            danger_threshold: '85',
            equalizer_theme: 'neon',
            slideshowAutoPlay: 'true',
            slideshowLoop: 'true',
            slideshowProgress: 'true',
            connection_mode: 'offline',
            city: 'Istanbul,TR'
        };

        this.apiBase = window.location.origin + '/api';
        this.refreshTimer = null;

        this.init();
    }

    async init() {
        console.log('Settings Loader initializing...');
        await this.loadSettings();

        // Start polling for updates
        setInterval(() => this.checkForUpdates(), 10000); // Check every 10 seconds
    }

    async loadSettings() {
        try {
            const res = await fetch(`${this.apiBase}/settings`);
            if (res.ok) {
                const data = await res.json();
                this.applySettings(data);

                // Store globally for other scripts
                window.PANEL_SETTINGS = this.settings;

                // Dispatch event so other scripts know settings are loaded
                window.dispatchEvent(new CustomEvent('settingsLoaded', { detail: this.settings }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    applySettings(newSettings) {
        // Merge settings
        const prevSettings = { ...this.settings };
        this.settings = { ...this.settings, ...newSettings };

        console.log('Applying settings:', this.settings);

        // 1. Display Mode
        if (this.settings.displayMode !== prevSettings.displayMode) {
            if (window.displayModeManager) {
                window.displayModeManager.setMode(this.settings.displayMode);
            }
        }

        // 2. Color Theme
        if (this.settings.colorTheme !== prevSettings.colorTheme) {
            this.applyTheme(this.settings.colorTheme);
        }

        // 3. Font Size
        if (this.settings.fontSize !== prevSettings.fontSize) {
            document.documentElement.style.fontSize = this.settings.fontSize + '%';
        }

        // 4. Auto Refresh
        if (this.settings.autoRefreshInterval !== prevSettings.autoRefreshInterval) {
            this.setupAutoRefresh(this.settings.autoRefreshInterval);
        }

        // 5. Clock Format (handled by clock widget listening to global settings usually, but we can trigger update)

        // 6. Equalizer Theme - handled by main.js or equalizer script

        // 7. Connection Mode
        // Initial check or change
        if (this.settings.connection_mode !== prevSettings.connection_mode || !prevSettings.connection_mode) {
            this.applyConnectionMode(this.settings.connection_mode);
        }

        // 8. Update Weather City if changed
        if (this.settings.city !== prevSettings.city && this.settings.connection_mode === 'online') {
            this.fetchWeather();
        }
    }

    applyConnectionMode(mode) {
        const isOnline = mode === 'online';
        const weatherWidget = document.getElementById('weather-widget');

        console.log(`Connection Mode: ${mode.toUpperCase()}`);

        if (isOnline) {
            // Add Google Fonts
            if (!document.getElementById('google-fonts-link')) {
                const link = document.createElement('link');
                link.id = 'google-fonts-link';
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap';
                document.head.appendChild(link);
            }

            // Show Weather
            if (weatherWidget) {
                weatherWidget.style.display = 'flex';
                this.fetchWeather();
            }
        } else {
            // Remove Google Fonts
            const link = document.getElementById('google-fonts-link');
            if (link) link.remove();

            // Hide Weather
            if (weatherWidget) {
                weatherWidget.style.display = 'none';
            }
        }
    }

    async fetchWeather() {
        if (this.settings.connection_mode !== 'online') return;

        const city = this.settings.city || 'Istanbul';
        console.log('Fetching weather for:', city);

        try {
            // First get coordinates
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=tr&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) return;

            const { latitude, longitude, name } = geoData.results[0];

            // Get weather
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
            const weatherData = await weatherRes.json();

            this.updateWeatherUI(weatherData.current, name);
        } catch (e) {
            console.error('Weather fetch error:', e);
        }
    }

    updateWeatherUI(current, cityName) {
        const tempEl = document.getElementById('weather-temp');
        const iconEl = document.getElementById('weather-icon');
        const cityEl = document.getElementById('weather-city');

        if (tempEl) tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
        if (cityEl) cityEl.textContent = cityName;

        // Simple icon mapping for OpenMeteo weather codes
        if (iconEl) {
            const code = current.weather_code;
            let icon = '☀️';
            if (code > 0 && code <= 3) icon = '⛅';
            else if (code > 40 && code <= 49) icon = '🌫️';
            else if (code > 50 && code <= 59) icon = '🌧️'; // Drizzle
            else if (code > 60 && code <= 69) icon = '🌧️'; // Rain
            else if (code > 70 && code <= 79) icon = '❄️';
            else if (code > 80 && code <= 84) icon = '🌦️'; // Showers
            else if (code > 85) icon = '❄️'; // Snow showers
            else if (code > 90) icon = '⛈️';
            iconEl.textContent = icon;
        }
    }

    applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    setupAutoRefresh(interval) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);

        const minutes = parseInt(interval);
        if (minutes > 0) {
            console.log(`Auto refresh set to ${minutes} minutes`);
            this.refreshTimer = setInterval(() => {
                window.location.reload();
            }, minutes * 60 * 1000);
        }
    }

    async checkForUpdates() {
        // Simple polling
        await this.loadSettings();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.settingsLoader = new SettingsLoader();
});
