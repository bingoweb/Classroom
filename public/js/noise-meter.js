class NoiseMeter {
    constructor() {
        this.isListening = false;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.stream = null;
        this.dataArray = null;
        this.timeDataArray = null;
        this.isStarting = false;
        this.animationFrameId = null;
        this.stateImageTimer = null;
        this.stateImageWarmups = [];

        this.noiseScore = 0;
        this.maxScore = 100;
        this.warningThreshold = 70;
        this.dangerThreshold = 85;
        this.levelHysteresis = 4;
        this.lastUpdateTime = Date.now();

        this.calibrationSamples = [];
        this.calibrationSampleLimit = 120;
        this.isCalibrated = false;
        this.noiseFloorDb = -55;
        this.minimumNoiseFloorDb = -72;
        this.maximumNoiseFloorDb = -38;

        this.currentLevel = null;
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
            scaleLabels: Array.from(document.querySelectorAll('.noise-scale-label')),
            eqBars: [],
            eqPeaks: []
        };

        this.peakLevels = new Array(128).fill(0);
        this.peakHoldCounters = new Array(128).fill(0);
        this.displayedBarLevels = new Array(128).fill(-1);
        this.displayedPeakLevels = new Array(128).fill(-1);
        this.equalizerBands = [];
        this.equalizerBinCount = 0;
        this.lastAriaValue = '';
        this.updateLoop = this.updateLoop.bind(this);

        this.images = {
            low: 'assets/noise-states/quiet.webp',
            medium: 'assets/noise-states/attention.webp',
            high: 'assets/noise-states/loud.webp'
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
            this.lastAriaValue = '';
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
            const equalizerFragment = document.createDocumentFragment();
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
                equalizerFragment.appendChild(column);
                this.elements.eqBars.push(bar);
                this.elements.eqPeaks.push(peak);
            }
            this.elements.eqWrapper.appendChild(equalizerFragment);
        }

        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startListening());
        }

        this.updateScaleLayout();
        window.addEventListener('pagehide', () => this.stopListening(), { once: true });

        this.setMicrophoneState('idle', {
            title: 'Ses Ölçer Hazırlanıyor',
            subtitle: 'Mikrofon bağlantısı kontrol ediliyor'
        });

        setTimeout(() => this.startListening(), 1000);
    }

    warmStateImages() {
        if (typeof Image !== 'function') return;

        const currentSource = this.elements.image?.getAttribute?.('src') || '';
        this.stateImageWarmups = Object.values(this.images)
            .filter(source => source !== currentSource)
            .map(source => {
                const image = new Image();
                image.decoding = 'async';
                image.src = source;
                return image;
            });

        const decodeTasks = this.stateImageWarmups.map(image => (
            typeof image.decode === 'function'
                ? image.decode().catch(() => undefined)
                : Promise.resolve()
        ));

        Promise.allSettled(decodeTasks).finally(() => {
            this.stateImageWarmups = [];
        });
    }

    updateScaleLayout() {
        if (this.elements.meterBar) {
            this.elements.meterBar.style.setProperty('--warning-threshold', `${this.warningThreshold}%`);
            this.elements.meterBar.style.setProperty('--danger-threshold', `${this.dangerThreshold}%`);
        }

        const labelsContainer = this.elements.scaleLabels[0]?.parentElement;
        if (labelsContainer) {
            labelsContainer.style.gridTemplateColumns = [
                `${this.warningThreshold}fr`,
                `${this.dangerThreshold - this.warningThreshold}fr`,
                `${100 - this.dangerThreshold}fr`
            ].join(' ');
        }
    }

    clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    calculateDecibels(samples) {
        if (!samples?.length) return -100;

        let sumOfSquares = 0;
        for (let i = 0; i < samples.length; i++) {
            const normalizedSample = (samples[i] - 128) / 128;
            sumOfSquares += normalizedSample * normalizedSample;
        }

        const rms = Math.sqrt(sumOfSquares / samples.length);
        return 20 * Math.log10(Math.max(rms, 0.00001));
    }

    updateCalibration(decibels) {
        if (this.isCalibrated) return true;

        this.calibrationSamples.push(this.clamp(decibels, -90, -20));
        if (this.calibrationSamples.length < this.calibrationSampleLimit) return false;

        const sortedSamples = [...this.calibrationSamples].sort((a, b) => a - b);
        const quietSampleIndex = Math.floor(sortedSamples.length * 0.25);
        this.noiseFloorDb = this.clamp(
            sortedSamples[quietSampleIndex],
            this.minimumNoiseFloorDb,
            this.maximumNoiseFloorDb
        );
        this.calibrationSamples = [];
        this.isCalibrated = true;
        return true;
    }

    normalizeLoudness(decibels) {
        if (!this.isCalibrated) return 0;

        const distanceFromFloor = decibels - this.noiseFloorDb;
        if (distanceFromFloor < 8) {
            const adaptationRate = distanceFromFloor < 0 ? 0.01 : 0.001;
            this.noiseFloorDb = this.clamp(
                this.noiseFloorDb + ((decibels - this.noiseFloorDb) * adaptationRate),
                this.minimumNoiseFloorDb,
                this.maximumNoiseFloorDb
            );
        }

        const activityStartDb = this.noiseFloorDb + 7;
        const fullActivityDb = Math.min(-12, this.noiseFloorDb + 30);
        const activityRange = Math.max(12, fullActivityDb - activityStartDb);
        return this.clamp((decibels - activityStartDb) / activityRange, 0, 1);
    }

    configureEqualizerBands(totalBins) {
        if (this.equalizerBinCount === totalBins && this.equalizerBands.length === 128) return;

        this.equalizerBinCount = totalBins;
        this.equalizerBands = Array.from({ length: 128 }, (_, index) => {
            let amplification = 1.5;
            if (index < 32) amplification = 1.25;
            if (index > 64) amplification = 2.5;
            if (index > 96) amplification = 4.0;

            return {
                startBin: Math.floor(Math.pow(index / 128, 1.8) * (totalBins - 50)),
                endBin: Math.floor(Math.pow((index + 1) / 128, 1.8) * (totalBins - 50)) + 1,
                amplification
            };
        });
    }

    updateNoiseScore(loudness, deltaTime) {
        const safeDelta = this.clamp(deltaTime, 0, 0.25);
        const targetScore = this.clamp(loudness, 0, 1) * this.maxScore;
        const timeConstant = targetScore > this.noiseScore ? 2.2 : 3.2;
        const blend = 1 - Math.exp(-safeDelta / timeConstant);

        this.noiseScore += (targetScore - this.noiseScore) * blend;
        if (this.noiseScore < 0.05) this.noiseScore = 0;
        this.noiseScore = this.clamp(this.noiseScore, 0, this.maxScore);
    }

    resolveLevel(percentage) {
        if (this.currentLevel === 'high') {
            if (percentage >= this.dangerThreshold - this.levelHysteresis) return 'high';
            return percentage >= this.warningThreshold - this.levelHysteresis ? 'medium' : 'low';
        }

        if (this.currentLevel === 'medium') {
            if (percentage >= this.dangerThreshold) return 'high';
            return percentage >= this.warningThreshold - this.levelHysteresis ? 'medium' : 'low';
        }

        if (percentage >= this.dangerThreshold) return 'high';
        if (percentage >= this.warningThreshold) return 'medium';
        return 'low';
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

            pendingStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false
                },
                video: false
            });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(pendingStream);

            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.7;
            this.microphone.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.timeDataArray = new Uint8Array(this.analyser.fftSize);
            this.configureEqualizerBands(bufferLength);
            this.calibrationSamples = [];
            this.isCalibrated = false;
            this.noiseScore = 0;

            this.stream = pendingStream;
            pendingStream = null;
            this.isListening = true;
            this.isStarting = false;
            if (this.elements.card) this.elements.card.classList.add('active');

            this.setMicrophoneState('listening', {
                title: 'Ortam Tanınıyor',
                subtitle: 'Ses dengesi otomatik ayarlanıyor',
                color: '#49637a'
            });

            // Decode the remaining visual states only after the microphone is
            // usable. An unavailable kiosk keeps its initial load lean.
            this.warmStateImages();
            this.lastUpdateTime = Date.now();
            this.updateLoop();

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
            this.timeDataArray = null;

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

    stopListening() {
        this.isListening = false;
        this.isStarting = false;

        if (this.stateImageTimer !== null && typeof clearTimeout === 'function') {
            clearTimeout(this.stateImageTimer);
            this.stateImageTimer = null;
        }
        this.stateImageWarmups = [];

        if (this.animationFrameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.microphone && typeof this.microphone.disconnect === 'function') {
            try {
                this.microphone.disconnect();
            } catch (_) {
                // Kaynak zaten ayrılmış olabilir.
            }
        }
        this.microphone = null;

        if (this.audioContext && typeof this.audioContext.close === 'function') {
            const closePromise = this.audioContext.close();
            if (closePromise && typeof closePromise.catch === 'function') {
                closePromise.catch(() => {});
            }
        }
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.timeDataArray = null;
    }

    updateLoop() {
        this.animationFrameId = null;
        if (!this.isListening || !this.analyser || !this.dataArray || !this.timeDataArray) return;
        this.animationFrameId = requestAnimationFrame(this.updateLoop);

        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getByteTimeDomainData(this.timeDataArray);
        this.updateEqualizerBars();

        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        const decibels = this.calculateDecibels(this.timeDataArray);
        if (!this.updateCalibration(decibels)) return;

        this.updateNoiseScore(this.normalizeLoudness(decibels), deltaTime);
        this.updateUI();
    }

    updateEqualizerBars() {
        if (!this.elements.eqBars || !this.elements.eqBars[0] || !this.dataArray) return;

        const totalBars = 128;
        const totalBins = this.dataArray.length;
        const step = 5;
        this.configureEqualizerBands(totalBins);

        for (let i = 0; i < totalBars; i++) {
            const bar = this.elements.eqBars[i];
            const peak = this.elements.eqPeaks[i];
            if (!bar) continue;

            const { startBin, endBin, amplification } = this.equalizerBands[i];

            let sum = 0;
            let count = 0;
            for (let j = startBin; j < endBin; j++) if (j < totalBins) { sum += this.dataArray[j]; count++; }
            if (count === 0 && startBin < totalBins) { sum = this.dataArray[startBin]; count = 1; }

            let avg = count > 0 ? sum / count : 0;
            if (avg < 5) avg = 0;

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

            if (this.displayedBarLevels[i] !== quantizedPercent) {
                bar.style.height = `${quantizedPercent}%`;
                this.displayedBarLevels[i] = quantizedPercent;
            }

            if (peak) {
                let displayPeak = Math.floor(this.peakLevels[i] / step) * step;
                if (this.displayedPeakLevels[i] !== displayPeak) {
                    if (displayPeak > 0) {
                        peak.style.bottom = `${displayPeak}%`;
                        peak.style.opacity = 0.9;
                    } else {
                        peak.style.opacity = 0;
                    }
                    this.displayedPeakLevels[i] = displayPeak;
                }
            }
        }
    }

    updateUI() {
        const percentage = (this.noiseScore / this.maxScore) * 100;

        if (this.elements.fill) {
            this.elements.fill.style.width = `${percentage}%`;
        }

        const newLevel = this.resolveLevel(percentage);

        if (this.elements.levelMeter) {
            const levelNames = { low: 'Sessiz', medium: 'Dikkat', high: 'Gürültü' };
            const roundedPercentage = Math.round(percentage);
            const ariaValue = `${newLevel}:${roundedPercentage}`;
            if (ariaValue !== this.lastAriaValue) {
                this.elements.levelMeter.setAttribute('aria-valuenow', `${roundedPercentage}`);
                this.elements.levelMeter.setAttribute(
                    'aria-valuetext',
                    `${levelNames[newLevel]}: yüzde ${roundedPercentage}`
                );
                this.lastAriaValue = ariaValue;
            }
        }

        if (newLevel !== this.currentLevel) this.changeState(newLevel);
    }

    changeState(state) {
        this.currentLevel = state;

        const fillColors = {
            low: 'linear-gradient(90deg, #2ed573, #7bed9f)',
            medium: 'linear-gradient(90deg, #ffa502, #ff7f50)',
            high: 'linear-gradient(90deg, #ff4757, #ff6b81)'
        };
        if (this.elements.fill && this.elements.fill.dataset.level !== state) {
            this.elements.fill.style.background = fillColors[state];
            this.elements.fill.dataset.level = state;
        }

        if (this.elements.image) {
            if (this.stateImageTimer !== null && typeof clearTimeout === 'function') {
                clearTimeout(this.stateImageTimer);
            }
            this.elements.image.style.transform = 'translateX(-50%) scale(0.9)';
            if (this.elements.image.getAttribute?.('src') !== this.images[state]) {
                this.elements.image.src = this.images[state];
            }
            this.stateImageTimer = setTimeout(() => {
                this.stateImageTimer = null;
                if (this.currentLevel !== state) return;
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
