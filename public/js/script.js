// ===========================================
// KIOSK MODE - Tam Ekran & Etkileşim Engellemeleri
// ===========================================

// Tam ekran fonksiyonu
function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    }
}

// Tam ekrandan çıkışı engelle
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        // Tam ekrandan çıkıldıysa, tekrar tam ekrana geç
        setTimeout(enterFullscreen, 100);
    }
});

// Sayfa yüklendiğinde tam ekran ol (kullanıcı etkileşimi ile)
document.addEventListener('click', function firstClick() {
    enterFullscreen();
    document.removeEventListener('click', firstClick);
}, { once: true });

// ESC tuşunu engelle
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
});

// Sağ tık menüsünü engelle
document.addEventListener('contextmenu', e => e.preventDefault());

// Klavye kısayollarını engelle (F5, Ctrl+R, Ctrl+Shift+I, vb.)
document.addEventListener('keydown', e => {
    // F1-F12 tuşlarını engelle
    // F1-F12 tuşlarını engelle (Ctrl+F5 HARİÇ)
    if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) {
        // Eğer Ctrl+F5 ise izin ver (Reload)
        if (e.ctrlKey && e.key === 'F5') {
            return;
        }
        e.preventDefault();
    }
    // Ctrl kombinasyonlarını engelle
    if (e.ctrlKey && ['r', 'u', 's', 'p', 'f', 'g', 'h', 'j', 'k', 'l'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
    // Ctrl+Shift kombinasyonlarını engelle (DevTools)
    if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
    }
});

// Çift tıklamayı engelle (zoom yapmasın)
document.addEventListener('dblclick', e => e.preventDefault());

// ===========================================
// UYGULAMA BAŞLANGICI
// ===========================================

// Schedule cache
let scheduleData = [];
let currentSlideIndex = 0;

// AKILLI VERİ KARŞILAŞTIRMA SİSTEMİ - gereksiz DOM güncellemelerini önler
let lastDataHash = {
    roles: null,
    settings: null
};

// Veri hash'leme fonksiyonu
function hashData(data) {
    return JSON.stringify(data);
}

// Veri değişti mi kontrol et
function hasDataChanged(key, newData) {
    const newHash = hashData(newData);
    if (lastDataHash[key] === newHash) {
        return false; // Veri değişmemiş
    }
    lastDataHash[key] = newHash;
    return true; // Veri değişmiş
}

async function fetchData() {
    try {
        // Roles
        const roles = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/roles`);

        if (!roles || !Array.isArray(roles)) {
            if (typeof logger !== 'undefined') {
                logger.warn(COMPONENTS.DASHBOARD, 'No roles data or invalid format');
            }
            return;
        }

        // AKILLI KONTROL: Roles verisi değişmediyse DOM'u güncelleme
        if (!hasDataChanged('roles', roles)) {
            // Data unchanged, skipping DOM update
            // Sadece settings ve stats güncelle
            const settings = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/settings`);
            updateStats();
            return;
        }

        const president = roles.find(r => r.role_type === 'president');
        const vicePresidents = roles.filter(r => r.role_type === 'vice_president').slice(0, 2);
        const duties = roles.filter(r => r.role_type === 'duty');
        const stars = roles.filter(r => r.role_type === 'star');

        // Roles fetched and processed

        // Render President (1 başkan + 2 yardımcı)
        const presidentContainer = document.getElementById('president-container');
        if (!presidentContainer) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.DASHBOARD, 'president-container element not found');
            }
        } else {
            let html = '';

            // Başkan (büyük)
            if (president) {
                const avatarPath = Utils.getAvatarPath(president);
                const imgId = `president-img-${president.id}`;
                html += `
                    <div class="president-main">
                        <img id="${imgId}" src="${avatarPath}" class="president-avatar-large" onerror="this.onerror=null; this.src='${CONFIG.DEFAULT_AVATAR_BOY}'">
                        <div class="president-name-large">${president.name || '---'}</div>
                    </div>
                `;
            }

            // Yardımcılar (2 kişi, orta boy)
            if (vicePresidents.length > 0) {
                html += '<div class="vice-presidents-container">';
                vicePresidents.forEach((vp, index) => {
                    const avatarPath = Utils.getAvatarPath(vp);
                    const defaultAvatar = vp.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
                    const imgId = `vice-president-img-${vp.id}-${index}`;
                    html += `
                        <div class="vice-president-item">
                            <img id="${imgId}" src="${avatarPath}" class="vice-president-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                            <div class="vice-president-name">${vp.name || '---'}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }

            if (!president && vicePresidents.length === 0) {
                html = '<div class="student-name-large">---</div>';
            }

            presidentContainer.innerHTML = html;

            // Yüz odaklama uygula
            intervalManager.setTimeout(() => {
                if (president) {
                    const imgId = `president-img-${president.id}`;
                    const img = document.getElementById(imgId);
                    if (img && typeof faceFocusEngine !== 'undefined') {
                        faceFocusEngine.focusFace(img, Utils.getAvatarPath(president), 'large');
                    }
                }
                vicePresidents.forEach((vp, index) => {
                    const imgId = `vice-president-img-${vp.id}-${index}`;
                    const img = document.getElementById(imgId);
                    if (img && typeof faceFocusEngine !== 'undefined') {
                        faceFocusEngine.focusFace(img, Utils.getAvatarPath(vp), 'medium');
                    }
                });
            }, 100);
        }

        // Render Duty Students (4 kişi, büyük)
        const dutyContainer = document.getElementById('duty-container');
        if (!dutyContainer) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.DASHBOARD, 'duty-container element not found');
            }
        } else if (duties.length > 0) {
            dutyContainer.innerHTML = duties.slice(0, 4).map((d, index) => {
                const avatarPath = Utils.getAvatarPath(d);
                const defaultAvatar = d.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
                const imgId = `duty-img-${d.id}-${index}`;
                const nameId = `duty-name-${d.id}-${index}`;
                return `
                <div class="duty-item">
                    <img id="${imgId}" src="${avatarPath}" class="duty-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    <div class="duty-name" id="${nameId}"></div>
                </div>
            `;
            }).join('');
            // Set names safely
            duties.slice(0, 4).forEach((d, index) => {
                const nameId = `duty-name-${d.id}-${index}`;
                const nameEl = document.getElementById(nameId);
                if (nameEl) {
                    nameEl.textContent = d.name || '---';
                }
            });
            // Yüz odaklama uygula
            intervalManager.setTimeout(() => {
                duties.slice(0, 4).forEach((d, index) => {
                    const imgId = `duty-img-${d.id}-${index}`;
                    const img = document.getElementById(imgId);
                    if (img && typeof faceFocusEngine !== 'undefined') {
                        faceFocusEngine.focusFace(img, Utils.getAvatarPath(d), 'duty');
                    }
                });
            }, 100);
        } else {
            dutyContainer.innerHTML = '<div class="duty-name">---</div>';
        }

        // Render Stars - SLIDESHOW SİSTEMİ
        const starsContainer = document.getElementById('stars-container');
        if (!starsContainer) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.DASHBOARD, 'stars-container element not found');
            }
        } else if (stars.length > 0) {
            // Slideshow için slides oluştur
            let slidesHtml = stars.map((s, index) => {
                const avatarPath = Utils.getAvatarPath(s);
                const defaultAvatar = s.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
                const isActive = index === 0 ? 'active' : '';
                return `
                <div class="star-slide ${isActive}" data-index="${index}">
                    <img src="${avatarPath}" class="star-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    <div class="star-name">${s.name || '---'}</div>
                </div>
            `;
            }).join('');

            // Dots (sayaç) ekle
            if (stars.length > 1) {
                slidesHtml += '<div class="star-dots">';
                stars.forEach((_, index) => {
                    const isActive = index === 0 ? 'active' : '';
                    slidesHtml += `<div class="star-dot ${isActive}" data-index="${index}"></div>`;
                });
                slidesHtml += '</div>';
            }

            starsContainer.innerHTML = slidesHtml;

            // Slideshow'u başlat
            initStarSlideshow(stars.length);
        } else {
            // Yıldız yok durumu
            starsContainer.innerHTML = `
                <div class="no-stars-message">
                    <div class="no-stars-icon">⭐</div>
                    <div class="no-stars-text">Bu hafta henüz<br>yıldız belirlenmedi</div>
                </div>
            `;
        }

        // Settings
        const settings = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/settings`);

        // Stats
        updateStats();

        // Fetch Schedule
        const schedule = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/schedule`);
        if (schedule) {
            scheduleData = schedule;
        }

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}



let slidesData = [];
let slideshowInterval = null;
let currentVideoElement = null;
let activeTimeouts = new Set(); // Track all active timeouts for cleanup
let clockInterval = null; // Track clock update interval
let dataRefreshInterval = null; // Track data refresh interval
let isTransitioning = false; // Mutex flag to prevent race conditions

// STAR SLIDESHOW SİSTEMİ
let starSlideInterval = null;
let currentStarIndex = 0;
let lastStarTransition = '';  // Son kullanılan efekti takip et
const STAR_SLIDE_DURATION = 4000; // 4 saniye her yıldız
const STAR_TRANSITIONS = [
    'transition-fade',
    'transition-slide-right',
    'transition-slide-left',
    'transition-scale',
    'transition-rotate',
    'transition-flip',
    'transition-zoom-blur'
];

function initStarSlideshow(totalSlides) {
    // Önceki interval'i temizle
    if (starSlideInterval) {
        clearInterval(starSlideInterval);
        starSlideInterval = null;
    }

    // Tek slide varsa geçiş yapma
    if (totalSlides <= 1) {
        return;
    }

    currentStarIndex = 0;
    lastStarTransition = '';

    starSlideInterval = intervalManager.setInterval(() => {
        nextStarSlide(totalSlides);
    }, STAR_SLIDE_DURATION);
}

// Rastgele ama her seferinde FARKLI efekt seç
function getRandomTransition() {
    let availableTransitions = STAR_TRANSITIONS.filter(t => t !== lastStarTransition);
    const randomIndex = Math.floor(Math.random() * availableTransitions.length);
    const selected = availableTransitions[randomIndex];
    lastStarTransition = selected;
    return selected;
}

function nextStarSlide(totalSlides) {
    const slides = document.querySelectorAll('.star-slide');
    const dots = document.querySelectorAll('.star-dot');

    if (slides.length === 0) return;

    // Her seferinde FARKLI geçiş efekti
    const randomTransition = getRandomTransition();

    // Mevcut slide'ı gizle
    const currentSlide = slides[currentStarIndex];
    if (currentSlide) {
        currentSlide.classList.remove('active');
        currentSlide.classList.remove(...STAR_TRANSITIONS);
        currentSlide.classList.add('exit');
    }

    // Dot'u güncelle
    if (dots[currentStarIndex]) {
        dots[currentStarIndex].classList.remove('active');
    }

    // Sonraki slide'a geç
    currentStarIndex = (currentStarIndex + 1) % totalSlides;

    // Yeni slide'ı göster
    const nextSlide = slides[currentStarIndex];
    if (nextSlide) {
        // Önce tüm class'ları temizle
        nextSlide.classList.remove('exit', ...STAR_TRANSITIONS);
        // Yeni transition ekle
        nextSlide.classList.add(randomTransition);
        // Active yap
        requestAnimationFrame(() => {
            nextSlide.classList.add('active');
        });
    }

    // Yeni dot'u aktif yap
    if (dots[currentStarIndex]) {
        dots[currentStarIndex].classList.add('active');
    }
}

async function initSlideshow() {
    const container = document.getElementById('slideshow-container');

    if (!container) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SLIDESHOW, 'Slideshow container not found', null, {
                containerId: 'slideshow-container'
            });
        }
        return;
    }

    try {
        if (typeof logger !== 'undefined') {
            logger.debug(COMPONENTS.SLIDESHOW, 'Initializing slideshow', null, {
                apiUrl: `${CONFIG.API_URL}/slides`
            });
        }

        // Fetch slides from API (AI optimized)
        const response = await fetch(`${CONFIG.API_URL}/slides/active`);

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            const error = new Error(errorMessage);
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.SLIDESHOW, 'Failed to fetch slides from API', error, {
                    status: response.status,
                    statusText: response.statusText
                });
            }
            throw error;
        }
        const data = await response.json();
        slidesData = data;

        if (typeof logger !== 'undefined') {
            logger.info(COMPONENTS.SLIDESHOW, 'Slides fetched successfully', null, {
                slideCount: slidesData.length
            });
        }

        if (slidesData.length === 0) {
            if (typeof logger !== 'undefined') {
                logger.warn(COMPONENTS.SLIDESHOW, 'No slides found, using fallback', null);
            }
            // Fallback to default tribute slide if no slides
            container.innerHTML = `
                <div class="slide tribute-slide active">
                    <img src="assets/tribute.png" alt="Atatürk">
                    <div class="tribute-text">
                        <h2>"Vatanını en çok seven, görevini en iyi yapandır."</h2>
                        <p>- Mustafa Kemal Atatürk</p>
                    </div>
                </div>
            `;
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create slide elements
        slidesData.forEach((slide, index) => {
            try {
                const slideElement = createSlideElement(slide, index === 0);
                container.appendChild(slideElement);
            } catch (err) {
                if (typeof logger !== 'undefined') {
                    logger.error(COMPONENTS.SLIDESHOW, 'Error creating slide element', err, {
                        slideId: slide.id,
                        slideIndex: index,
                        mediaType: slide.media_type,
                        mediaPath: slide.media_path
                    });
                }
            }
        });

        if (typeof logger !== 'undefined') {
            logger.debug(COMPONENTS.SLIDESHOW, 'All slide elements created', null, {
                totalSlides: slidesData.length
            });
        }

        // Start slideshow
        startSlideshow();
    } catch (error) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SLIDESHOW, 'Error initializing slideshow', error, {
                errorName: error.name,
                errorMessage: error.message
            });
        }
        // Fallback
        container.innerHTML = `
            <div class="slide tribute-slide active">
                <img src="assets/tribute.png" alt="Atatürk">
                <div class="tribute-text">
                    <h2>"Vatanını en çok seven, görevini en iyi yapandır."</h2>
                    <p>- Mustafa Kemal Atatürk</p>
                </div>
            </div>
        `;
    }
}

function createSlideElement(slide, isActive = false) {
    const slideDiv = document.createElement('div');
    slideDiv.className = `slide ${isActive ? 'active' : ''}`;
    slideDiv.dataset.slideId = slide.id;
    slideDiv.dataset.mediaType = slide.media_type;
    slideDiv.dataset.contentType = slide.content_type;

    // Maximize media to fit container
    slideDiv.style.position = 'absolute';
    slideDiv.style.top = '0';
    slideDiv.style.left = '0';
    slideDiv.style.width = '100%';
    slideDiv.style.height = '100%';
    slideDiv.style.overflow = 'hidden';
    slideDiv.style.display = isActive ? 'block' : 'none';

    if (slide.media_type === 'video') {
        const video = document.createElement('video');
        video.src = slide.media_path;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.objectPosition = 'center';
        video.controls = false;
        video.autoplay = isActive;
        video.loop = false;
        video.muted = true; // Muted for autoplay

        // Store reference for cleanup
        video.dataset.slideId = slide.id;

        // Handle video end
        const videoEndHandler = () => {
            if (slide.video_auto_advance === 1) {
                nextSlide();
            }
        };
        video.addEventListener('ended', videoEndHandler);

        // Store handler for cleanup
        video._endHandler = videoEndHandler;

        // Handle video errors
        video.onerror = function () {
            const error = new Error('Video playback error');
            logger.error(COMPONENTS.MEDIA, 'Video playback failed', error, {
                slideId: slide.id,
                mediaPath: slide.media_path,
                mediaType: slide.media_type,
                videoError: video.error ? {
                    code: video.error.code,
                    message: video.error.message
                } : null
            });
            // Auto-advance on error after a delay
            intervalManager.setTimeout(() => {
                if (slide.video_auto_advance === 1) {
                    nextSlide();
                }
            }, 2000);
        };

        slideDiv.appendChild(video);
        if (isActive) {
            currentVideoElement = video;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    logger.error(COMPONENTS.MEDIA, 'Video play() rejected', e, {
                        slideId: slide.id,
                        mediaPath: slide.media_path
                    });
                });
            }
        }
    } else {
        // Image or GIF
        const img = document.createElement('img');
        img.src = slide.media_path;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
        img.alt = slide.title || 'Slide';
        img.onerror = function () {
            const error = new Error('Image load failed');
            logger.error(COMPONENTS.MEDIA, 'Image load failed', error, {
                slideId: slide.id,
                mediaPath: slide.media_path,
                mediaType: slide.media_type
            });
            this.style.display = 'none';
        };
        slideDiv.appendChild(img);
    }

    // Add text content if exists
    if (slide.text_content) {
        const textDiv = document.createElement('div');
        textDiv.className = 'slide-text-content';
        textDiv.style.position = 'absolute';
        textDiv.style.bottom = '20px';
        textDiv.style.left = '50%';
        textDiv.style.transform = 'translateX(-50%)';
        textDiv.style.background = 'rgba(0,0,0,0.85)';
        textDiv.style.padding = '20px 35px';
        textDiv.style.borderRadius = '15px';
        textDiv.style.fontSize = '2rem';
        textDiv.style.textAlign = 'center';
        textDiv.style.maxWidth = '90%';
        textDiv.style.fontWeight = '700';
        textDiv.style.lineHeight = '1.4';
        textDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        textDiv.style.opacity = '0'; // Start hidden, will be animated in

        // Rainbow color palette
        const rainbowColors = [
            '#FF6B6B', // Red
            '#FF8E53', // Orange
            '#FFD93D', // Yellow
            '#6BCF7F', // Green
            '#4D96FF', // Blue
            '#9B59B6'  // Purple
        ];

        // Split text into words and create colored spans
        const words = slide.text_content.trim().split(/\s+/);
        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word-animated';
            wordSpan.textContent = word;
            wordSpan.style.color = rainbowColors[index % rainbowColors.length];
            wordSpan.style.display = 'inline-block';
            wordSpan.style.marginRight = '8px';
            wordSpan.style.opacity = '0'; // Start hidden for typewriter effect
            wordSpan.style.transition = 'opacity 0.3s ease-in';
            textDiv.appendChild(wordSpan);
        });

        slideDiv.appendChild(textDiv);
    }

    return slideDiv;
}

function startSlideshow() {
    if (slidesData.length === 0) {
        logger.warn(COMPONENTS.SLIDESHOW, 'Cannot start slideshow: no slides', null);
        return;
    }

    currentSlideIndex = 0;

    logger.debug(COMPONENTS.SLIDESHOW, 'Starting slideshow', null, {
        totalSlides: slidesData.length,
        firstSlideId: slidesData[0].id
    });

    // Show first slide
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        slides[0].style.display = 'block';
        slides[0].classList.add('active');

        // Play video if first slide is video
        const firstVideo = slides[0].querySelector('video');
        if (firstVideo) {
            currentVideoElement = firstVideo;
            const playPromise = firstVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    logger.error(COMPONENTS.MEDIA, 'First video play() rejected', e, {
                        slideId: slidesData[0].id
                    });
                });
            }
        }

        // Animate in first slide's text (if exists) with typewriter effect
        const firstTextDiv = slides[0].querySelector('.slide-text-content');
        if (firstTextDiv) {
            // Wait a bit for image to appear first
            intervalManager.setTimeout(() => {
                firstTextDiv.style.opacity = '1'; // Make container visible
                firstTextDiv.classList.add('fade-in', 'typewriter-active');
                const firstWords = firstTextDiv.querySelectorAll('.word-animated');
                firstWords.forEach((word, index) => {
                    intervalManager.setTimeout(() => {
                        word.style.opacity = '1';
                    }, index * 150); // 150ms delay between each word
                });
            }, 500); // 500ms delay after image appears
        }
    } else {
        logger.error(COMPONENTS.SLIDESHOW, 'No slide elements found in DOM', null, {
            expectedCount: slidesData.length
        });
    }

    // Start rotation
    scheduleNextSlide();
}

function scheduleNextSlide() {
    if (slidesData.length === 0) return;

    // Don't schedule if already transitioning
    if (isTransitioning) {
        logger.debug(COMPONENTS.SLIDESHOW, 'Skipping schedule: transition in progress', null);
        return;
    }

    if (!slidesData || slidesData.length === 0 || currentSlideIndex >= slidesData.length || currentSlideIndex < 0) {
        logger.warn(COMPONENTS.SLIDESHOW, 'Invalid slide index for scheduling', null, {
            currentIndex: currentSlideIndex,
            slidesDataLength: slidesData?.length || 0
        });
        currentSlideIndex = 0;
        return;
    }

    const currentSlide = slidesData[currentSlideIndex];
    if (!currentSlide) {
        logger.error(COMPONENTS.SLIDESHOW, 'Invalid slide data for scheduling', null, {
            currentIndex: currentSlideIndex
        });
        currentSlideIndex = 0;
        return;
    }

    const duration = currentSlide.display_duration || CONFIG.SLIDE_DURATION;

    // Clear existing interval
    if (slideshowInterval) {
        clearTimeout(slideshowInterval);
        slideshowInterval = null;
    }

    // Schedule next slide
    slideshowInterval = intervalManager.setTimeout(() => {
        slideshowInterval = null;
        nextSlide();
    }, duration);
}

function nextSlide() {
    // Prevent concurrent transitions (race condition protection)
    if (isTransitioning) {
        logger.debug(COMPONENTS.SLIDESHOW, 'Skipping nextSlide: transition already in progress', null);
        return;
    }

    if (!slidesData || slidesData.length === 0) {
        logger.warn(COMPONENTS.SLIDESHOW, 'Cannot advance: no slides', null);
        return;
    }

    if (currentSlideIndex >= slidesData.length || currentSlideIndex < 0) {
        currentSlideIndex = 0;
    }

    // Set transition flag
    isTransitioning = true;

    const currentSlide = slidesData[currentSlideIndex];
    if (!currentSlide || !currentSlide.id) {
        logger.error(COMPONENTS.SLIDESHOW, 'Invalid current slide', null, {
            currentIndex: currentSlideIndex,
            slidesDataLength: slidesData.length
        });
        currentSlideIndex = 0;
        scheduleNextSlide();
        return;
    }

    const startTime = performance.now();
    const currentSlideId = currentSlide.id;
    const currentSlideElement = document.querySelector(`.slide[data-slide-id="${currentSlideId}"]`);
    const nextIndex = (currentSlideIndex + 1) % slidesData.length;
    const nextSlide = slidesData[nextIndex];

    if (!nextSlide || !nextSlide.id) {
        logger.error(COMPONENTS.SLIDESHOW, 'Invalid next slide', null, {
            nextIndex,
            slidesDataLength: slidesData.length
        });
        currentSlideIndex = 0;
        scheduleNextSlide();
        return;
    }

    const nextSlideId = nextSlide.id;
    const nextSlideElement = document.querySelector(`.slide[data-slide-id="${nextSlideId}"]`);

    if (!currentSlideElement || !nextSlideElement) {
        logger.error(COMPONENTS.SLIDESHOW, 'Slide element not found', null, {
            currentSlideId,
            nextSlideId,
            currentIndex: currentSlideIndex,
            nextIndex,
            currentElementFound: !!currentSlideElement,
            nextElementFound: !!nextSlideElement
        });
        currentSlideIndex = nextIndex;
        scheduleNextSlide();
        return;
    }

    // Stop current video if playing
    if (currentVideoElement) {
        currentVideoElement.pause();
        currentVideoElement.currentTime = 0;
        currentVideoElement = null;
    }

    // Step 1: Fade out current slide's text (if exists)
    const currentTextDiv = currentSlideElement.querySelector('.slide-text-content');
    const textFadeOutDuration = 400; // 400ms for text fade out

    if (currentTextDiv) {
        currentTextDiv.classList.remove('fade-in', 'typewriter-active');
        currentTextDiv.classList.add('fade-out');

        // Hide all words immediately
        const currentWords = currentTextDiv.querySelectorAll('.word-animated');
        currentWords.forEach(word => {
            word.style.opacity = '0';
        });
    }

    // Step 2: After text fades out, do image transition
    intervalManager.setTimeout(() => {
        // Get transition type
        let transitionType = 'fade';
        let transitionDuration = 1000;

        if (typeof getSmartTransition === 'function') {
            try {
                transitionType = getSmartTransition(slidesData[currentSlideIndex], slidesData, currentSlideIndex) || 'fade';
            } catch (err) {
                logger.error(COMPONENTS.TRANSITIONS, 'Error getting smart transition', err, {
                    currentSlideId,
                    nextSlideId
                });
            }
        } else {
            logger.debug(COMPONENTS.TRANSITIONS, 'getSmartTransition not available, using fallback', null);
        }
        transitionDuration = slidesData[currentSlideIndex].transition_duration || 1000;

        logger.debug(COMPONENTS.SLIDESHOW, 'Transitioning to next slide', null, {
            fromSlideId: currentSlideId,
            toSlideId: nextSlideId,
            transitionType,
            transitionDuration
        });

        // Apply transition
        if (typeof applyTransition === 'function') {
            try {
                applyTransition(currentSlideElement, nextSlideElement, transitionType, transitionDuration);
            } catch (err) {
                logger.error(COMPONENTS.TRANSITIONS, 'Error applying transition', err, {
                    transitionType,
                    transitionDuration,
                    fromSlideId: currentSlideId,
                    toSlideId: nextSlideId
                });
                // Fallback to simple fade
                currentSlideElement.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
                nextSlideElement.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
                currentSlideElement.style.opacity = '0';
                nextSlideElement.style.opacity = '1';
            }
        } else {
            logger.debug(COMPONENTS.TRANSITIONS, 'applyTransition not available, using fallback fade', null);
            // Fallback: simple fade
            currentSlideElement.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
            nextSlideElement.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
            currentSlideElement.style.opacity = '0';
            nextSlideElement.style.opacity = '1';
        }

        // Update active state
        currentSlideElement.classList.remove('active');
        nextSlideElement.classList.add('active');

        // Show/hide slides
        intervalManager.setTimeout(() => {
            currentSlideElement.style.display = 'none';
            nextSlideElement.style.display = 'block';

            const transitionTime = performance.now() - startTime;
            logger.debug(COMPONENTS.SLIDESHOW, 'Slide transition completed', null, {
                fromSlideId: currentSlideId,
                toSlideId: nextSlideId,
                transitionTime: Math.round(transitionTime)
            });

            // Step 3: After image transition, animate in new slide's text (if exists)
            const nextTextDiv = nextSlideElement.querySelector('.slide-text-content');
            if (nextTextDiv) {
                nextTextDiv.style.opacity = '1'; // Make container visible
                nextTextDiv.classList.remove('fade-out');
                nextTextDiv.classList.add('fade-in', 'typewriter-active');

                // Animate words one by one (typewriter effect)
                const nextWords = nextSlideElement.querySelectorAll('.word-animated');
                nextWords.forEach((word, index) => {
                    intervalManager.setTimeout(() => {
                        word.style.opacity = '1';
                    }, index * 150); // 150ms delay between each word
                });
            }
        }, transitionDuration);

        // Play video if next slide is video
        const nextVideo = nextSlideElement.querySelector('video');
        if (nextVideo) {
            currentVideoElement = nextVideo;
            const playPromise = nextVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    logger.error(COMPONENTS.MEDIA, 'Next video play() rejected', e, {
                        slideId: nextSlideId
                    });
                });
            }
        }

        currentSlideIndex = nextIndex;

        // Clear transition flag after transition completes
        isTransitioning = false;

        // Schedule next slide
        scheduleNextSlide();
    }, textFadeOutDuration);
}

function rotateSlide() {
    // Legacy function - redirect to nextSlide
    nextSlide();
}

// Refresh slideshow when slides are updated
async function refreshSlideshow() {
    logger.debug(COMPONENTS.SLIDESHOW, 'Refreshing slideshow', null);

    // Reset transition flag
    isTransitioning = false;

    // Cleanup all intervals and timeouts
    if (slideshowInterval) {
        clearTimeout(slideshowInterval);
        slideshowInterval = null;
    }

    // Clear all tracked timeouts
    activeTimeouts.forEach(timeout => {
        clearTimeout(timeout);
    });
    activeTimeouts.clear();

    // Cleanup all video elements
    const allVideos = document.querySelectorAll('.slide video');
    allVideos.forEach(video => {
        if (video._endHandler) {
            video.removeEventListener('ended', video._endHandler);
            video._endHandler = null;
        }
        video.pause();
        video.currentTime = 0;
        // Remove error handlers
        video.onerror = null;
    });

    if (currentVideoElement) {
        if (currentVideoElement._endHandler) {
            currentVideoElement.removeEventListener('ended', currentVideoElement._endHandler);
            currentVideoElement._endHandler = null;
        }
        currentVideoElement.pause();
        currentVideoElement.currentTime = 0;
        currentVideoElement.onerror = null;
        currentVideoElement = null;
    }

    try {
        await initSlideshow();
        logger.debug(COMPONENTS.SLIDESHOW, 'Slideshow refreshed successfully', null);
    } catch (err) {
        logger.error(COMPONENTS.SLIDESHOW, 'Error refreshing slideshow', err);
    }
}

// Auto-refresh slideshow every 30 seconds to pick up new slides
let refreshInterval = null;

// Cleanup function for all intervals and timeouts - Now using intervalManager
function cleanupAllIntervals() {
    // Use interval manager's cleanup - it handles everything
    if (typeof intervalManager !== 'undefined') {
        intervalManager.cleanup();
    }

    // Legacy cleanup for any remaining items
    if (slideshowInterval) {
        clearTimeout(slideshowInterval);
        slideshowInterval = null;
    }
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
    }
    if (starSlideInterval) {
        clearInterval(starSlideInterval);
        starSlideInterval = null;
    }

    // Stop current video if any
    if (currentVideoElement) {
        try {
            currentVideoElement.pause();
            currentVideoElement.currentTime = 0;
            currentVideoElement = null;
        } catch (e) {
            // Ignore errors when cleaning up video
        }
    }
    // Cleanup all video elements (non-current)
    const allVideos = document.querySelectorAll('.slide video');
    allVideos.forEach(video => {
        if (video._endHandler) {
            video.removeEventListener('ended', video._endHandler);
            video._endHandler = null;
        }
        video.pause();
        video.currentTime = 0;
        video.onerror = null;
    });
}

// Initialize refresh interval
if (typeof window !== 'undefined') {
    refreshInterval = intervalManager.setInterval(refreshSlideshow, 30000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupAllIntervals);
    window.addEventListener('pagehide', cleanupAllIntervals);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerHTML = `${hours}<span class="blink">:</span>${minutes}`;

    const dayName = now.toLocaleDateString('tr-TR', { weekday: 'long' });
    const fullDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Check if new elements exist (for backward compatibility if needed)
    const dayNameEl = document.getElementById('day-name');
    const dateEl = document.getElementById('date');

    if (dayNameEl) dayNameEl.textContent = dayName;
    if (dateEl) dateEl.textContent = fullDate;

    updateCountdown(now);

    // Weekend Countdown Logic
    const weekendCounter = document.getElementById('weekend-counter');
    if (weekendCounter) {
        const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        let daysLeft = 6 - day; // Days until Saturday

        // Adjust for Sunday (0) to show 6 days left (for next Saturday)
        // Or if it's weekend (6 or 0), show "Enjoy!"

        if (day === 6 || day === 0) {
            weekendCounter.textContent = 'İYİ TATİLLER!';
            weekendCounter.style.color = '#00b894'; // Green for success
        } else {
            // For weekdays (1-5)
            weekendCounter.textContent = `${daysLeft} GÜN KALDI`;
            weekendCounter.style.color = '#e17055'; // Orange for countdown
        }
    }
}

function updateCountdown(now) {
    // Use the new schedule manager module
    if (!window.ScheduleManager) {
        logger.error(COMPONENTS.SYSTEM, 'ScheduleManager not loaded', null);
        return;
    }

    const status = window.ScheduleManager.getScheduleStatus(now);
    const countdownMode = document.getElementById('countdown-mode');
    const goodbyeMode = document.getElementById('goodbye-mode');
    const beforeSchoolMode = document.getElementById('before-school-mode');

    // Hide all modes first
    countdownMode.style.display = 'none';
    goodbyeMode.style.display = 'none';
    if (beforeSchoolMode) beforeSchoolMode.style.display = 'none';

    // Handle different modes
    switch (status.mode) {
        case 'weekend':
            // Show goodbye mode with weekend styling
            goodbyeMode.style.display = 'flex';
            goodbyeMode.classList.remove('monday', 'tuesday', 'wednesday', 'thursday', 'friday');
            goodbyeMode.classList.add('weekend');

            const weekendVisual = document.getElementById('goodbye-visual');
            if (status.iconId) {
                weekendVisual.innerHTML = `
                    <svg class="icon-3d-large" style="width: 140px; height: 140px; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25));">
                        <use href="#${status.iconId}"></use>
                    </svg>`;
            } else if (status.image) {
                weekendVisual.innerHTML = `<img src="${status.image}" class="icon-3d-large" alt="Weekend" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));">`;
            } else {
                weekendVisual.textContent = status.icon;
            }

            document.getElementById('goodbye-title').textContent = status.message;
            document.getElementById('goodbye-subtitle').textContent = status.subtitle;

            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'before-school':
            // Show before school mode with countdown
            if (beforeSchoolMode) {
                beforeSchoolMode.style.display = 'flex';
                // Update visual if needed
                const clockVisual = beforeSchoolMode.querySelector('.clock-visual');
                if (clockVisual && status.iconId) {
                    clockVisual.innerHTML = `
                        <svg class="clock-icon" viewBox="0 0 24 24" style="width: 100%; height: 100%; color: var(--primary); filter: drop-shadow(0 4px 8px rgba(108, 92, 231, 0.3));">
                             <use href="#${status.iconId}"></use>
                        </svg>`;
                }

                const countdownEl = beforeSchoolMode.querySelector('#before-school-countdown');
                const subtitleEl = beforeSchoolMode.querySelector('#before-school-subtitle');
                if (countdownEl) countdownEl.textContent = status.countdown;
                if (subtitleEl) subtitleEl.textContent = status.subtitle;
            } else {
                // Fallback to countdown mode if before-school-mode doesn't exist
                countdownMode.style.display = 'flex';
                const titleEl = countdownMode.querySelector('h3');
                if (titleEl) titleEl.textContent = status.message;
                document.getElementById('countdown').textContent = status.countdown;
                document.getElementById('countdown-bar').style.width = '0%';
            }
            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'after-school':
            // Show goodbye mode
            goodbyeMode.style.display = 'flex';
            goodbyeMode.classList.remove('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend');

            const dayIndex = now.getDay();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            if (dayIndex >= 1 && dayIndex <= 5) {
                goodbyeMode.classList.add(dayNames[dayIndex]);
            }

            const afterSchoolVisual = document.getElementById('goodbye-visual');
            if (status.iconId) {
                afterSchoolVisual.innerHTML = `
                    <svg class="icon-3d-large" style="width: 140px; height: 140px; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25));">
                        <use href="#${status.iconId}"></use>
                    </svg>`;
            } else if (status.image) {
                afterSchoolVisual.innerHTML = `<img src="${status.image}" class="icon-3d-large" alt="Goodbye" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));">`;
            } else {
                afterSchoolVisual.textContent = status.icon;
            }

            document.getElementById('goodbye-title').textContent = status.message;
            document.getElementById('goodbye-subtitle').textContent = status.subtitle;

            // Trigger Confetti on Friday
            if (dayIndex === 5 && window.startConfetti) {
                window.startConfetti();
            } else if (window.stopConfetti) {
                window.stopConfetti();
            }
            break;

        case 'in-class':
        case 'in-break':
            // Show countdown mode
            countdownMode.style.display = 'flex';
            const titleEl = countdownMode.querySelector('h3');
            if (titleEl) titleEl.textContent = status.message;

            const subtitleEl = countdownMode.querySelector('.countdown-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = status.subtitle;
            } else {
                // Create subtitle if it doesn't exist
                const h3 = countdownMode.querySelector('h3');
                if (h3 && !h3.nextElementSibling || h3.nextElementSibling.className !== 'countdown-subtitle') {
                    const newSubtitle = document.createElement('div');
                    newSubtitle.className = 'countdown-subtitle';
                    newSubtitle.textContent = status.subtitle;
                    h3.insertAdjacentElement('afterend', newSubtitle);
                }
            }

            document.getElementById('countdown').textContent = status.countdown;
            document.getElementById('countdown-bar').style.width = `${status.progress}%`;

            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'error':
            // Show error state
            countdownMode.style.display = 'flex';
            const errorTitleEl = countdownMode.querySelector('h3');
            if (errorTitleEl) errorTitleEl.textContent = status.message;
            document.getElementById('countdown').textContent = status.countdown;
            document.getElementById('countdown-bar').style.width = '0%';
            if (window.stopConfetti) window.stopConfetti();
            break;

        default:
            logger.warn(COMPONENTS.SYSTEM, 'Unknown schedule status mode', null, { mode: status.mode });
            countdownMode.style.display = 'flex';
            document.getElementById('countdown').textContent = '--:--';
            document.getElementById('countdown-bar').style.width = '0%';
    }
}

async function updateStats() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/stats`);
        const stats = await res.json();

        document.getElementById('total-students').textContent = stats.total || 0;
        document.getElementById('girl-students').textContent = stats.girls || 0;
        document.getElementById('boy-students').textContent = stats.boys || 0;

        // Today's attendance
        const todayPresent = stats.todayPresent || 0;
        const todayAbsent = stats.todayAbsent || 0;
        const absentStudents = stats.absentStudents || [];
        const todayTotal = todayPresent + todayAbsent;

        if (todayTotal > 0) {
            document.getElementById('today-attendance').innerHTML =
                `<span style="color: #00b894;">${todayPresent} VAR</span> / <span style="color: #d63031;">${todayAbsent} YOK</span>`;
        } else {
            document.getElementById('today-attendance').textContent = 'Yoklama Bekleniyor';
        }

        const attendanceBox = document.getElementById('attendance-stat');
        if (attendanceBox) attendanceBox.style.display = 'flex';

        // Handle Absent Marquee
        const absentContainer = document.getElementById('absent-container');
        const absentList = document.getElementById('absent-list');

        if (absentContainer && absentList) {
            if (absentStudents.length > 0) {
                absentContainer.style.display = 'flex';
                // Create marquee items with avatars
                const marqueeHtml = absentStudents.map(student => {
                    const avatarPath = Utils.getAvatarPath(student);
                    const defaultAvatar = student.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
                    return `
                        <span class="marquee-item">
                            <img src="${avatarPath}" class="marquee-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                            ${student.name}
                        </span>
                    `;
                }).join('');

                // Repeat content to ensure it fills the width for scrolling
                absentList.innerHTML = marqueeHtml + marqueeHtml + marqueeHtml;
            } else {
                absentContainer.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Stats error', e);
        document.getElementById('total-students').textContent = '--';
        document.getElementById('girl-students').textContent = '--';
        document.getElementById('boy-students').textContent = '--';
        document.getElementById('today-attendance').textContent = '--';
    }
}

// Global error handlers for client-side
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SYSTEM, 'Unhandled error', event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        } else {
            console.error('Unhandled error:', event.error || event.message);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SYSTEM, 'Unhandled Promise Rejection', event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
                promise: String(event.promise)
            });
        } else {
            console.error('Unhandled promise rejection:', event.reason);
        }
        // Prevent default browser behavior
        event.preventDefault();
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // Initialize logger
    if (typeof logger !== 'undefined') {
        logger.init();
        logger.info(COMPONENTS.SYSTEM, 'Page loaded', null, {
            url: window.location.href,
            userAgent: navigator.userAgent
        });
    }

    // Initialize and start fetching data
    fetchData().then(() => {
    }).catch(err => {
        console.error('fetchData() error:', err);
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SYSTEM, 'Error in fetchData during initialization', err);
        }
    });

    updateClock();
    initSlideshow();

    // Set up clock interval with cleanup tracking
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    clockInterval = intervalManager.setInterval(updateClock, CONFIG.CLOCK_UPDATE_INTERVAL);

    // Set up data refresh interval with cleanup tracking
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
    }
    dataRefreshInterval = intervalManager.setInterval(() => {
        fetchData().catch(err => {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.SYSTEM, 'Error in scheduled fetchData', err);
            }
        });
    }, CONFIG.DATA_REFRESH_INTERVAL);
});
