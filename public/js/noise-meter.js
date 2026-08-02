class NoiseMeter {
    constructor() {
        this.isListening = false;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.stream = null;
        this.dataArray = null;
        this.isStarting = false;

        this.noiseScore = 0;
        this.maxScore = 100;
        this.riseRate = 5;
        this.fallRate = 3;

        this.quietThreshold = 0.27;
        this.normalThreshold = 0.32;
        this.loudThreshold = 0.71;

        this.lastUpdateTime = Date.now();
        this.smoothedVolume = 0;
        this.smoothingFactor = 0.3;

        this.calibrationSamples = [];
        this.calibrationDuration = 10;
        this.isCalibrated = true;
        this.baselineNoise = 0.05;

        this.currentLevel = null;

        // Settings from Admin
        this.settingsWarning = 70;
        this.settingsDanger = 85;
        this.currentThemeName = 'neon'; // Default

        // Theme Palettes - ULTRA VIBRANT & NEON COLORS
        this.themes = {
            neon: ['#ff0055', '#ffaa00', '#ffff00', '#00ff00'],    // Hot Pink -> Orange -> Yellow -> Lime
            fire: ['#ff0000', '#ff4500', '#ffcc00', '#ffff00'],    // Bright Red -> Red-Orange -> Gold -> Yellow
            ocean: ['#0000ff', '#0088ff', '#00ffff', '#e0ffff'],   // Blue -> Azure -> Cyan -> Light Cyan
            forest: ['#009900', '#33cc33', '#66ff66', '#ccff00'],  // Green -> Lime -> Bright Green -> Electric Lime
            sunset: ['#cc00cc', '#ff0066', '#ff9933', '#ffff00'],  // Purple -> Magenta -> Orange -> Yellow
            love: ['#ff0000', '#ff0066', '#ff3399', '#ff99cc'],    // Red -> Hot Pink -> Rose -> Light Pink
            royal: ['#4b0082', '#9900cc', '#cc00ff', '#ffd700'],   // Indigo -> Violet -> Neon Purple -> Gold
            matrix: ['#002200', '#006600', '#00cc00', '#00ff00'],  // Dark Green -> Green -> Matrix Green -> Bright Neon
            ice: ['#0055ff', '#00aaff', '#00ffff', '#ffffff'],     // Deep Blue -> Sky Blue -> Cyan -> White
            rainbow: ['#ff0000', '#00ff00', '#0000ff', '#ffff00']  // Primary Colors (High Saturation)
        };

        this.elements = {
            card: document.getElementById('noise-meter-card'),
            image: document.getElementById('noise-character-img'),
            levelMeter: document.getElementById('noise-level-meter'),
            meterBar: document.querySelector('.noise-meter-bar'),
            fill: document.getElementById('noise-meter-fill'),
            status: document.getElementById('noise-status-text'),
            statusIcon: document.querySelector('#noise-status-text .noise-status-icon'),
            statusTitle: document.querySelector('#noise-status-text .noise-status-copy strong'),
            statusSubtitle: document.querySelector('#noise-status-text .noise-status-copy small'),
            startBtn: document.getElementById('mic-start-btn'),
            eqWrapper: document.querySelector('.equalizer-bars'),
            eqContainer: document.getElementById('equalizer-container'),
            scaleLabels: Array.from(document.querySelectorAll('.noise-scale-label')),
            eqBars: [],
            eqPeaks: []
        };

        this.peakLevels = new Array(128).fill(0);
        this.peakHoldCounters = new Array(128).fill(0);

        this.images = {
            low: 'uploads/sessiz.png',
            medium: 'uploads/uyari.png',
            high: 'uploads/gurultu.png'
        };

        this.init();
    }

    setStatus(iconPath, title, subtitle, color) {
        if (!this.elements.status) return;

        if (this.elements.statusIcon) {
            this.elements.statusIcon.src = iconPath;
        }
        if (this.elements.statusTitle) {
            this.elements.statusTitle.textContent = title;
        }
        if (this.elements.statusSubtitle) {
            this.elements.statusSubtitle.textContent = subtitle;
        }
        this.elements.status.style.color = color;
    }

    setMicrophoneState(state, {
        icon = 'assets/ui-icons-3d/microphone.png',
        title,
        subtitle,
        color = '#49637a',
        buttonText = 'Tekrar Dene',
        showButton = false
    }) {
        if (this.elements.card) {
            this.elements.card.classList.remove(
                'mic-state-idle',
                'mic-state-requesting',
                'mic-state-listening',
                'mic-state-unavailable'
            );
            this.elements.card.classList.add(`mic-state-${state}`);
            this.elements.card.dataset.micState = state;
        }

        if (state !== 'listening') {
            this.currentLevel = null;
            if (this.elements.card) {
                this.elements.card.classList.remove('state-low', 'state-medium', 'state-high');
            }
            this.elements.scaleLabels.forEach(label => {
                label.classList.remove('is-active');
                label.setAttribute('aria-current', 'false');
            });
            if (this.elements.levelMeter) {
                this.elements.levelMeter.setAttribute('aria-valuenow', '0');
                this.elements.levelMeter.setAttribute('aria-valuetext', title);
            }
        }

        this.setStatus(icon, title, subtitle, color);

        if (this.elements.startBtn) {
            this.elements.startBtn.hidden = !showButton;
            this.elements.startBtn.disabled = state === 'requesting';
            this.elements.startBtn.textContent = buttonText;
        }
    }

    getMicrophoneErrorState(error) {
        const errorName = error?.name || 'UnknownError';

        if (['NotFoundError', 'DevicesNotFoundError'].includes(errorName)) {
            return {
                title: 'Ses Ölçer Dinlenmede',
                subtitle: 'Mikrofon bağlanınca yeniden deneyin'
            };
        }

        if (['NotAllowedError', 'SecurityError'].includes(errorName)) {
            return {
                title: 'Ses Ölçer Hazır Değil',
                subtitle: 'Öğretmen mikrofon iznini açabilir'
            };
        }

        if (['NotReadableError', 'TrackStartError', 'AbortError'].includes(errorName)) {
            return {
                title: 'Ses Ölçer Kısa Bir Molada',
                subtitle: 'Mikrofon başka bir uygulamada olabilir'
            };
        }

        return {
            title: 'Ses Ölçer Hazır Değil',
            subtitle: 'Biraz sonra yeniden deneyin'
        };
    }

    init() {
        if (this.elements.eqWrapper) {
            this.elements.eqWrapper.innerHTML = '';
            for (let i = 0; i < 128; i++) {
                const column = document.createElement('div');
                column.className = 'eq-column';
                const peak = document.createElement('div');
                peak.className = 'eq-peak';
                const bar = document.createElement('div');
                bar.className = 'eq-bar';
                bar.id = `eq-bar-${i + 1}`;
                column.appendChild(peak);
                column.appendChild(bar);
                this.elements.eqWrapper.appendChild(column);
                this.elements.eqBars.push(bar);
                this.elements.eqPeaks.push(peak);
            }
        }

        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startListening());
        }

        // Global Settings Listener
        window.addEventListener('settingsLoaded', (e) => this.applySettings(e.detail));

        // Initial Settings Check
        if (window.PANEL_SETTINGS) {
            this.applySettings(window.PANEL_SETTINGS);
        }

        this.setMicrophoneState('idle', {
            title: 'Ses Ölçer Hazırlanıyor',
            subtitle: 'Mikrofon bağlantısı kontrol ediliyor'
        });

        setTimeout(() => this.startListening(), 1000);
    }

    applySettings(settings) {
        console.log('NoiseMeter settings applied:', settings);

        // 1. Equalizer Theme
        if (settings.equalizer_theme) {
            this.setTheme(settings.equalizer_theme);
        }

        // 2. Sensitivity
        if (settings.noiseSensitivity) {
            const sens = parseInt(settings.noiseSensitivity);
            this.riseRate = 3 + (sens * 0.5);
            this.fallRate = 2 + (sens * 0.2);
        }

        // 3. Thresholds
        const warning = parseInt(settings.warning_threshold);
        const danger = parseInt(settings.danger_threshold);
        this.settingsWarning = Math.max(1, Math.min(98, Number.isFinite(warning) ? warning : 70));
        this.settingsDanger = Math.max(
            this.settingsWarning + 1,
            Math.min(99, Number.isFinite(danger) ? danger : 85)
        );
        this.updateScaleLayout();
    }

    updateScaleLayout() {
        if (this.elements.meterBar) {
            this.elements.meterBar.style.setProperty('--warning-threshold', `${this.settingsWarning}%`);
            this.elements.meterBar.style.setProperty('--danger-threshold', `${this.settingsDanger}%`);
        }

        const labelsContainer = this.elements.scaleLabels[0]?.parentElement;
        if (labelsContainer) {
            labelsContainer.style.gridTemplateColumns = [
                `${this.settingsWarning}fr`,
                `${this.settingsDanger - this.settingsWarning}fr`,
                `${100 - this.settingsDanger}fr`
            ].join(' ');
        }
    }

    setTheme(themeName) {
        this.currentThemeName = themeName;

        if (this.elements.eqContainer) {
            const classes = this.elements.eqContainer.className.split(' ').filter(c => !c.startsWith('theme-'));
            this.elements.eqContainer.className = classes.join(' ');
            this.elements.eqContainer.classList.add(`theme-${themeName}`);
        }
    }

    async startListening() {
        if (this.isListening || this.isStarting) return;

        this.isStarting = true;
        this.setMicrophoneState('requesting', {
            title: 'Mikrofon Bağlanıyor',
            subtitle: 'Ses dengesi hazırlanıyor',
            buttonText: 'Bağlanıyor…'
        });

        let pendingStream = null;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                const unsupportedError = new Error('Microphone API is unavailable');
                unsupportedError.name = 'NotSupportedError';
                throw unsupportedError;
            }

            pendingStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(pendingStream);

            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.7;
            this.microphone.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.stream = pendingStream;
            pendingStream = null;
            this.isListening = true;
            this.isStarting = false;
            if (this.elements.card) this.elements.card.classList.add('active');

            this.setMicrophoneState('listening', {
                title: 'Dinleniyor',
                subtitle: 'Ses düzeyi ölçülüyor',
                color: '#178958'
            });

            this.lastUpdateTime = Date.now();
            this.updateLoop();

            setTimeout(() => {
                if (!this.isCalibrated && this.elements.status) {
                    this.setStatus('assets/ui-icons-3d/microphone.png', 'Hazır', 'Sınıfı dinliyorum', '#27ae60');
                }
            }, 5000);

        } catch (error) {
            this.isStarting = false;

            if (pendingStream) {
                pendingStream.getTracks().forEach(track => track.stop());
            }
            if (this.audioContext && typeof this.audioContext.close === 'function') {
                const closePromise = this.audioContext.close();
                if (closePromise && typeof closePromise.catch === 'function') {
                    closePromise.catch(() => {});
                }
            }
            this.audioContext = null;
            this.analyser = null;
            this.microphone = null;
            this.dataArray = null;

            const expectedErrors = new Set([
                'NotAllowedError',
                'SecurityError',
                'NotFoundError',
                'DevicesNotFoundError',
                'NotReadableError',
                'TrackStartError',
                'AbortError',
                'NotSupportedError'
            ]);
            if (expectedErrors.has(error?.name)) {
                console.info('Noise meter unavailable:', error.name);
            } else {
                console.error('Unexpected microphone error:', error);
            }

            const errorState = this.getMicrophoneErrorState(error);
            this.setMicrophoneState('unavailable', {
                icon: 'assets/ui-icons-3d/quiet.png',
                title: errorState.title,
                subtitle: errorState.subtitle,
                showButton: true
            });
        }
    }

    updateLoop() {
        if (!this.isListening) return;
        requestAnimationFrame(() => this.updateLoop());

        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        const startBin = 4;
        const endBin = 80;
        for (let i = startBin; i < endBin; i++) sum += this.dataArray[i];

        const average = sum / (endBin - startBin);
        const instantVolume = average / 255;

        this.smoothedVolume = (instantVolume * this.smoothingFactor) + (this.smoothedVolume * (1 - this.smoothingFactor));

        this.updateEqualizerBars();

        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        const volumeLevel = this.smoothedVolume;

        if (volumeLevel > this.loudThreshold) {
            this.noiseScore += this.riseRate * 1.5 * deltaTime;
        } else if (volumeLevel > this.normalThreshold) {
            this.noiseScore += this.riseRate * 0.5 * deltaTime;
        } else {
            this.noiseScore -= this.fallRate * deltaTime;
        }

        this.noiseScore = Math.max(0, Math.min(this.maxScore, this.noiseScore));
        this.updateUI();
    }

    updateEqualizerBars() {
        if (!this.elements.eqBars || !this.elements.eqBars[0] || !this.dataArray) return;

        const totalBars = 128;
        const totalBins = this.dataArray.length;
        const step = 5;

        // Get current theme palette
        const palette = this.themes[this.currentThemeName] || this.themes['neon'];

        for (let i = 0; i < totalBars; i++) {
            const bar = this.elements.eqBars[i];
            const peak = this.elements.eqPeaks[i];
            if (!bar) continue;

            const startBin = Math.floor(Math.pow(i / totalBars, 1.8) * (totalBins - 50));
            const endBin = Math.floor(Math.pow((i + 1) / totalBars, 1.8) * (totalBins - 50)) + 1;

            let sum = 0;
            let count = 0;
            for (let j = startBin; j < endBin; j++) if (j < totalBins) { sum += this.dataArray[j]; count++; }
            if (count === 0 && startBin < totalBins) { sum = this.dataArray[startBin]; count = 1; }

            let avg = count > 0 ? sum / count : 0;
            if (avg < 5) avg = 0;

            let amplification = 1.5;
            if (i < 32) amplification = 1.25;
            if (i > 64) amplification = 2.5;
            if (i > 96) amplification = 4.0;

            let percent = (avg / 255) * 100 * amplification;
            percent = Math.min(100, Math.max(0, percent));

            let quantizedPercent = Math.floor(percent / step) * step;
            if (quantizedPercent < step && avg > 0) quantizedPercent = step;
            if (avg === 0) quantizedPercent = 0;

            // Peak Hold
            if (this.peakLevels[i] < quantizedPercent) {
                this.peakLevels[i] = quantizedPercent;
                this.peakHoldCounters[i] = 30;
            } else {
                if (this.peakHoldCounters[i] > 0) this.peakHoldCounters[i]--;
                else this.peakLevels[i] -= 0.25;
            }
            if (this.peakLevels[i] < quantizedPercent) this.peakLevels[i] = quantizedPercent;

            // Dynamic Bar Color based on Theme Palette
            let color;
            if (i < 32) color = palette[0];      // 1st Quarter
            else if (i < 64) color = palette[1]; // 2nd Quarter
            else if (i < 96) color = palette[2]; // 3rd Quarter
            else color = palette[3];             // 4th Quarter

            bar.style.height = `${quantizedPercent}%`;
            bar.style.backgroundColor = color;

            if (peak) {
                let displayPeak = Math.floor(this.peakLevels[i] / step) * step;
                if (displayPeak > 0) {
                    peak.style.bottom = `${displayPeak}%`;
                    peak.style.opacity = 0.9;
                } else {
                    peak.style.opacity = 0;
                }
            }
        }
    }

    updateUI() {
        const percentage = (this.noiseScore / this.maxScore) * 100;
        const warningVal = this.settingsWarning;
        const dangerVal = this.settingsDanger;

        if (this.elements.fill) {
            this.elements.fill.style.width = `${percentage}%`;
            if (percentage >= dangerVal) {
                this.elements.fill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
            } else if (percentage >= warningVal) {
                this.elements.fill.style.background = 'linear-gradient(90deg, #ffa502, #ff7f50)';
            } else {
                this.elements.fill.style.background = 'linear-gradient(90deg, #2ed573, #7bed9f)';
            }
        }

        let newLevel = 'low';
        if (percentage >= dangerVal) newLevel = 'high';
        else if (percentage >= warningVal) newLevel = 'medium';

        if (this.elements.levelMeter) {
            const levelNames = { low: 'Sessiz', medium: 'Dikkat', high: 'Gürültü' };
            this.elements.levelMeter.setAttribute('aria-valuenow', `${Math.round(percentage)}`);
            this.elements.levelMeter.setAttribute(
                'aria-valuetext',
                `${levelNames[newLevel]}: yüzde ${Math.round(percentage)}`
            );
        }

        if (newLevel !== this.currentLevel) this.changeState(newLevel);
    }

    changeState(state) {
        this.currentLevel = state;

        if (this.elements.image) {
            this.elements.image.style.transform = 'translateX(-50%) scale(0.9)';
            setTimeout(() => {
                this.elements.image.src = this.images[state];
                this.elements.image.style.transform = 'translateX(-50%) scale(1)';
            }, 200);
        }

        if (this.elements.card) {
            this.elements.card.classList.remove('state-low', 'state-medium', 'state-high');
            this.elements.card.classList.add(`state-${state}`);
        }

        this.elements.scaleLabels.forEach(label => {
            const isActive = label.dataset.level === state;
            label.classList.toggle('is-active', isActive);
            label.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        if (this.elements.status) {
            switch (state) {
                case 'low':
                    this.setStatus('assets/ui-icons-3d/sparkles.png', 'Harika Gidiyoruz!', 'Sınıfımız süper', '#2ed573');
                    break;
                case 'medium':
                    this.setStatus('assets/ui-icons-3d/quiet.png', 'Dikkat! Yükseliyor', 'Biraz sessiz olalım', '#ffa502');
                    break;
                case 'high':
                    this.setStatus('assets/ui-icons-3d/loudspeaker.png', 'Çok Yüksek!', 'Hadi düşürelim', '#ff4757');
                    break;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.noiseMeter = new NoiseMeter();
});
