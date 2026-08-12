let currentSlideIndex = 0;
let slideLayoutRefreshFrame = null;

// AKILLI VERİ KARŞILAŞTIRMA SİSTEMİ - gereksiz DOM güncellemelerini önler
let lastDataHash = {
    roles: null,
    stats: null
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

const ROLE_EMPTY_STATES = {
    president: {
        icon: 'assets/icons/crown-3d.png',
        title: 'Liderlik köşesi hazır',
        message: 'Başkanımız henüz seçilmedi',
        fallbackTitle: 'Liderlik köşesi dinleniyor',
        fallbackMessage: 'Sınıf ekibimiz birazdan burada'
    },
    duty: {
        icon: 'assets/icons/clipboard-3d.png',
        title: 'Yardımcı köşesi hazır',
        message: 'Bugünün nöbetçileri henüz seçilmedi',
        fallbackTitle: 'Yardımcı köşesi dinleniyor',
        fallbackMessage: 'Yardımcı ekibimiz birazdan burada'
    },
    stars: {
        icon: 'assets/icons/star-3d.png',
        title: 'Yıldız sahnesi hazır',
        message: 'Bu haftanın yıldızları henüz seçilmedi',
        fallbackTitle: 'Yıldız sahnesi dinleniyor',
        fallbackMessage: 'Yıldız sahnesi birazdan parlayacak'
    }
};

function renderRoleEmptyState(roleType, { fallback = false } = {}) {
    const state = ROLE_EMPTY_STATES[roleType];
    if (!state) return '';

    const title = fallback ? state.fallbackTitle : state.title;
    const message = fallback ? state.fallbackMessage : state.message;
    const fallbackClass = fallback ? ' is-fallback' : '';

    return `
        <div class="role-empty-state role-empty-state--${roleType}${fallbackClass}" role="status">
            <img class="role-empty-icon" src="${state.icon}" alt="" aria-hidden="true">
            <strong class="role-empty-title">${title}</strong>
            <span class="role-empty-message">${message}</span>
        </div>
    `;
}

function hasRoleRenderableContent(container) {
    if (!container) return false;
    if (container.children?.length > 0) return true;
    const meaningfulHtml = String(container.innerHTML || '').replace(/<!--[\s\S]*?-->/g, '').trim();
    return meaningfulHtml.length > 0;
}

function renderRoleFallbackState() {
    const roleContainers = [
        ['president-container', 'president'],
        ['duty-container', 'duty'],
        ['stars-container', 'stars']
    ];

    roleContainers.forEach(([id, roleType]) => {
        const container = document.getElementById(id);
        if (!container || hasRoleRenderableContent(container)) return;
        if (roleType === 'stars') stopStarSlideshow();
        container.innerHTML = renderRoleEmptyState(roleType, { fallback: true });
    });
}

async function fetchData() {
    try {
        // Independent dashboard resources should not form a request waterfall.
        const [roles, stats] = await Promise.all([
            Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/roles`),
            Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/stats`)
        ]);

        await updateStats(stats);

        if (!roles || !Array.isArray(roles)) {
            if (typeof logger !== 'undefined') {
                logger.warn(COMPONENTS.DASHBOARD, 'No roles data or invalid format');
            }
            renderRoleFallbackState();
            return;
        }

        window.ClassTV?.updateRoles(roles);

        // AKILLI KONTROL: Roles verisi değişmediyse DOM'u güncelleme
        if (!hasDataChanged('roles', roles)) {
            // Data unchanged, skipping role DOM updates.
            return;
        }

        const president = roles.find(r => r.role_type === 'president');
        const duties = roles.filter(r => r.role_type === 'duty');
        const stars = roles.filter(r => r.role_type === 'star');

        // Roles fetched and processed

        // Render President. Vice-presidents are intentionally presented by Class TV.
        const presidentContainer = document.getElementById('president-container');
        if (!presidentContainer) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.DASHBOARD, 'president-container element not found');
            }
        } else {
            if (president) {
                const avatarPath = Utils.getAvatarPath(president);
                const defaultAvatar = president.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
                const imgId = `president-img-${president.id}`;
                presidentContainer.innerHTML = `
                    <div class="president-main">
                        <img id="${imgId}" src="${avatarPath}" class="president-avatar-large" alt="" aria-hidden="true" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                        <div class="president-name-large">${Utils.escapeHtml(president.name || '---')}</div>
                    </div>
                `;
                intervalManager.setTimeout(() => {
                    const imgId = `president-img-${president.id}`;
                    const img = document.getElementById(imgId);
                    if (img && typeof faceFocusEngine !== 'undefined') {
                        faceFocusEngine.focusFace(img, Utils.getAvatarPath(president), 'large');
                    }
                }, 100);
            } else {
                presidentContainer.innerHTML = renderRoleEmptyState('president');
            }
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
                const longNameClass = Array.from(d.name || '').length > 22 ? ' duty-name-long' : '';
                return `
                <div class="duty-item">
                    <img id="${imgId}" src="${avatarPath}" class="duty-avatar" alt="" aria-hidden="true" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    <div class="duty-name${longNameClass}" id="${nameId}"></div>
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
            dutyContainer.innerHTML = renderRoleEmptyState('duty');
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
                const imgId = `star-img-${s.id}-${index}`;
                return `
                <div class="star-slide ${isActive}" data-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
                    <img id="${imgId}" src="${avatarPath}" class="star-avatar" alt="" aria-hidden="true" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    <div class="star-name">${Utils.escapeHtml(s.name || '---')}</div>
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

            intervalManager.setTimeout(() => {
                stars.forEach((star, index) => {
                    const img = document.getElementById(`star-img-${star.id}-${index}`);
                    if (img && typeof faceFocusEngine !== 'undefined') {
                        faceFocusEngine.focusFace(img, Utils.getAvatarPath(star), 'star');
                    }
                });
            }, 100);

            // Slideshow'u başlat
            initStarSlideshow(stars.length);
        } else {
            // Yıldız yok durumu
            stopStarSlideshow();
            starsContainer.innerHTML = renderRoleEmptyState('stars');
        }

    } catch (error) {
        renderRoleFallbackState();
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
let slideshowGeneration = 0; // Invalidates callbacks from a replaced slide set
let absentRosterInterval = null;
const ABSENT_ROSTER_PAGE_SIZE = 2;
const ABSENT_ROSTER_PAGE_DURATION = 5500;

function clearAbsentRosterInterval() {
    if (!absentRosterInterval) return;
    intervalManager.clearInterval(absentRosterInterval);
    absentRosterInterval = null;
}

function renderAbsentRosterPage(absentStudents, requestedPage = 0) {
    const absentContainer = document.getElementById('absent-container');
    const absentList = document.getElementById('absent-list');
    if (!absentContainer || !absentList || absentStudents.length === 0) return 0;

    const pageCount = Math.max(1, Math.ceil(absentStudents.length / ABSENT_ROSTER_PAGE_SIZE));
    const pageIndex = ((requestedPage % pageCount) + pageCount) % pageCount;
    const pageStart = pageIndex * ABSENT_ROSTER_PAGE_SIZE;
    const pageStudents = absentStudents.slice(pageStart, pageStart + ABSENT_ROSTER_PAGE_SIZE);

    absentList.innerHTML = pageStudents.map(student => {
        const avatarPath = Utils.getAvatarPath(student);
        const defaultAvatar = student.gender === 'F' ? CONFIG.DEFAULT_AVATAR_GIRL : CONFIG.DEFAULT_AVATAR_BOY;
        return `
            <span class="marquee-item">
                <img src="${avatarPath}" class="marquee-avatar" alt="" aria-hidden="true" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                <span class="marquee-name">${Utils.escapeHtml(student.name)}</span>
            </span>
        `;
    }).join('');

    absentContainer.dataset.pageLabel = pageCount > 1 ? `${pageIndex + 1} / ${pageCount}` : '';
    absentContainer.setAttribute('aria-label', `Devamsız öğrenciler: ${absentStudents.map(student => student.name).join(', ')}`);
    return pageIndex;
}

function startAbsentRoster(absentStudents) {
    clearAbsentRosterInterval();
    let currentPage = renderAbsentRosterPage(absentStudents, 0);
    const pageCount = Math.ceil(absentStudents.length / ABSENT_ROSTER_PAGE_SIZE);
    if (pageCount <= 1) return;

    absentRosterInterval = intervalManager.setInterval(() => {
        currentPage = renderAbsentRosterPage(absentStudents, currentPage + 1);
    }, ABSENT_ROSTER_PAGE_DURATION);
}

// STAR SLIDESHOW SİSTEMİ
let starSlideInterval = null;
let currentStarIndex = 0;
const STAR_SLIDE_DURATION = 4000; // 4 saniye her yıldız

function stopStarSlideshow() {
    if (!starSlideInterval) return;
    intervalManager.clearInterval(starSlideInterval);
    starSlideInterval = null;
}

function initStarSlideshow(totalSlides) {
    stopStarSlideshow();

    // Tek slide varsa geçiş yapma
    if (totalSlides <= 1) {
        return;
    }

    currentStarIndex = 0;

    starSlideInterval = intervalManager.setInterval(() => {
        nextStarSlide(totalSlides);
    }, STAR_SLIDE_DURATION);
}

function animateStarSlideTransition(currentSlide, nextSlide) {
    if (!currentSlide || !nextSlide || currentSlide === nextSlide) return;

    const reducedMotion = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gsap = window.gsap;

    currentSlide.classList.add('is-transitioning');
    nextSlide.classList.add('is-transitioning', 'active');
    currentSlide.setAttribute('aria-hidden', 'false');
    nextSlide.setAttribute('aria-hidden', 'false');

    const finish = () => {
        currentSlide.classList.remove('active', 'is-transitioning');
        nextSlide.classList.remove('is-transitioning');
        currentSlide.setAttribute('aria-hidden', 'true');
        nextSlide.setAttribute('aria-hidden', 'false');
    };

    if (!gsap || reducedMotion) {
        finish();
        return;
    }

    gsap.killTweensOf([currentSlide, nextSlide]);
    gsap.set(currentSlide, { autoAlpha: 1, scale: 1, yPercent: 0, rotation: 0 });
    gsap.set(nextSlide, { autoAlpha: 0, scale: 0.94, yPercent: 6, rotation: 0.8 });

    window.gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
            finish();
            gsap.set([currentSlide, nextSlide], {
                clearProps: 'opacity,visibility,transform'
            });
        }
    })
        .to(currentSlide, {
            autoAlpha: 0,
            scale: 0.975,
            yPercent: -4,
            rotation: -0.6,
            duration: 0.46,
            ease: 'power2.in'
        }, 0)
        .to(nextSlide, {
            autoAlpha: 1,
            scale: 1,
            yPercent: 0,
            rotation: 0,
            duration: 0.68,
            ease: 'back.out(1.25)'
        }, 0.12);
}

function nextStarSlide(totalSlides) {
    const slides = document.querySelectorAll('.star-slide');
    const dots = document.querySelectorAll('.star-dot');

    if (slides.length === 0) return;
    const currentSlide = slides[currentStarIndex];

    // Dot'u güncelle
    if (dots[currentStarIndex]) {
        dots[currentStarIndex].classList.remove('active');
    }

    // Sonraki slide'a geç
    currentStarIndex = (currentStarIndex + 1) % totalSlides;

    // Yeni slide'ı göster
    const nextSlide = slides[currentStarIndex];
    animateStarSlideTransition(currentSlide, nextSlide);

    // Yeni dot'u aktif yap
    if (dots[currentStarIndex]) {
        dots[currentStarIndex].classList.add('active');
    }
}

async function initSlideshow(preloadedSlides = null) {
    const container = document.getElementById('slideshow-container');

    if (!container) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.SLIDESHOW, 'Slideshow container not found', null, {
                containerId: 'slideshow-container'
            });
        }
        return;
    }

    slideshowGeneration += 1;

    try {
        if (typeof logger !== 'undefined') {
            logger.debug(COMPONENTS.SLIDESHOW, 'Initializing slideshow', null, {
                apiUrl: `${CONFIG.API_URL}/slides`
            });
        }

        let data = preloadedSlides;
        if (!Array.isArray(data)) {
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
            data = await response.json();
        }
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
            renderSlideshowFallback(container);
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
        renderSlideshowFallback(container);
    }
}

function renderSlideshowFallback(container) {
    if (!container) return null;

    const fallbackSlide = createSlideElement({
        id: 'fallback-ataturk',
        title: 'Mustafa Kemal Atatürk',
        content_type: 'quote',
        media_type: 'image',
        media_path: 'assets/ataturk-slides/ataturk-1.webp',
        text_content: '“Vatanını en çok seven, görevini en iyi yapandır.”\n— Mustafa Kemal Atatürk'
    }, true);

    container.innerHTML = '';
    container.appendChild(fallbackSlide);
    return fallbackSlide;
}

function getSlideMediaLayoutMode(imageWidth, imageHeight, frameWidth, frameHeight) {
    if (![imageWidth, imageHeight, frameWidth, frameHeight].every(value => Number.isFinite(value) && value > 0)) {
        return 'contain';
    }

    const imageRatio = imageWidth / imageHeight;
    const frameRatio = frameWidth / frameHeight;
    const ratioDifference = Math.max(imageRatio / frameRatio, frameRatio / imageRatio);

    // Small ratio differences can be cropped safely. Larger differences keep
    // the full composition and use the existing blurred backdrop to fill the card.
    return ratioDifference <= 1.20 ? 'cover' : 'contain';
}

function updateSlideImageLayout(slideElement, imageElement) {
    const frameElement = slideElement.parentElement || slideElement;
    const frameRect = frameElement.getBoundingClientRect();
    const layoutMode = getSlideMediaLayoutMode(
        imageElement.naturalWidth,
        imageElement.naturalHeight,
        frameRect.width,
        frameRect.height
    );

    slideElement.dataset.mediaLayout = layoutMode;
    imageElement.classList.toggle('slide-media--cover', layoutMode === 'cover');
    imageElement.classList.toggle('slide-media--contain', layoutMode === 'contain');
}

function scheduleSlideImageLayoutRefresh() {
    if (slideLayoutRefreshFrame !== null) return;

    slideLayoutRefreshFrame = requestAnimationFrame(() => {
        slideLayoutRefreshFrame = null;
        document.querySelectorAll('.slideshow-container .slide--media').forEach(slideElement => {
            const imageElement = slideElement.querySelector('.slide-media');
            if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
                updateSlideImageLayout(slideElement, imageElement);
            }
        });
    });
}

function createSlideCaptionElement(message) {
    const captionText = String(message || '').trim();
    if (!captionText) return null;

    const caption = document.createElement('div');
    caption.className = 'slide-text-content';
    caption.setAttribute('role', 'note');
    caption.setAttribute('aria-label', 'Slayt mesajı');

    const captionCopy = document.createElement('span');
    captionCopy.className = 'slide-caption-text';
    if (captionText.length > 220) {
        captionCopy.classList.add('slide-caption-text--compact');
    } else if (captionText.length > 120) {
        captionCopy.classList.add('slide-caption-text--long');
    }
    captionCopy.textContent = captionText;

    caption.appendChild(captionCopy);
    return caption;
}

function renderSlideMediaFallback(slideElement, { hasNext = false } = {}) {
    if (!slideElement) return null;

    let fallback = slideElement.querySelector('.slide-media-fallback');
    if (!fallback) {
        fallback = document.createElement('div');
        fallback.className = 'slide-media-fallback';
        fallback.setAttribute('role', 'status');
        fallback.setAttribute('aria-live', 'polite');

        const icon = document.createElement('img');
        icon.className = 'slide-media-fallback-icon';
        icon.src = 'assets/ui-icons-3d/sparkles.png';
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');

        const title = document.createElement('strong');
        title.className = 'slide-media-fallback-title';

        const message = document.createElement('span');
        message.className = 'slide-media-fallback-message';

        fallback.appendChild(icon);
        fallback.appendChild(title);
        fallback.appendChild(message);
        slideElement.appendChild(fallback);
    }

    fallback.children[1].textContent = 'Bu anı kısa bir molada';
    fallback.children[2].textContent = hasNext
        ? 'Sıradaki kareye geçiyoruz'
        : 'Sahnemiz birazdan yeniden parlayacak';
    fallback.style.display = 'grid';
    return fallback;
}

function createSlideElement(slide, isActive = false) {
    const slideDiv = document.createElement('div');
    slideDiv.className = `slide ${isActive ? 'active' : ''}`;
    slideDiv.dataset.slideId = slide.id;
    slideDiv.dataset.mediaType = slide.media_type;
    slideDiv.dataset.contentType = slide.content_type;
    slideDiv.dataset.mediaPath = slide.media_path;

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
        video.className = 'slide-video';
        video.preload = isActive ? 'auto' : 'none';
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
    } else {
        // Image or GIF
        slideDiv.classList.add('slide--media');

        const backdrop = document.createElement('div');
        backdrop.className = 'slide-media-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');

        const img = document.createElement('img');
        img.className = 'slide-media slide-media--contain';
        img.alt = slide.title || 'Slide';
        img.decoding = 'async';
        img.loading = isActive ? 'eager' : 'lazy';
        img.fetchPriority = isActive ? 'high' : 'auto';
        img.onload = function () {
            updateSlideImageLayout(slideDiv, this);
        };
        img.onerror = function () {
            const error = new Error('Image load failed');
            logger.error(COMPONENTS.MEDIA, 'Image load failed', error, {
                slideId: slide.id,
                mediaPath: slide.media_path,
                mediaType: slide.media_type
            });
            backdrop.style.display = 'none';
            this.style.display = 'none';
            slideDiv.dataset.mediaFailed = 'true';

            const hasNext = Array.isArray(slidesData) && slidesData.length > 1;
            renderSlideMediaFallback(slideDiv, { hasNext });

            const isCurrentSlide = slideDiv.classList.contains('active')
                || String(slideDiv.className || '').split(/\s+/).includes('active');
            if (isCurrentSlide && hasNext) {
                if (slideshowInterval) {
                    intervalManager.clearTimeout(slideshowInterval);
                    slideshowInterval = null;
                }
                const recoveryGeneration = slideshowGeneration;
                slideshowInterval = intervalManager.setTimeout(() => {
                    slideshowInterval = null;
                    if (recoveryGeneration !== slideshowGeneration || isTransitioning) return;
                    nextSlide();
                }, 1200);
            }
        };
        slideDiv.appendChild(backdrop);
        slideDiv.appendChild(img);

        if (img.complete && img.naturalWidth > 0) {
            requestAnimationFrame(() => updateSlideImageLayout(slideDiv, img));
        }
    }

    const captionText = String(slide.text_content || '').trim();
    const usesStoryTextLayout = captionText.length > 420;
    if (usesStoryTextLayout) {
        slideDiv.classList.add('slide--story-text');
    }

    const caption = createSlideCaptionElement(slide.text_content);
    if (caption && usesStoryTextLayout) {
        caption.classList.add('slide-text-content--story');
        const captionCopy = caption.querySelector('.slide-caption-text');
        if (captionCopy) {
            captionCopy.classList.remove('slide-caption-text--compact', 'slide-caption-text--long');
            captionCopy.classList.add('slide-caption-text--story');
            const hasDenseStoryToken = captionText
                .split(/\s+/)
                .some(token => token.length > 80);
            if (hasDenseStoryToken) {
                captionCopy.classList.add('slide-caption-text--story-token-dense');
            }
        }
    }
    if (caption) slideDiv.appendChild(caption);

    if (isActive) {
        hydrateSlideMedia(slideDiv);
    }

    return slideDiv;
}

function hydrateSlideMedia(slideElement) {
    if (!slideElement || slideElement.dataset.mediaHydrated === 'true') return false;

    const mediaPath = slideElement.dataset.mediaPath;
    if (!mediaPath) return false;

    if (slideElement.dataset.mediaType === 'video') {
        const video = slideElement.querySelector('video');
        if (!video) return false;
        video.preload = 'auto';
        video.src = mediaPath;
        if (typeof video.load === 'function') video.load();
    } else {
        const image = slideElement.querySelector('.slide-media');
        const backdrop = slideElement.querySelector('.slide-media-backdrop');
        if (!image) return false;
        // A hidden slide is not fetched reliably while loading="lazy". Once a
        // slide enters the one-item look-ahead window, make the preload eager.
        image.loading = 'eager';
        image.src = mediaPath;
        if (backdrop) {
            backdrop.style.backgroundImage = `url(${JSON.stringify(mediaPath)})`;
        }
    }

    slideElement.dataset.mediaHydrated = 'true';
    return true;
}

function prepareUpcomingSlide(fromIndex = currentSlideIndex) {
    if (!Array.isArray(slidesData) || slidesData.length < 2) return;

    const nextIndex = (fromIndex + 1) % slidesData.length;
    const nextSlide = slidesData[nextIndex];
    if (!nextSlide || !nextSlide.id) return;

    const nextElement = document.querySelector(`.slide[data-slide-id="${nextSlide.id}"]`);
    hydrateSlideMedia(nextElement);
}

function startSlideshow() {
    if (slidesData.length === 0) {
        logger.warn(COMPONENTS.SLIDESHOW, 'Cannot start slideshow: no slides', null);
        return;
    }

    currentSlideIndex = 0;
    const startGeneration = slideshowGeneration;
    if (typeof resetTransitionHistory === 'function') {
        resetTransitionHistory();
    }

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

        // Fade the optional subtitle in after the media settles.
        const firstTextDiv = slides[0].querySelector('.slide-text-content');
        if (firstTextDiv) {
            intervalManager.setTimeout(() => {
                if (startGeneration !== slideshowGeneration) return;
                firstTextDiv.style.opacity = '1';
                firstTextDiv.classList.add('fade-in');
            }, 500);
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

    if (slidesData.length === 1) {
        if (slideshowInterval) {
            intervalManager.clearTimeout(slideshowInterval);
            slideshowInterval = null;
        }
        return;
    }

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

    // Keep one media item ready ahead of the rotation without downloading the
    // entire gallery during the kiosk's first meaningful paint.
    prepareUpcomingSlide(currentSlideIndex);

    // Clear existing interval
    if (slideshowInterval) {
        intervalManager.clearTimeout(slideshowInterval);
        slideshowInterval = null;
    }

    // Schedule next slide
    const scheduledGeneration = slideshowGeneration;
    slideshowInterval = intervalManager.setTimeout(() => {
        slideshowInterval = null;
        if (scheduledGeneration !== slideshowGeneration) return;
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

    if (slidesData.length === 1) {
        currentSlideIndex = 0;
        isTransitioning = false;
        const onlySlide = slidesData[0];
        if (!onlySlide || !onlySlide.id) {
            logger.error(COMPONENTS.SLIDESHOW, 'Invalid current slide', null, {
                currentIndex: currentSlideIndex,
                slidesDataLength: slidesData.length
            });
            scheduleNextSlide();
            return;
        }
        const onlySlideElement = onlySlide?.id
            ? document.querySelector(`.slide[data-slide-id="${onlySlide.id}"]`)
            : null;
        if (onlySlideElement) {
            onlySlideElement.style.display = 'block';
            onlySlideElement.classList.add('active');
        }
        if (slideshowInterval) {
            intervalManager.clearTimeout(slideshowInterval);
            slideshowInterval = null;
        }
        return;
    }

    if (currentSlideIndex >= slidesData.length || currentSlideIndex < 0) {
        currentSlideIndex = 0;
    }

    // Set transition flag
    isTransitioning = true;
    const transitionGeneration = slideshowGeneration;

    const currentSlide = slidesData[currentSlideIndex];
    if (!currentSlide || !currentSlide.id) {
        logger.error(COMPONENTS.SLIDESHOW, 'Invalid current slide', null, {
            currentIndex: currentSlideIndex,
            slidesDataLength: slidesData.length
        });
        currentSlideIndex = 0;
        isTransitioning = false;
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
        isTransitioning = false;
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
        isTransitioning = false;
        scheduleNextSlide();
        return;
    }

    // Safety net for unusually short display durations or a refreshed gallery.
    hydrateSlideMedia(nextSlideElement);

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
        currentTextDiv.classList.remove('fade-in');
        currentTextDiv.classList.add('fade-out');
    }

    // Step 2: After text fades out, do image transition
    intervalManager.setTimeout(() => {
        if (transitionGeneration !== slideshowGeneration) return;

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
        transitionDuration = Number(slidesData[currentSlideIndex].transition_duration) || 1000;
        transitionDuration = Math.min(1800, Math.max(350, transitionDuration));

        const prefersReducedMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            transitionType = 'fade';
            transitionDuration = Math.min(500, transitionDuration);
        }

        logger.debug(COMPONENTS.SLIDESHOW, 'Transitioning to next slide', null, {
            fromSlideId: currentSlideId,
            toSlideId: nextSlideId,
            transitionType,
            transitionDuration
        });

        // Both slides must be composited while the effect is running. Keeping
        // the incoming slide at display:none makes even a correct effect look
        // like an abrupt cut when it is revealed at the end.
        currentSlideElement.style.display = 'block';
        nextSlideElement.style.display = 'block';
        currentSlideElement.classList.add('is-transitioning', 'is-transitioning-out');
        nextSlideElement.classList.add('is-transitioning', 'is-transitioning-in');
        nextSlideElement.classList.add('active');
        currentSlideElement.dataset.transitionType = transitionType;
        nextSlideElement.dataset.transitionType = transitionType;

        // Apply transition
        if (typeof applyTransition === 'function') {
            try {
                transitionDuration = applyTransition(
                    currentSlideElement,
                    nextSlideElement,
                    transitionType,
                    transitionDuration
                ) || transitionDuration;
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

        // Show/hide slides
        intervalManager.setTimeout(() => {
            if (transitionGeneration !== slideshowGeneration) return;

            currentSlideElement.style.display = 'none';
            nextSlideElement.style.display = 'block';
            currentSlideElement.classList.remove('active');
            currentSlideElement.classList.remove('is-transitioning', 'is-transitioning-out');
            nextSlideElement.classList.remove('is-transitioning', 'is-transitioning-in');
            delete currentSlideElement.dataset.transitionType;
            delete nextSlideElement.dataset.transitionType;

            const transitionTime = performance.now() - startTime;
            logger.debug(COMPONENTS.SLIDESHOW, 'Slide transition completed', null, {
                fromSlideId: currentSlideId,
                toSlideId: nextSlideId,
                transitionTime: Math.round(transitionTime)
            });

            // Step 3: Fade the next slide's optional subtitle in.
            const nextTextDiv = nextSlideElement.querySelector('.slide-text-content');
            if (nextTextDiv) {
                nextTextDiv.style.opacity = '1';
                nextTextDiv.classList.remove('fade-out');
                nextTextDiv.classList.add('fade-in');
            }

            currentSlideIndex = nextIndex;
            isTransitioning = false;
            scheduleNextSlide();
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

    }, textFadeOutDuration);
}

function rotateSlide() {
    // Legacy function - redirect to nextSlide
    nextSlide();
}

// Refresh slideshow when slides are updated
function getSlidesSnapshot(slides) {
    if (!Array.isArray(slides)) return '[]';

    return JSON.stringify(slides.map(slide => ({
        id: slide.id,
        title: slide.title,
        content_type: slide.content_type,
        media_type: slide.media_type,
        media_path: slide.media_path,
        text_content: slide.text_content,
        display_duration: slide.display_duration,
        video_auto_advance: slide.video_auto_advance,
        transition_type: slide.transition_type,
        transition_duration: slide.transition_duration,
        transition_mode: slide.transition_mode,
        display_order: slide.display_order,
        expires_at: slide.expires_at
    })));
}

async function refreshSlideshow() {
    logger.debug(COMPONENTS.SLIDESHOW, 'Refreshing slideshow', null);

    let refreshedSlides;
    try {
        const response = await fetch(`${CONFIG.API_URL}/slides/active`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        refreshedSlides = await response.json();
    } catch (err) {
        logger.error(COMPONENTS.SLIDESHOW, 'Slide refresh check failed; keeping current rotation', err);
        return;
    }

    if (getSlidesSnapshot(refreshedSlides) === getSlidesSnapshot(slidesData)) {
        logger.debug(COMPONENTS.SLIDESHOW, 'Slide data unchanged; keeping current rotation', null, {
            slideCount: slidesData.length,
            currentSlideIndex
        });
        return;
    }

    // Invalidate all callbacks that still belong to the previous slide set.
    slideshowGeneration += 1;

    // Reset transition flag
    isTransitioning = false;

    // Cleanup all intervals and timeouts
    if (slideshowInterval) {
        intervalManager.clearTimeout(slideshowInterval);
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
        await initSlideshow(refreshedSlides);
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
    const now = window.TimeProvider ? window.TimeProvider.now() : new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    const clockText = `${hours}:${minutes}`;
    if (clockEl && clockEl.textContent !== clockText) {
        clockEl.innerHTML = `${hours}<span class="blink">:</span>${minutes}`;
    }

    const dayName = now.toLocaleDateString('tr-TR', { weekday: 'long' });
    const fullDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Check if new elements exist (for backward compatibility if needed)
    const dayNameEl = document.getElementById('day-name');
    const dateEl = document.getElementById('date');

    setTextIfChanged(dayNameEl, dayName);
    setTextIfChanged(dateEl, fullDate);

    updateCountdown(now);

    // Weekend Countdown Logic
    const weekendCounter = document.getElementById('weekend-counter');
    if (weekendCounter) {
        const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        let daysLeft = 6 - day; // Days until Saturday

        // Adjust for Sunday (0) to show 6 days left (for next Saturday)
        // Or if it's weekend (6 or 0), show "Enjoy!"

        if (day === 6 || day === 0) {
            setTextIfChanged(weekendCounter, 'İYİ TATİLLER!');
            if (weekendCounter.dataset.statusColor !== '#00b894') {
                weekendCounter.style.color = '#00b894'; // Green for success
                weekendCounter.dataset.statusColor = '#00b894';
            }
        } else {
            // For weekdays (1-5)
            setTextIfChanged(weekendCounter, `${daysLeft} GÜN KALDI`);
            if (weekendCounter.dataset.statusColor !== '#e17055') {
                weekendCounter.style.color = '#e17055'; // Orange for countdown
                weekendCounter.dataset.statusColor = '#e17055';
            }
        }
    }
}

function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
}

function setDisplayIfChanged(element, value) {
    if (element && element.style.display !== value) element.style.display = value;
}

function syncModeVisual(container, imagePath, className, altText) {
    if (!container) return;

    const currentImage = container.querySelector('img');
    if (!imagePath) {
        if (container.children.length > 0) container.replaceChildren();
        return;
    }

    if (currentImage && currentImage.getAttribute('src') === imagePath) return;

    const image = document.createElement('img');
    image.src = imagePath;
    image.className = className;
    image.alt = altText;
    container.replaceChildren(image);
}

function renderPeriodContext(container, status, options = {}) {
    if (!container) return;

    const renderKey = JSON.stringify([
        status?.subtitle || '',
        status?.currentPeriodName || '',
        status?.nextLessonName || '',
        status?.nextEventName || '',
        options.showNext !== false
    ]);
    if (container.dataset.periodContextKey === renderKey) return;
    container.dataset.periodContextKey = renderKey;

    if (!status || !status.currentPeriodName) {
        container.classList.remove('period-context');
        container.classList.remove('is-single');
        container.textContent = status && status.subtitle ? status.subtitle : '';
        return;
    }

    const createChip = (variant, label, value) => {
        const chip = document.createElement('div');
        chip.className = `period-context-chip ${variant}`;

        const valueElement = document.createElement('strong');
        valueElement.className = 'period-context-value';
        valueElement.textContent = value;

        if (label) {
            const labelElement = document.createElement('span');
            labelElement.className = 'period-context-label';
            labelElement.textContent = label;
            chip.append(labelElement);
        }
        chip.append(valueElement);
        return chip;
    };

    const nextName = status.nextLessonName || status.nextEventName || 'Okul Sonu';
    const nextLabel = status.nextLessonName ? 'SIRADAKİ DERS' : 'SONRAKİ';
    const showNext = options.showNext !== false;

    container.classList.add('period-context');
    if (!showNext) {
        container.classList.add('is-single');
        container.replaceChildren(
            createChip('is-current is-only', '', status.currentPeriodName)
        );
        return;
    }

    container.classList.remove('is-single');
    container.replaceChildren(
        createChip('is-current', 'ŞİMDİ', status.currentPeriodName),
        createChip('is-next', nextLabel, nextName)
    );
}

function updateCountdownProgress(value) {
    const progressBar = document.getElementById('countdown-bar');
    if (!progressBar) return;

    const numericValue = Number(value);
    const boundedValue = Number.isFinite(numericValue)
        ? Math.min(100, Math.max(0, numericValue))
        : 0;

    const width = `${boundedValue}%`;
    if (progressBar.style.width !== width) progressBar.style.width = width;
    if (progressBar.parentElement) {
        const roundedValue = String(Math.round(boundedValue));
        if (progressBar.parentElement.getAttribute('aria-valuenow') !== roundedValue) {
            progressBar.parentElement.setAttribute('aria-valuenow', roundedValue);
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
    const countdownCard = document.getElementById('countdown-card');
    const countdownMode = document.getElementById('countdown-mode');
    const goodbyeMode = document.getElementById('goodbye-mode');
    const beforeSchoolMode = document.getElementById('before-school-mode');

    if (countdownCard) {
        countdownCard.dataset.flowState = status.mode;
    }

    const scheduleSource = typeof window.ScheduleManager.getScheduleSource === 'function'
        ? window.ScheduleManager.getScheduleSource()
        : 'fallback';
    window.dispatchEvent(new CustomEvent('classroom:schedule-status-updated', {
        detail: { status, scheduleSource, now }
    }));

    const useGoodbyeMode = status.mode === 'weekend' || status.mode === 'after-school';
    const useBeforeSchoolMode = status.mode === 'before-school' && Boolean(beforeSchoolMode);
    const useCountdownMode = !useGoodbyeMode && !useBeforeSchoolMode;

    setDisplayIfChanged(countdownMode, useCountdownMode ? 'flex' : 'none');
    setDisplayIfChanged(goodbyeMode, useGoodbyeMode ? 'flex' : 'none');
    setDisplayIfChanged(beforeSchoolMode, useBeforeSchoolMode ? 'flex' : 'none');

    // Handle different modes
    switch (status.mode) {
        case 'weekend':
            // Show goodbye mode with weekend styling
            setDisplayIfChanged(goodbyeMode, 'flex');
            if (!goodbyeMode.classList.contains('weekend')) {
                goodbyeMode.classList.remove('monday', 'tuesday', 'wednesday', 'thursday', 'friday');
                goodbyeMode.classList.add('weekend');
            }

            const weekendVisual = document.getElementById('goodbye-visual');
            syncModeVisual(weekendVisual, status.image, 'icon-3d-large goodbye-icon', 'Hafta sonu');

            setTextIfChanged(document.getElementById('goodbye-title'), status.message);
            setTextIfChanged(document.getElementById('goodbye-subtitle'), status.subtitle);

            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'before-school':
            // Show before school mode with countdown
            if (beforeSchoolMode) {
                setDisplayIfChanged(beforeSchoolMode, 'flex');
                // Update visual if needed
                const clockVisual = beforeSchoolMode.querySelector('.clock-visual');
                syncModeVisual(clockVisual, status.image, 'clock-icon', 'Ders başlangıç saati');

                const countdownEl = beforeSchoolMode.querySelector('#before-school-countdown');
                const subtitleEl = beforeSchoolMode.querySelector('#before-school-subtitle');
                setTextIfChanged(countdownEl, status.countdown);
                setTextIfChanged(subtitleEl, status.subtitle);
            } else {
                // Fallback to countdown mode if before-school-mode doesn't exist
                setDisplayIfChanged(countdownMode, 'flex');
                const titleEl = countdownMode.querySelector('h3');
                setTextIfChanged(titleEl, status.message);
                setTextIfChanged(document.getElementById('countdown'), status.countdown);
                updateCountdownProgress(0);
            }
            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'after-school':
            // Show goodbye mode
            setDisplayIfChanged(goodbyeMode, 'flex');

            const dayIndex = now.getDay();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const activeDayClass = dayIndex >= 1 && dayIndex <= 5 ? dayNames[dayIndex] : '';
            if (!activeDayClass || !goodbyeMode.classList.contains(activeDayClass)) {
                goodbyeMode.classList.remove('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend');
                if (activeDayClass) goodbyeMode.classList.add(activeDayClass);
            }

            const afterSchoolVisual = document.getElementById('goodbye-visual');
            syncModeVisual(afterSchoolVisual, status.image, 'icon-3d-large goodbye-icon', 'Okul çıkışı');

            setTextIfChanged(document.getElementById('goodbye-title'), status.message);
            setTextIfChanged(document.getElementById('goodbye-subtitle'), status.subtitle);

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
            setDisplayIfChanged(countdownMode, 'flex');
            const titleEl = countdownMode.querySelector('h3');
            setTextIfChanged(titleEl, status.message);
            const periodContextOptions = { showNext: scheduleSource === 'external' };

            const subtitleEl = countdownMode.querySelector('.countdown-subtitle');
            if (subtitleEl) {
                renderPeriodContext(subtitleEl, status, periodContextOptions);
            } else {
                // Create subtitle if it doesn't exist
                const h3 = countdownMode.querySelector('h3');
                if (h3) {
                    const nextElement = h3.nextElementSibling;
                    if (!nextElement || !nextElement.classList.contains('countdown-subtitle')) {
                        const newSubtitle = document.createElement('div');
                        newSubtitle.className = 'countdown-subtitle';
                        renderPeriodContext(newSubtitle, status, periodContextOptions);
                        h3.insertAdjacentElement('afterend', newSubtitle);
                    }
                }
            }

            setTextIfChanged(document.getElementById('countdown'), status.countdown);
            updateCountdownProgress(status.progress);

            if (window.stopConfetti) window.stopConfetti();
            break;

        case 'error':
            // Show error state
            setDisplayIfChanged(countdownMode, 'flex');
            const errorTitleEl = countdownMode.querySelector('h3');
            setTextIfChanged(errorTitleEl, status.message);
            renderPeriodContext(countdownMode.querySelector('.countdown-subtitle'), status);
            setTextIfChanged(document.getElementById('countdown'), status.countdown);
            updateCountdownProgress(0);
            if (window.stopConfetti) window.stopConfetti();
            break;

        default:
            logger.warn(COMPONENTS.SYSTEM, 'Unknown schedule status mode', null, { mode: status.mode });
            setDisplayIfChanged(countdownMode, 'flex');
            setTextIfChanged(document.getElementById('countdown'), '--:--');
            updateCountdownProgress(0);
    }
}

async function updateStats(preloadedStats) {
    try {
        let stats = preloadedStats;
        if (stats === undefined) {
            const res = await fetch(`${CONFIG.API_URL}/stats`);
            stats = await res.json();
        }

        if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
            throw new Error('Invalid stats response');
        }

        window.ClassTV?.updateStats(stats);

        if (!hasDataChanged('stats', stats)) return;

        const normalizeCount = (value) => {
            const count = Number(value);
            return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
        };
        const normalizedStats = {
            ...stats,
            total: normalizeCount(stats.total),
            girls: normalizeCount(stats.girls),
            boys: normalizeCount(stats.boys),
            todayPresent: normalizeCount(stats.todayPresent),
            todayAbsent: normalizeCount(stats.todayAbsent),
            absentStudents: Array.isArray(stats.absentStudents) ? stats.absentStudents : []
        };

        const totalStudents = normalizedStats.total;
        document.getElementById('total-students').textContent = totalStudents;
        document.getElementById('girl-students').textContent = normalizedStats.girls;
        document.getElementById('boy-students').textContent = normalizedStats.boys;

        // Today's attendance
        const todayPresent = normalizedStats.todayPresent;
        const todayAbsent = normalizedStats.todayAbsent;
        const absentStudents = normalizedStats.absentStudents;
        const todayTotal = todayPresent + todayAbsent;
        const hasAttendance = todayTotal > 0;
        const presentStudents = document.getElementById('present-students');
        const attendanceHero = document.getElementById('attendance-hero');
        const attendanceStatus = document.getElementById('today-attendance');

        if (presentStudents) {
            presentStudents.textContent = hasAttendance ? todayPresent : '--';
        }

        if (attendanceHero) {
            attendanceHero.classList[hasAttendance ? 'remove' : 'add']('is-pending');
        }

        if (attendanceStatus) {
            attendanceStatus.classList.remove('is-complete', 'has-absent', 'is-pending');

            if (hasAttendance && todayAbsent === 0) {
                attendanceStatus.textContent = 'TAM KADRO';
                attendanceStatus.classList.add('is-complete');
            } else if (hasAttendance) {
                attendanceStatus.textContent = `${todayAbsent} ÖĞRENCİ YOK`;
                attendanceStatus.classList.add('has-absent');
            } else {
                attendanceStatus.textContent = 'YOKLAMA BEKLENİYOR';
                attendanceStatus.classList.add('is-pending');
            }
        }

        const attendanceBox = document.getElementById('attendance-stat');
        if (attendanceBox) attendanceBox.style.display = 'flex';

        // Handle the Magic Park absence roster.
        const absentContainer = document.getElementById('absent-container');
        const absentList = document.getElementById('absent-list');
        const attendanceWrapper = document.querySelector('.attendance-wrapper');
        if (attendanceWrapper) {
            attendanceWrapper.classList.toggle('has-absent', absentStudents.length > 0);
        }

        if (absentContainer && absentList) {
            if (absentStudents.length > 0) {
                absentContainer.style.display = 'grid';
                startAbsentRoster(absentStudents);
            } else {
                clearAbsentRosterInterval();
                absentContainer.style.display = 'none';
                absentContainer.dataset.pageLabel = '';
                absentContainer.removeAttribute('aria-label');
                absentList.replaceChildren();
            }
        }

        window.dispatchEvent(new CustomEvent('classroom:stats-updated', {
            detail: normalizedStats
        }));
    } catch (e) {
        console.error('Stats error', e);
        lastDataHash.stats = null;
        document.getElementById('total-students').textContent = '--';
        document.getElementById('present-students').textContent = '--';
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

    // Initialize Dashboard Schedule Loader
    let scheduleLoader = null;
    if (window.DashboardScheduleLoader && window.api && window.ScheduleManager) {
        scheduleLoader = window.DashboardScheduleLoader.createDashboardScheduleLoader({
            api: window.api,
            scheduleManager: window.ScheduleManager,
            logger: typeof logger !== 'undefined' ? logger : null,
            onScheduleChanged: (result) => {
                updateClock();
            }
        });
        window.dashboardScheduleLoader = scheduleLoader;
        // Start one normalized schedule load
        scheduleLoader.load().catch(err => console.error('Initial schedule load error:', err));
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
    window.addEventListener('resize', scheduleSlideImageLayoutRefresh);

    // Set up clock interval with cleanup tracking
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    clockInterval = intervalManager.setInterval(updateClock, CONFIG.CLOCK_UPDATE_INTERVAL);
    window.addEventListener('timeSimulationChanged', updateClock);

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

        // Run one deduplicated normalized schedule refresh
        if (scheduleLoader) {
            scheduleLoader.load().catch(err => console.error('Interval schedule load error:', err));
        }
    }, CONFIG.DATA_REFRESH_INTERVAL);
});
