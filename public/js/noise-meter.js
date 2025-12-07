class NoiseMeter {
    constructor() {
        this.isListening = false;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;

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

        this.currentLevel = 'low';

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
            fill: document.getElementById('noise-meter-fill'),
            status: document.getElementById('noise-status-text'),
            startBtn: document.getElementById('mic-start-btn'),
            eqWrapper: document.querySelector('.equalizer-bars'),
            eqContainer: document.getElementById('equalizer-container'),
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
        this.settingsWarning = parseInt(settings.warning_threshold) || 70;
        this.settingsDanger = parseInt(settings.danger_threshold) || 85;
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
        if (this.isListening) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);

            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.7;
            this.microphone.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.isListening = true;
            if (this.elements.startBtn) this.elements.startBtn.style.display = 'none';
            if (this.elements.card) this.elements.card.classList.add('active');

            if (this.elements.status) {
                this.elements.status.textContent = '🎤 Dinleniyor...';
                this.elements.status.style.color = '#27ae60';
            }

            this.lastUpdateTime = Date.now();
            this.updateLoop();

            setTimeout(() => {
                if (!this.isCalibrated && this.elements.status) {
                    this.elements.status.textContent = 'Hazır';
                    this.elements.status.style.color = '#27ae60';
                }
            }, 5000);

        } catch (error) {
            console.error('Microphone error:', error);
            if (this.elements.status) {
                this.elements.status.textContent = 'Mikrofon İzni Gerekli';
                this.elements.status.style.color = '#ff4757';
            }
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
            if (percentage > dangerVal) {
                this.elements.fill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
            } else if (percentage > warningVal) {
                this.elements.fill.style.background = 'linear-gradient(90deg, #ffa502, #ff7f50)';
            } else {
                this.elements.fill.style.background = 'linear-gradient(90deg, #2ed573, #7bed9f)';
            }
        }

        let newLevel = 'low';
        if (percentage > dangerVal) newLevel = 'high';
        else if (percentage > warningVal) newLevel = 'medium';

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

        if (this.elements.status) {
            switch (state) {
                case 'low':
                    this.elements.status.innerHTML = '✨ Harika Gidiyoruz! ✨<br><span style="font-size:0.6em; opacity:0.8">Sınıfımız süper</span>';
                    this.elements.status.style.color = '#2ed573';
                    break;
                case 'medium':
                    this.elements.status.innerHTML = '🤫 Dikkat! Yükseliyor<br><span style="font-size:0.6em; opacity:0.8">Biraz sessiz olalım</span>';
                    this.elements.status.style.color = '#ffa502';
                    break;
                case 'high':
                    this.elements.status.innerHTML = '🔊 Çok Yüksek!<br><span style="font-size:0.6em; opacity:0.8">Hadi düşürelim</span>';
                    this.elements.status.style.color = '#ff4757';
                    break;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.noiseMeter = new NoiseMeter();
});
