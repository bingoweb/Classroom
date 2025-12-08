// Display Mode Manager - Handles fullscreen and kiosk modes
// Works with settings from admin panel

class DisplayModeManager {
    constructor() {
        this.currentMode = 'normal';
        this.isFullscreen = false;
        this.init();
    }

    init() {
        // Load saved settings
        this.loadSettings();

        // TEMPORARILY DISABLED - Tasarım bitince açılacak
        // Apply mode on page load
        // this.applyMode();
        console.log('Display mode auto-apply DISABLED for design testing');

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('MSFullscreenchange', () => this.onFullscreenChange());

        // Listen for ESC key to exit fullscreen (unless in kiosk mode)
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    loadSettings() {
        // Settings are now managed by SettingsLoader
        console.log('DisplayModeManager waiting for settings...');
    }

    applyMode() {
        console.log('Applying display mode:', this.currentMode);

        switch (this.currentMode) {
            case 'fullscreen':
                this.enterFullscreen();
                break;
            case 'kiosk':
                this.enterKioskMode();
                break;
            case 'normal':
            default:
                this.exitFullscreen();
                break;
        }
    }

    enterFullscreen() {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error('Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed:', err);
            });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    enterKioskMode() {
        // TEMPORARILY DISABLED - Tasarım bitince açılacak
        console.log('Kiosk mode restrictions DISABLED for design testing');

        // First enter fullscreen
        // this.enterFullscreen();

        // Add kiosk-specific styles
        // document.body.classList.add('kiosk-mode');

        // Disable context menu (right-click)
        // document.addEventListener('contextmenu', this.preventContextMenu);

        // Disable F11 (fullscreen toggle)
        // document.addEventListener('keydown', this.preventF11);
    }

    exitKioskMode() {
        document.body.classList.remove('kiosk-mode');
        document.removeEventListener('contextmenu', this.preventContextMenu);
        document.removeEventListener('keydown', this.preventF11);
        this.exitFullscreen();
    }

    preventContextMenu(e) {
        // TEMPORARILY DISABLED
        // e.preventDefault();
        // return false;
    }

    preventF11(e) {
        // TEMPORARILY DISABLED
        // if (e.key === 'F11') {
        //     e.preventDefault();
        //     return false;
        // }
    }

    handleKeyPress(e) {
        // TEMPORARILY DISABLED - All key restrictions removed for design testing
        // In kiosk mode, prevent ESC from exiting fullscreen
        // if (this.currentMode === 'kiosk' && e.key === 'Escape') {
        //     e.preventDefault();
        //     e.stopPropagation();
        //     return false;
        // }

        // Allow ESC in normal fullscreen mode
        if (this.currentMode === 'fullscreen' && e.key === 'Escape') {
            this.currentMode = 'normal';
        }
    }

    onFullscreenChange() {
        this.isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        console.log('Fullscreen state changed:', this.isFullscreen);

        // If we exited fullscreen but mode is fullscreen/kiosk, reenter
        if (!this.isFullscreen && (this.currentMode === 'fullscreen' || this.currentMode === 'kiosk')) {
            if (this.currentMode === 'kiosk') {
                // In kiosk mode, immediately re-enter fullscreen
                setTimeout(() => {
                    this.enterFullscreen();
                }, 100);
            }
        }
    }

    // Public method to change mode (can be called from console or other scripts)
    setMode(mode) {
        if (['normal', 'fullscreen', 'kiosk'].includes(mode)) {
            this.currentMode = mode;
            this.applyMode();

            // localStorage update removed - handled by admin panel and DB
            console.log('Mode set to:', mode);
        } else {
            console.error('Invalid display mode:', mode);
        }
    }
}

// Initialize on page load
let displayModeManager;

document.addEventListener('DOMContentLoaded', () => {
    displayModeManager = new DisplayModeManager();

    // Make it globally accessible
    window.displayModeManager = displayModeManager;

    console.log('Display Mode Manager initialized');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DisplayModeManager;
}
