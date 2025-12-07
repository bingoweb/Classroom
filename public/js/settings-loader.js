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
            slideshowProgress: 'true'
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
