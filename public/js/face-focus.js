/**
 * Face-Focused Image Positioning Algorithm
 * Yüz odaklı görüntü konumlandırma algoritması
 * 
 * Bu algoritma, öğrenci fotoğraflarının yüzlerini kutucukların merkezine
 * odaklanmış şekilde yerleştirir.
 */

class FaceFocusEngine {
    constructor() {
        this.faceCache = new Map(); // Yüz pozisyonlarını cache'ler
        this.detectionQueue = []; // Algılama kuyruğu
        this.isProcessing = false;
        this.maxConcurrent = 3; // Aynı anda işlenecek maksimum resim
    }

    /**
     * Ana fonksiyon: Resmi yükle ve yüzü odakla
     * @param {HTMLImageElement} imgElement - İşlenecek img elementi
     * @param {string} imageSrc - Resim kaynağı
     * @param {string} containerSize - Kutucuk boyutu ('large', 'small', 'star')
     */
    async focusFace(imgElement, imageSrc, containerSize = 'small') {
        if (!imgElement || !imageSrc) return;

        // Cache kontrolü
        const cacheKey = `${imageSrc}_${containerSize}`;
        if (this.faceCache.has(cacheKey)) {
            const cachedPosition = this.faceCache.get(cacheKey);
            this.applyFocus(imgElement, cachedPosition, containerSize);
            return;
        }

        // Resim yüklenene kadar bekle
        if (!imgElement.complete || imgElement.naturalWidth === 0) {
            imgElement.onload = () => {
                this.detectAndFocus(imgElement, imageSrc, containerSize);
            };
        } else {
            await this.detectAndFocus(imgElement, imageSrc, containerSize);
        }
    }

    /**
     * Yüz algılama ve odaklama
     */
    async detectAndFocus(imgElement, imageSrc, containerSize) {
        try {
            // Önce heuristik yöntemle hızlı yerleştirme yap
            const heuristicPosition = this.calculateHeuristicPosition(imgElement, containerSize);
            this.applyFocus(imgElement, heuristicPosition, containerSize);

            // Sonra gelişmiş algılama yap (arka planda)
            this.queueDetection(imgElement, imageSrc, containerSize);
        } catch (error) {
            console.warn('Face focus error:', error);
            // Hata durumunda heuristik kullan
            const heuristicPosition = this.calculateHeuristicPosition(imgElement, containerSize);
            this.applyFocus(imgElement, heuristicPosition, containerSize);
        }
    }

    /**
     * Gelişmiş yüz algılama (arka plan)
     */
    async queueDetection(imgElement, imageSrc, containerSize) {
        this.detectionQueue.push({ imgElement, imageSrc, containerSize });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.detectionQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const batch = this.detectionQueue.splice(0, this.maxConcurrent);

        await Promise.all(batch.map(item => this.advancedDetection(item)));

        // Kuyrukta daha fazla varsa devam et
        setTimeout(() => this.processQueue(), 100);
    }

    /**
     * Gelişmiş yüz algılama - Canvas tabanlı
     */
    async advancedDetection({ imgElement, imageSrc, containerSize }) {
        try {
            const facePosition = await this.detectFaceWithCanvas(imgElement);

            if (facePosition) {
                const cacheKey = `${imageSrc}_${containerSize}`;
                this.faceCache.set(cacheKey, facePosition);
                this.applyFocus(imgElement, facePosition, containerSize);
            }
        } catch (error) {
            console.warn('Advanced detection failed:', error);
        }
    }

    /**
     * Canvas ile yüz algılama (basitleştirilmiş)
     * Gerçek yüz algılama için daha gelişmiş bir kütüphane gerekir
     */
    async detectFaceWithCanvas(imgElement) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imgElement.naturalWidth;
                canvas.height = imgElement.naturalHeight;
                ctx.drawImage(imgElement, 0, 0);

                // Basit yüz algılama: Parlaklık ve kontrast analizi
                // Gerçek uygulamada face-api.js veya MediaPipe kullanılabilir
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const faceCenter = this.detectFaceRegion(imageData, canvas.width, canvas.height);

                resolve(faceCenter);
            } catch (error) {
                resolve(null);
            }
        });
    }

    /**
     * Basit yüz bölgesi algılama (heuristik + görüntü analizi)
     */
    detectFaceRegion(imageData, width, height) {
        // Yüz genellikle resmin üst 1/3'ünde ve ortada
        // Görüntü analizi ile daha kesin pozisyon bulunur

        const centerX = width / 2;
        const centerY = height * 0.35; // Üst 1/3'ün ortası

        // Görüntü analizi: Yüksek kontrast ve parlaklık bölgeleri (gözler, burun)
        let bestX = centerX;
        let bestY = centerY;
        let maxScore = 0;

        // Üst 1/3 bölgesinde tarama
        const searchWidth = width * 0.6; // Ortadaki %60
        const searchHeight = height * 0.4; // Üst %40
        const startX = (width - searchWidth) / 2;
        const startY = height * 0.1;

        const step = Math.max(10, Math.floor(width / 20));

        for (let y = startY; y < startY + searchHeight; y += step) {
            for (let x = startX; x < startX + searchWidth; x += step) {
                const score = this.calculateFaceScore(imageData, x, y, width, height);
                if (score > maxScore) {
                    maxScore = score;
                    bestX = x;
                    bestY = y;
                }
            }
        }

        // Yüz merkezini yüzde olarak hesapla
        return {
            x: (bestX / width) * 100,
            y: (bestY / height) * 100
        };
    }

    /**
     * Yüz skoru hesaplama (kontrast ve parlaklık analizi)
     */
    calculateFaceScore(imageData, centerX, centerY, width, height) {
        const radius = Math.min(width, height) * 0.15; // Yüz yaklaşık boyutu
        let totalBrightness = 0;
        let totalContrast = 0;
        let pixelCount = 0;

        const startX = Math.max(0, Math.floor(centerX - radius));
        const endX = Math.min(width, Math.floor(centerX + radius));
        const startY = Math.max(0, Math.floor(centerY - radius));
        const endY = Math.min(height, Math.floor(centerY + radius));

        for (let y = startY; y < endY; y += 2) {
            for (let x = startX; x < endX; x += 2) {
                const idx = (y * width + x) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];

                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                pixelCount++;
            }
        }

        if (pixelCount === 0) return 0;

        const avgBrightness = totalBrightness / pixelCount;

        // Yüz bölgesi genellikle orta parlaklıkta ve yüksek kontrastta
        // Çok koyu veya çok açık bölgeler yüz değildir
        const brightnessScore = 1 - Math.abs(avgBrightness - 128) / 128;

        return brightnessScore;
    }

    /**
     * Heuristik pozisyon hesaplama (hızlı, yüz algılama olmadan)
     * Fotoğrafın en-boy oranına göre yüz tahmini
     */
    calculateHeuristicPosition(imgElement, containerSize) {
        if (!imgElement.naturalWidth || !imgElement.naturalHeight) {
            return { x: 50, y: 35 }; // Varsayılan: yüz üst-orta
        }

        const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;

        // Portre fotoğraflar için (dikey) - yüz genellikle üst 1/3'te
        if (aspectRatio < 0.8) {
            return { x: 50, y: 25 }; // Daha yukarı odaklan
        }
        // Yatay fotoğraflar için - yüz genellikle merkezde
        else if (aspectRatio > 1.2) {
            return { x: 50, y: 35 }; // Üst-orta
        }
        // Kare fotoğraflar için - yüz genellikle üst-orta
        else {
            return { x: 50, y: 30 };
        }
    }

    /**
     * CSS ile yüze odaklanma uygula
     * SADECE object-position kullanır, transform/scale YOK
     */
    applyFocus(imgElement, position, containerSize) {
        if (!imgElement || !position) return;

        // Y ekseni offset - yüzü yukarı kaydır (yüzün ortaya gelmesi için)
        const yOffsets = {
            'large': -8,
            'medium': -10,
            'duty': -12,
            'star': -10,
            'small': -12
        };

        const yOffset = yOffsets[containerSize] || -10;

        // Yüz pozisyonunu ayarla
        const adjustedY = Math.max(20, Math.min(45, position.y + yOffset));
        const adjustedX = Math.max(40, Math.min(60, position.x)); // Yatayda sınırla

        // object-position CSS değeri
        const objectPosition = `${adjustedX}% ${adjustedY}%`;

        // CSS uygula - SADECE object-position, transform YOK
        imgElement.style.objectFit = 'cover';
        imgElement.style.objectPosition = objectPosition;

        // Data attribute ile işaretle
        imgElement.setAttribute('data-face-focused', 'true');
        imgElement.setAttribute('data-focus-x', adjustedX);
        imgElement.setAttribute('data-focus-y', adjustedY);
    }

    /**
     * Tüm görselleri işle
     */
    processAllImages() {
        const images = document.querySelectorAll('.student-avatar-large, .student-avatar-small, .star-avatar');

        images.forEach((img, index) => {
            if (!img.src || img.src.includes('data:')) return;

            // Container boyutunu belirle
            let containerSize = 'small';
            if (img.classList.contains('student-avatar-large')) {
                containerSize = 'large';
            } else if (img.classList.contains('star-avatar')) {
                containerSize = 'star';
            }

            // Kısa gecikme ile sırayla işle (performans için)
            setTimeout(() => {
                this.focusFace(img, img.src, containerSize);
            }, index * 50);
        });
    }

    /**
     * Cache'i temizle
     */
    clearCache() {
        this.faceCache.clear();
    }

    /**
     * Cache'i localStorage'a kaydet
     */
    saveCache() {
        try {
            const cacheData = Array.from(this.faceCache.entries());
            localStorage.setItem('faceFocusCache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Could not save face focus cache:', error);
        }
    }

    /**
     * Cache'i localStorage'dan yükle
     */
    loadCache() {
        try {
            const cacheData = localStorage.getItem('faceFocusCache');
            if (cacheData) {
                const entries = JSON.parse(cacheData);
                this.faceCache = new Map(entries);
            }
        } catch (error) {
            console.warn('Could not load face focus cache:', error);
        }
    }
}

// Global instance
const faceFocusEngine = new FaceFocusEngine();

// Sayfa yüklendiğinde cache'i yükle
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        faceFocusEngine.loadCache();
    });

    // Sayfa kapanmadan önce cache'i kaydet
    window.addEventListener('beforeunload', () => {
        faceFocusEngine.saveCache();
    });
}

// Export
if (typeof window !== 'undefined') {
    window.FaceFocusEngine = FaceFocusEngine;
    window.faceFocusEngine = faceFocusEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FaceFocusEngine, faceFocusEngine };
}

