(function () {
    let getSlidesHandler = () => [];
    let refreshSlidesHandler = () => {};
    let draggedElement = null;
    let currentEditingSlide = null;

    function renderSlides(slides) {
        const container = document.getElementById('slidesList');
        if (!container) return;

        if (slides.length === 0) {
            container.innerHTML = '<p class="admin-slide-empty">Henüz slayt eklenmemiş.</p>';
            return;
        }

        container.innerHTML = slides.map(slide => {
            const contentTypeLabels = {
                'rule': 'Kural',
                'announcement': 'Duyuru',
                'photo': 'Fotoğraf',
                'celebration': 'Kutlama',
                'custom': 'Özel'
            };
            const mediaTypeIcons = {
                'image': '🖼️',
                'gif': '🎬',
                'video': '🎥'
            };
            const transitionLabels = {
                'auto': 'Otomatik',
                'random': 'Random',
                'manual': slide.transition_type || 'Manuel'
            };

            // Normalize media path for preview
            let mediaPath = slide.media_path || '';
            if (mediaPath && Utils.normalizePath) {
                mediaPath = Utils.normalizePath(mediaPath, true);
            }

            const isActive = slide.is_active === 1 || slide.is_active === true;
            const contentTypeLabel = Utils.escapeHtml(contentTypeLabels[slide.content_type] || slide.content_type || '');
            const transitionLabel = Utils.escapeHtml(transitionLabels[slide.transition_mode] || 'Varsayılan');
            const safeTitle = Utils.escapeHtml(slide.title || '');
            const textPreview = slide.text_content
                ? `${slide.text_content.substring(0, 50)}${slide.text_content.length > 50 ? '...' : ''}`
                : '';
            const safeTextPreview = Utils.escapeHtml(textPreview);

            return `
            <div class="slide-item admin-slide-item${isActive ? '' : ' is-inactive'}" data-id="${slide.id}" data-order="${slide.display_order}" draggable="true">
                <div class="admin-slide-item__drag">☰</div>
                ${mediaPath ? `
                    <div class="admin-slide-item__media">
                        ${slide.media_type === 'video' ? `
                            <video src="${mediaPath}" class="admin-slide-item__media-object" muted></video>
                        ` : `
                            <img src="${mediaPath}" class="admin-slide-item__media-object" alt="Preview">
                        `}
                    </div>
                ` : '<div class="admin-slide-item__media admin-slide-item__media--empty"><span class="admin-slide-item__media-empty">Görsel yok</span></div>'}
                <div class="admin-slide-item__content">
                    <div class="admin-slide-item__meta">
                        <span class="admin-slide-item__order">#${slide.display_order}</span>
                        <span class="admin-slide-item__type">${contentTypeLabel}</span>
                        <span class="admin-slide-item__media-icon">${mediaTypeIcons[slide.media_type] || '📄'}</span>
                        ${slide.title ? `<span class="admin-slide-item__title">${safeTitle}</span>` : ''}
                        <span class="admin-slide-item__transition">${transitionLabel}</span>
                        ${isActive ? '<span class="admin-slide-item__status admin-slide-item__status--active">✓ Aktif</span>' : '<span class="admin-slide-item__status admin-slide-item__status--passive">✗ Pasif</span>'}
                    </div>
                    ${slide.text_content ? `<div class="admin-slide-item__text">${safeTextPreview}</div>` : ''}
                </div>
                <div class="admin-slide-item__actions">
                    <button data-slide-action="edit" data-slide-id="${slide.id}" class="admin-slide-item__button admin-slide-item__button--edit">Düzenle</button>
                    <button data-slide-action="toggle-active" data-slide-id="${slide.id}" class="admin-slide-item__button ${isActive ? 'admin-slide-item__button--deactivate' : 'admin-slide-item__button--activate'}">${isActive ? 'Pasif Yap' : 'Aktif Yap'}</button>
                    <button data-slide-action="delete" data-slide-id="${slide.id}" class="admin-slide-item__button admin-slide-item__button--delete">Sil</button>
                </div>
            </div>
        `;
        }).join('');

        setupDragAndDrop();
    }

    function setupDragAndDrop() {
        const container = document.getElementById('slidesList');
        if (!container) return;

        const items = container.querySelectorAll('.slide-item');
        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        draggedElement = this;
        this.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedElement !== this) {
            const draggedOrder = parseInt(draggedElement.getAttribute('data-order'));
            const targetOrder = parseInt(this.getAttribute('data-order'));

            // Swap display orders
            const draggedId = parseInt(draggedElement.getAttribute('data-id'));
            const targetId = parseInt(this.getAttribute('data-id'));

            // Update in database
            reorderSlides(draggedId, draggedOrder, targetId, targetOrder);
        }

        return false;
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';
        draggedElement = null;
    }

    async function reorderSlides(draggedId, draggedOrder, targetId, targetOrder) {
        logger.debug(COMPONENTS.ADMIN, 'Reordering slides', null, {
            draggedId,
            draggedOrder,
            targetId,
            targetOrder
        });

        // Create new order array
        const newOrders = getSlidesHandler().map(slide => {
            if (slide.id === draggedId) {
                return { id: slide.id, display_order: targetOrder };
            } else if (slide.id === targetId) {
                return { id: slide.id, display_order: draggedOrder };
            } else {
                return { id: slide.id, display_order: slide.display_order };
            }
        });

        try {
            const response = await fetch(`${CONFIG.API_URL}/slides/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slideOrders: newOrders })
            });

            if (!response.ok) {
                let errorMessage = 'Sıralama güncellenirken hata oluştu';
                const responseClone = response.clone();
                try {
                    const errorData = await responseClone.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    try {
                        errorMessage = await responseClone.text() || errorMessage;
                    } catch (textError) {
                        // Ignore
                    }
                }
                const error = new Error(errorMessage);
                logger.error(COMPONENTS.ADMIN, 'Failed to reorder slides', error, {
                    status: response.status,
                    draggedId,
                    targetId
                });
                Utils.showError(errorMessage);
                refreshSlidesHandler(); // Refresh on error
                return;
            }

            logger.info(COMPONENTS.ADMIN, 'Slides reordered successfully', null, {
                draggedId,
                targetId
            });
            Utils.showSuccess('Sıralama başarıyla güncellendi');
            refreshSlidesHandler();
        } catch (e) {
            logger.error(COMPONENTS.ADMIN, 'Error reordering slides', e, {
                draggedId,
                targetId
            });
            Utils.showError('Sıralama güncellenirken hata oluştu');
            refreshSlidesHandler(); // Refresh on error
        }
    }

    function renderExistingMediaPreview(slide) {
        const preview = document.getElementById('slideMediaPreview');
        const currentMediaInfo = document.getElementById('slideCurrentMediaInfo');

        if (!slide.media_path) {
            preview.innerHTML = '<p class="admin-slide-media-empty">Mevcut medya dosyası yok</p>';
            currentMediaInfo.textContent = '';
            return;
        }

        let mediaPath = Utils.normalizePath ? Utils.normalizePath(slide.media_path, true) : slide.media_path;
        const mediaTypeText = slide.media_type === 'video' ? 'Video' : slide.media_type === 'gif' ? 'GIF' : 'Resim';
        currentMediaInfo.innerHTML = `✓ Mevcut medya: ${mediaTypeText} - <a href="${mediaPath}" target="_blank" class="admin-slide-current-media-link">Görüntüle</a>`;

        if (slide.media_type === 'video') {
            preview.innerHTML = `
                <div class="admin-slide-media-preview">
                    <video src="${mediaPath}" class="admin-slide-media-preview__object" controls></video>
                    <p class="admin-slide-media-preview__caption">Mevcut Video</p>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="admin-slide-media-preview">
                    <img src="${mediaPath}" class="admin-slide-media-preview__object" alt="Mevcut Medya">
                    <p class="admin-slide-media-preview__caption">Mevcut ${slide.media_type === 'gif' ? 'GIF' : 'Resim'}</p>
                </div>
            `;
        }
    }

    function prepareSlideMediaForm(slide) {
        const fileInput = document.getElementById('slideMedia');
        const mediaLabel = document.getElementById('slideMediaLabel');
        const preview = document.getElementById('slideMediaPreview');
        const mediaInfo = document.getElementById('slideMediaInfo');
        const currentMediaInfo = document.getElementById('slideCurrentMediaInfo');

        if (!slide) {
            fileInput.setAttribute('required', 'required');
            mediaLabel.textContent = 'Medya Dosyası * (Resim, GIF veya Video - Max 100 MB)';
            preview.innerHTML = '';
            mediaInfo.textContent = '';
            currentMediaInfo.textContent = '';
            return;
        }

        fileInput.removeAttribute('required');
        mediaLabel.textContent = 'Medya Dosyası (Opsiyonel - Yeni dosya seçmezseniz mevcut dosya korunur)';
        renderExistingMediaPreview(slide);
        if (slide.media_path) {
            mediaInfo.textContent = '';
        }
    }

    function resetSlideMediaForm() {
        const fileInput = document.getElementById('slideMedia');
        const mediaLabel = document.getElementById('slideMediaLabel');
        fileInput.setAttribute('required', 'required');
        mediaLabel.textContent = 'Medya Dosyası * (Resim, GIF veya Video - Max 100 MB)';
        document.getElementById('slideMediaPreview').innerHTML = '';
        document.getElementById('slideMediaInfo').textContent = '';
        document.getElementById('slideCurrentMediaInfo').textContent = '';
        document.getElementById('slideUploadProgress').style.display = 'none';
    }

    function handleSlideMediaChange(e) {
        const file = e.target.files[0];
        if (!file) {
            if (currentEditingSlide) {
                const slide = getSlidesHandler().find(s => s.id === currentEditingSlide);
                if (slide && slide.media_path) {
                    renderExistingMediaPreview(slide);
                }
            }
            return;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            Utils.showError('Dosya boyutu 100 MB\'dan büyük olamaz!');
            e.target.value = '';
            return;
        }

        document.getElementById('slideCurrentMediaInfo').textContent = '';

        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        document.getElementById('slideMediaInfo').textContent = `Yeni dosya: ${file.name} (${fileSizeMB} MB)`;

        const preview = document.getElementById('slideMediaPreview');
        const reader = new FileReader();
        reader.onload = function (event) {
            if (file.type.startsWith('video/')) {
                preview.innerHTML = `
                    <div class="admin-slide-media-preview">
                        <video src="${event.target.result}" class="admin-slide-media-preview__object" controls></video>
                        <p class="admin-slide-media-preview__caption">Yeni Video Önizlemesi</p>
                    </div>
                `;
            } else {
                preview.innerHTML = `
                    <div class="admin-slide-media-preview">
                        <img src="${event.target.result}" class="admin-slide-media-preview__object" alt="Yeni Dosya Önizlemesi">
                        <p class="admin-slide-media-preview__caption">Yeni ${file.type === 'image/gif' ? 'GIF' : 'Resim'} Önizlemesi</p>
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    }

    function showSlideForm(slideId = null) {
        currentEditingSlide = slideId;
        const modal = document.getElementById('slideFormModal');
        const formTitle = document.getElementById('slideFormTitle');
        const form = document.getElementById('slideForm');

        if (slideId) {
            formTitle.textContent = 'Slayt Düzenle';
            const slide = getSlidesHandler().find(s => s.id === slideId);
            if (slide) {
                document.getElementById('slideId').value = slide.id;
                document.getElementById('slideTitle').value = slide.title || '';
                document.getElementById('slideContentType').value = slide.content_type;
                document.getElementById('slideTextContent').value = slide.text_content || '';
                document.getElementById('slideDisplayDuration').value = slide.display_duration ? slide.display_duration / 1000 : '';
                document.getElementById('slideVideoAutoAdvance').checked = slide.video_auto_advance === 1;
                document.getElementById('slideTransitionMode').value = slide.transition_mode || 'auto';
                document.getElementById('slideTransitionType').value = slide.transition_type || '';
                document.getElementById('slideTransitionDuration').value = slide.transition_duration ? slide.transition_duration / 1000 : '';

                prepareSlideMediaForm(slide);
                handleContentTypeChange();
                handleTransitionModeChange();
            }
        } else {
            formTitle.textContent = 'Yeni Slayt Ekle';
            form.reset();
            document.getElementById('slideId').value = '';
            prepareSlideMediaForm(null);
            handleContentTypeChange();
            handleTransitionModeChange();
        }

        modal.style.display = 'flex';
    }

    function closeSlideForm() {
        const modal = document.getElementById('slideFormModal');
        modal.style.display = 'none';
        currentEditingSlide = null;
        document.getElementById('slideForm').reset();
        document.getElementById('slideId').value = '';
        resetSlideMediaForm();
    }

    function editSlide(id) {
        showSlideForm(id);
    }

    function getCurrentEditingSlideId() {
        return currentEditingSlide;
    }

    async function fetchSlideSettings() {
        try {
            const res = await fetch(`${CONFIG.API_URL}/slide-settings`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const settings = await res.json();
            if (settings.default_duration) {
                document.getElementById('defaultDuration').value = parseInt(settings.default_duration) / 1000;
            }
            if (settings.default_transition_mode) {
                document.getElementById('defaultTransitionMode').value = settings.default_transition_mode;
            }
            if (settings.default_transition_duration) {
                document.getElementById('defaultTransitionDuration').value = parseInt(settings.default_transition_duration) / 1000;
            }
        } catch (e) {
            if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error fetching slide settings', e); }
        }
    }

    function handleContentTypeChange() {
        const contentType = document.getElementById('slideContentType').value;
        const textContentDiv = document.getElementById('slideTextContentDiv');
        const videoSettings = document.getElementById('slideVideoSettings');

        if (contentType === 'rule') {
            textContentDiv.style.display = 'block';
        } else {
            textContentDiv.style.display = 'none';
        }

        const mediaInput = document.getElementById('slideMedia');
        if (mediaInput.files.length > 0) {
            const file = mediaInput.files[0];
            if (file.type.startsWith('video/')) {
                videoSettings.style.display = 'block';
            } else {
                videoSettings.style.display = 'none';
            }
        } else if (currentEditingSlide) {
            const slide = getSlidesHandler().find(s => s.id === currentEditingSlide);
            if (slide && slide.media_type === 'video') {
                videoSettings.style.display = 'block';
            } else {
                videoSettings.style.display = 'none';
            }
        } else {
            videoSettings.style.display = 'none';
        }
    }

    function handleTransitionModeChange() {
        const mode = document.getElementById('slideTransitionMode').value;
        const manualDiv = document.getElementById('slideTransitionManualDiv');
        if (mode === 'manual') {
            manualDiv.style.display = 'block';
        } else {
            manualDiv.style.display = 'none';
        }
    }

    async function handleSlideSettingsSubmit(e) {
        e.preventDefault();

        const duration = document.getElementById('defaultDuration').value;
        const transitionMode = document.getElementById('defaultTransitionMode').value;
        const transitionDuration = document.getElementById('defaultTransitionDuration').value;

        try {
            const response = await fetch(`${CONFIG.API_URL}/slide-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    default_duration: Number(duration) * 1000,
                    default_transition_mode: transitionMode,
                    default_transition_duration: Number(transitionDuration) * 1000
                })
            });

            if (!response.ok) {
                const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
                let userMessage = `Ayarlar kaydedilirken hata oluştu (${statusLabel}).`;

                try {
                    const errorData = await response.json();
                    if (errorData && typeof errorData.error === 'string' && errorData.error.trim()) {
                        userMessage = errorData.error.trim();
                    }
                } catch (parseError) {
                    // Fall back to the bounded HTTP status message above.
                }

                const requestError = new Error(`Atomic slide settings update failed with HTTP ${statusLabel}`);
                requestError.userMessage = userMessage;
                throw requestError;
            }

            Utils.showSuccess('Ayarlar başarıyla kaydedildi!');
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.ADMIN, 'Error saving slide settings', error);
            }
            Utils.showError(error && typeof error.userMessage === 'string'
                ? error.userMessage
                : 'Ayarlar kaydedilirken hata oluştu.');
        }
    }

    async function handleSlideSubmit(e) {
        e.preventDefault();

        const slideId = document.getElementById('slideId').value;
        const formData = new FormData();

        const fileInput = document.getElementById('slideMedia');
        const contentType = document.getElementById('slideContentType').value;

        if (!contentType) {
            Utils.showError('İçerik tipi seçilmelidir!');
            return;
        }

        if (!slideId && fileInput.files.length === 0) {
            Utils.showError('Yeni slayt için medya dosyası gereklidir!');
            return;
        }

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const maxSize = 100 * 1024 * 1024;
            if (file.size > maxSize) {
                Utils.showError('Dosya boyutu 100 MB\'dan büyük olamaz!');
                return;
            }
            formData.append('slide', file);
        }

        formData.append('title', document.getElementById('slideTitle').value);
        formData.append('content_type', contentType);
        formData.append('text_content', document.getElementById('slideTextContent').value);
        formData.append('display_duration', document.getElementById('slideDisplayDuration').value);
        formData.append('video_auto_advance', document.getElementById('slideVideoAutoAdvance').checked);
        formData.append('transition_mode', document.getElementById('slideTransitionMode').value);
        formData.append('transition_type', document.getElementById('slideTransitionType').value);
        formData.append('transition_duration', document.getElementById('slideTransitionDuration').value);

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.type.startsWith('video/')) {
                formData.append('media_type', 'video');
            } else if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
                formData.append('media_type', 'gif');
            } else if (file.type.startsWith('image/')) {
                formData.append('media_type', 'image');
            } else {
                const ext = file.name.toLowerCase().split('.').pop();
                if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
                    formData.append('media_type', 'video');
                } else if (ext === 'gif') {
                    formData.append('media_type', 'gif');
                } else {
                    formData.append('media_type', 'image');
                }
            }
        } else if (slideId) {
            const slide = getSlidesHandler().find(s => s.id === parseInt(slideId));
            if (slide) {
                formData.append('media_type', slide.media_type);
            }
        }

        const progressDiv = document.getElementById('slideUploadProgress');
        const progressBar = document.getElementById('slideProgressBar');
        const progressText = document.getElementById('slideProgressText');

        if (fileInput.files.length > 0) {
            progressDiv.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = 'Yükleniyor...';
        }

        try {
            const url = slideId ? `${CONFIG.API_URL}/slides/${slideId}` : `${CONFIG.API_URL}/slides`;
            const method = slideId ? 'PUT' : 'POST';

            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            if (window.getAdminCsrfToken) {
                const token = await window.getAdminCsrfToken();
                if (token) xhr.setRequestHeader('X-CSRF-Token', token);
            }

            xhr.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                    progressText.textContent = `Yükleniyor... ${Math.round(percentComplete)}%`;
                }
            };

            xhr.onload = function () {
                progressDiv.style.display = 'none';
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        JSON.parse(xhr.responseText);
                        Utils.showSuccess(slideId ? 'Slayt başarıyla güncellendi!' : 'Slayt başarıyla eklendi!');
                        closeSlideForm();
                        refreshSlidesHandler();
                    } catch (parseErr) {
                        Utils.showError('Yanıt işlenirken hata oluştu');
                    }
                } else {
                    let errorMessage = 'Slayt kaydedilirken hata oluştu';
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.error || errorMessage;
                    } catch (error) {
                        errorMessage = xhr.statusText || xhr.responseText || errorMessage;
                    }
                    Utils.showError(errorMessage);
                }
            };

            xhr.onerror = function () {
                progressDiv.style.display = 'none';
                const error = new Error('Network error during slide save');
                logger.error(COMPONENTS.ADMIN, 'Network error saving slide', error, {
                    method,
                    slideId,
                    url
                });
                Utils.showError('Slayt kaydedilirken hata oluştu.');
            };

            xhr.send(formData);
        } catch (error) {
            progressDiv.style.display = 'none';
            if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving slide', error); }
            Utils.showError('Slayt kaydedilirken hata oluştu.');
        }
    }

    async function deleteSlide(id) {
        if (!confirm('Bu slaytı silmek istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/slides/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                let errorMessage = 'Slayt silinirken hata oluştu';
                const responseClone = response.clone();
                try {
                    const errorData = await responseClone.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    try {
                        const errorText = await responseClone.text();
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        // Silent - nested error
                    }
                }
                Utils.showError(errorMessage);
                return;
            }

            Utils.showSuccess('Slayt başarıyla silindi!');
            refreshSlidesHandler();
        } catch (error) {
            if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error deleting slide', error); }
            Utils.showError('Slayt silinirken hata oluştu.');
        }
    }

    async function toggleSlideActive(id) {
        const slide = getSlidesHandler().find(s => s.id === id);
        if (!slide) {
            logger.warn(COMPONENTS.ADMIN, 'Slide not found for toggle', null, { slideId: id });
            return;
        }

        const newActiveState = slide.is_active ? 0 : 1;
        logger.debug(COMPONENTS.ADMIN, 'Toggling slide active state', null, {
            slideId: id,
            currentState: slide.is_active,
            newState: newActiveState
        });

        try {
            const response = await fetch(`${CONFIG.API_URL}/slides/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newActiveState })
            });

            if (!response.ok) {
                let errorMessage = 'Slayt durumu güncellenirken hata oluştu';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Ignore
                }
                const error = new Error(errorMessage);
                logger.error(COMPONENTS.ADMIN, 'Failed to toggle slide active state', error, {
                    slideId: id,
                    status: response.status
                });
                Utils.showError(errorMessage);
                return;
            }

            logger.info(COMPONENTS.ADMIN, 'Slide active state toggled successfully', null, {
                slideId: id,
                newState: newActiveState
            });
            Utils.showSuccess('Slayt durumu başarıyla güncellendi!');
            refreshSlidesHandler();
        } catch (e) {
            logger.error(COMPONENTS.ADMIN, 'Error toggling slide active state', e, { slideId: id });
            Utils.showError('Slayt durumu güncellenirken hata oluştu.');
        }
    }

    function handleSlideListClick(event) {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        const actionButton = target.closest('[data-slide-action][data-slide-id]');
        if (!actionButton) return;

        const action = actionButton.dataset.slideAction;
        const slideId = parseInt(actionButton.dataset.slideId, 10);
        if (!Number.isInteger(slideId)) return;

        if (action === 'edit') {
            editSlide(slideId);
        } else if (action === 'toggle-active') {
            toggleSlideActive(slideId);
        } else if (action === 'delete') {
            deleteSlide(slideId);
        }
    }

    function handleSlideListMediaError(event) {
        const media = event.target;
        if (!media || media.tagName !== 'IMG' || !media.classList || !media.classList.contains('admin-slide-item__media-object')) return;

        const mediaContainer = media.parentElement;
        if (!mediaContainer) return;
        mediaContainer.innerHTML = '<span class="admin-slide-item__media-empty">Görsel yok</span>';
    }

    function init({ getSlides, refreshSlides } = {}) {
        if (typeof getSlides === 'function') {
            getSlidesHandler = getSlides;
        }
        if (typeof refreshSlides === 'function') {
            refreshSlidesHandler = refreshSlides;
        }

        const slideMedia = document.getElementById('slideMedia');
        if (slideMedia) {
            slideMedia.addEventListener('change', handleSlideMediaChange);
        }

        const slideForm = document.getElementById('slideForm');
        if (slideForm) {
            slideForm.addEventListener('submit', handleSlideSubmit);
        }

        const slideContentType = document.getElementById('slideContentType');
        if (slideContentType) {
            slideContentType.addEventListener('change', handleContentTypeChange);
        }

        const slideTransitionMode = document.getElementById('slideTransitionMode');
        if (slideTransitionMode) {
            slideTransitionMode.addEventListener('change', handleTransitionModeChange);
        }

        const slideSettingsForm = document.getElementById('slideSettingsForm');
        if (slideSettingsForm) {
            slideSettingsForm.addEventListener('submit', handleSlideSettingsSubmit);
        }

        const showSlideFormButton = document.getElementById('showSlideFormButton');
        if (showSlideFormButton) {
            showSlideFormButton.addEventListener('click', () => showSlideForm());
        }

        const closeSlideFormButton = document.getElementById('closeSlideFormButton');
        if (closeSlideFormButton) {
            closeSlideFormButton.addEventListener('click', closeSlideForm);
        }

        const slidesList = document.getElementById('slidesList');
        if (slidesList && typeof slidesList.addEventListener === 'function') {
            slidesList.addEventListener('click', handleSlideListClick);
            slidesList.addEventListener('error', handleSlideListMediaError, true);
        }
    }

    window.AdminSlides = {
        init,
        renderSlides,
        toggleSlideActive,
        setupDragAndDrop,
        reorderSlides,
        showSlideForm,
        closeSlideForm,
        editSlide,
        getCurrentEditingSlideId,
        fetchSlideSettings,
        handleContentTypeChange,
        handleTransitionModeChange,
        handleSlideSettingsSubmit,
        handleSlideSubmit,
        deleteSlide
    };
    window.toggleSlideActive = toggleSlideActive;
    window.showSlideForm = showSlideForm;
    window.closeSlideForm = closeSlideForm;
    window.editSlide = editSlide;
    window.deleteSlide = deleteSlide;
})();
