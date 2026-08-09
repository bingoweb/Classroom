
// Tab Switching
window.showTab = function (tabName) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const section = document.getElementById(tabName);
    if (!section) return;

    section.classList.add('active');
    // Find the button that calls this function and add active class
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick') === `showTab('${tabName}')`) {
            btn.classList.add('active');
        }
    });

    const systemButton = document.getElementById('systemButton');
    if (systemButton) {
        systemButton.classList.toggle('active', tabName === 'error-logs');
    }

    if (tabName === 'error-logs') {
        if (typeof window.refreshErrorLogs === 'function') {
            window.refreshErrorLogs();
        }
    }
}
// Fetch Data
async function fetchStudents() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/students`);
        const students = await res.json();
        AdminStudents.renderStudents(students);
        AdminRoles.updateRoleSelects(students);
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error fetching students', e); }
    }
}
async function fetchRoles() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/roles`);
        const roles = await res.json();
        AdminRoles.renderRoles(roles);
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error fetching roles', e);
        }
    }
}

// Fetch Word of the Day
// fetchWord removed - Word of the Day feature deprecated

// QR Code - Simple URL display
window.showQRCode = async function () {
    document.getElementById('qrModal').style.display = 'flex';
    try {
        const res = await fetch(`${typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '/api'}/network-info`);
        const data = await res.json();
        const url = `http://${data.ip}:${data.port}/index.html`;
        document.getElementById('qrcode').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="font-size: 1.2rem; margin-bottom: 15px; font-weight: bold;">Ana Ekran Adresi:</p>
                <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid var(--primary); word-break: break-all; font-family: monospace; font-size: 1rem;">
                    ${url}
                </div>
                <p style="margin-top: 15px; font-size: 0.9rem; color: #666;">Bu adresi tarayıcınızda açarak ana ekrana erişebilirsiniz.</p>
            </div>
        `;
    } catch(e) {
        const url = window.location.href.replace('/admin/index.html', '/index.html');
        document.getElementById('qrcode').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="font-size: 1.2rem; margin-bottom: 15px; font-weight: bold;">Ana Ekran Adresi:</p>
                <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid var(--primary); word-break: break-all; font-family: monospace; font-size: 1rem;">
                    ${url}
                </div>
                <p style="margin-top: 15px; font-size: 0.9rem; color: #666;">Bu adresi tarayıcınızda açarak ana ekrana erişebilirsiniz.</p>
            </div>
        `;
    }
};

window.closeQRCode = function () {
    document.getElementById('qrModal').style.display = 'none';
};

// Word of the Day form removed - feature deprecated

// Global error handlers for admin panel
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Unhandled error', event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        } else {
            // Already logged by logger above
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Unhandled Promise Rejection', event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
                promise: String(event.promise)
            });
        } else {
            // Already logged by logger above
        }
        event.preventDefault();
    });
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG === 'undefined' || typeof Utils === 'undefined') {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'CONFIG or Utils not loaded!'); }
        alert('Sistem hatası: Gerekli kütüphaneler yüklenemedi. Sayfayı yenileyin.');
        return;
    }

    AdminStudents.init({
        refreshStudents: fetchStudents,
        refreshRoles: fetchRoles
    });

    AdminRoles.init({
        refreshRoles: fetchRoles
    });
    AdminAttendance.init();

    fetchStudents();
    fetchRoles();
    // fetchWord(); - removed, feature deprecated
    fetchSlides();
    fetchSlideSettings();

    // Slide form event listeners
    const slideForm = document.getElementById('slideForm');
    if (slideForm) {
        slideForm.addEventListener('submit', handleSlideSubmit);
    }

    const slideMedia = document.getElementById('slideMedia');
    if (slideMedia) {
        slideMedia.addEventListener('change', handleSlideMediaChange);
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

});

// ===== SLIDE MANAGEMENT FUNCTIONS =====

let allSlides = [];
let currentEditingSlide = null;

async function fetchSlides() {
    try {
        logger.debug(COMPONENTS.ADMIN, 'Fetching slides', null);
        const res = await fetch(`${CONFIG.API_URL}/admin/slides`);
        if (!res.ok) {
            const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
            logger.error(COMPONENTS.ADMIN, 'Failed to fetch slides', error, {
                status: res.status,
                statusText: res.statusText
            });
            throw error;
        }
        allSlides = await res.json();
        logger.info(COMPONENTS.ADMIN, 'Slides fetched successfully', null, {
            count: allSlides.length
        });
        renderSlides(allSlides);
    } catch (e) {
        logger.error(COMPONENTS.ADMIN, 'Error fetching slides', e);
        Utils.showError('Slaytlar yüklenirken hata oluştu.');
    }
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

function renderSlides(slides) {
    const container = document.getElementById('slidesList');
    if (!container) return;

    if (slides.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Henüz slayt eklenmemiş.</p>';
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

        return `
            <div class="slide-item${isActive ? '' : ' is-inactive'}" data-id="${slide.id}" data-order="${slide.display_order}" draggable="true" style="display: flex; align-items: center; gap: 15px; padding: 15px; margin-bottom: 10px; background: white; border-radius: 8px; border: 1px solid #ddd; cursor: move;">
                <div style="font-size: 1.5rem; cursor: move;">☰</div>
                ${mediaPath ? `
                    <div style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 5px; overflow: hidden; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                        ${slide.media_type === 'video' ? `
                            <video src="${mediaPath}" style="width: 100%; height: 100%; object-fit: cover;" muted></video>
                        ` : `
                            <img src="${mediaPath}" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color: #999; font-size: 0.8rem;\\'>Görsel yok</span>'">
                        `}
                    </div>
                ` : '<div style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 5px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.8rem;">Görsel yok</div>'}
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <span style="font-weight: bold; color: var(--primary);">#${slide.display_order}</span>
                        <span style="background: #e3f2fd; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem;">${contentTypeLabels[slide.content_type] || slide.content_type}</span>
                        <span style="font-size: 1.2rem;">${mediaTypeIcons[slide.media_type] || '📄'}</span>
                        ${slide.title ? `<span style="font-weight: bold;">${slide.title}</span>` : ''}
                        <span style="color: #666; font-size: 0.9rem;">${transitionLabels[slide.transition_mode] || 'Varsayılan'}</span>
                        ${isActive ? '<span style="color: green;">✓ Aktif</span>' : '<span style="color: red;">✗ Pasif</span>'}
                    </div>
                    ${slide.text_content ? `<div style="color: #666; font-size: 0.9rem; margin-top: 5px;">${slide.text_content.substring(0, 50)}${slide.text_content.length > 50 ? '...' : ''}</div>` : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="editSlide(${slide.id})" style="padding: 5px 10px; background: var(--secondary); color: white; border: none; border-radius: 4px; cursor: pointer;">Düzenle</button>
                    <button onclick="toggleSlideActive(${slide.id})" style="padding: 5px 10px; background: ${isActive ? '#ff9800' : '#4caf50'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${isActive ? 'Pasif Yap' : 'Aktif Yap'}</button>
                    <button onclick="deleteSlide(${slide.id})" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Sil</button>
                </div>
            </div>
        `;
    }).join('');

    // Setup drag and drop
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

let draggedElement = null;

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
    const newOrders = allSlides.map(slide => {
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
            fetchSlides(); // Refresh on error
            return;
        }

        logger.info(COMPONENTS.ADMIN, 'Slides reordered successfully', null, {
            draggedId,
            targetId
        });
        Utils.showSuccess('Sıralama başarıyla güncellendi');
        fetchSlides();
    } catch (e) {
        logger.error(COMPONENTS.ADMIN, 'Error reordering slides', e, {
            draggedId,
            targetId
        });
        Utils.showError('Sıralama güncellenirken hata oluştu');
        fetchSlides(); // Refresh on error
    }
}

window.showSlideForm = function (slideId = null) {
    currentEditingSlide = slideId;
    const modal = document.getElementById('slideFormModal');
    const formTitle = document.getElementById('slideFormTitle');
    const form = document.getElementById('slideForm');

    if (slideId) {
        formTitle.textContent = 'Slayt Düzenle';
        const slide = allSlides.find(s => s.id === slideId);
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

            // Show preview of existing media
            const preview = document.getElementById('slideMediaPreview');
            const mediaInfo = document.getElementById('slideMediaInfo');
            const currentMediaInfo = document.getElementById('slideCurrentMediaInfo');
            const fileInput = document.getElementById('slideMedia');
            const mediaLabel = document.getElementById('slideMediaLabel');

            // Make file input optional when editing
            fileInput.removeAttribute('required');
            mediaLabel.textContent = 'Medya Dosyası (Opsiyonel - Yeni dosya seçmezseniz mevcut dosya korunur)';

            if (slide.media_path) {
                // Normalize media path for admin panel
                let mediaPath = Utils.normalizePath ? Utils.normalizePath(slide.media_path, true) : slide.media_path;

                // Show current media info
                const mediaTypeText = slide.media_type === 'video' ? 'Video' : slide.media_type === 'gif' ? 'GIF' : 'Resim';
                currentMediaInfo.innerHTML = `✓ Mevcut medya: ${mediaTypeText} - <a href="${mediaPath}" target="_blank" style="color: #28a745;">Görüntüle</a>`;

                // Show preview
                if (slide.media_type === 'video') {
                    preview.innerHTML = `
                        <div style="text-align: center;">
                            <video src="${mediaPath}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" controls></video>
                            <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Mevcut Video</p>
                        </div>
                    `;
                } else {
                    preview.innerHTML = `
                        <div style="text-align: center;">
                            <img src="${mediaPath}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" alt="Mevcut Medya">
                            <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Mevcut ${slide.media_type === 'gif' ? 'GIF' : 'Resim'}</p>
                        </div>
                    `;
                }
                mediaInfo.textContent = '';
            } else {
                preview.innerHTML = '<p style="color: #999;">Mevcut medya dosyası yok</p>';
                currentMediaInfo.textContent = '';
            }

            handleContentTypeChange();
            handleTransitionModeChange();
        }
    } else {
        formTitle.textContent = 'Yeni Slayt Ekle';
        form.reset();
        const fileInput = document.getElementById('slideMedia');
        const mediaLabel = document.getElementById('slideMediaLabel');
        fileInput.setAttribute('required', 'required');
        mediaLabel.textContent = 'Medya Dosyası * (Resim, GIF veya Video - Max 100 MB)';
        document.getElementById('slideMediaPreview').innerHTML = '';
        document.getElementById('slideMediaInfo').textContent = '';
        document.getElementById('slideCurrentMediaInfo').textContent = '';
        handleContentTypeChange();
        handleTransitionModeChange();
    }

    modal.style.display = 'flex';
};

window.closeSlideForm = function () {
    const modal = document.getElementById('slideFormModal');
    modal.style.display = 'none';
    currentEditingSlide = null;
    document.getElementById('slideForm').reset();
    const fileInput = document.getElementById('slideMedia');
    const mediaLabel = document.getElementById('slideMediaLabel');
    fileInput.setAttribute('required', 'required');
    mediaLabel.textContent = 'Medya Dosyası * (Resim, GIF veya Video - Max 100 MB)';
    document.getElementById('slideMediaPreview').innerHTML = '';
    document.getElementById('slideMediaInfo').textContent = '';
    document.getElementById('slideCurrentMediaInfo').textContent = '';
    document.getElementById('slideUploadProgress').style.display = 'none';
};

function handleSlideMediaChange(e) {
    const file = e.target.files[0];
    if (!file) {
        // If no file selected, show existing media again (if editing)
        if (currentEditingSlide) {
            const slide = allSlides.find(s => s.id === currentEditingSlide);
            if (slide && slide.media_path) {
                const preview = document.getElementById('slideMediaPreview');
                const currentMediaInfo = document.getElementById('slideCurrentMediaInfo');

                // Normalize media path for admin panel
                let mediaPath = Utils.normalizePath ? Utils.normalizePath(slide.media_path, true) : slide.media_path;

                const mediaTypeText = slide.media_type === 'video' ? 'Video' : slide.media_type === 'gif' ? 'GIF' : 'Resim';
                currentMediaInfo.innerHTML = `✓ Mevcut medya: ${mediaTypeText} - <a href="${mediaPath}" target="_blank" style="color: #28a745;">Görüntüle</a>`;

                if (slide.media_type === 'video') {
                    preview.innerHTML = `
                        <div style="text-align: center;">
                            <video src="${mediaPath}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" controls></video>
                            <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Mevcut Video</p>
                        </div>
                    `;
                } else {
                    preview.innerHTML = `
                        <div style="text-align: center;">
                            <img src="${mediaPath}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" alt="Mevcut Medya">
                            <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Mevcut ${slide.media_type === 'gif' ? 'GIF' : 'Resim'}</p>
                        </div>
                    `;
                }
            }
        }
        return;
    }

    // Check file size (100 MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        Utils.showError('Dosya boyutu 100 MB\'dan büyük olamaz!');
        e.target.value = '';
        return;
    }

    // Hide current media info when new file is selected
    document.getElementById('slideCurrentMediaInfo').textContent = '';

    // Show file info
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    document.getElementById('slideMediaInfo').textContent = `Yeni dosya: ${file.name} (${fileSizeMB} MB)`;

    // Show preview
    const preview = document.getElementById('slideMediaPreview');
    const reader = new FileReader();
    reader.onload = function (e) {
        if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <video src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" controls></video>
                    <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Yeni Video Önizlemesi</p>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <img src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" alt="Yeni Dosya Önizlemesi">
                    <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">Yeni ${file.type === 'image/gif' ? 'GIF' : 'Resim'} Önizlemesi</p>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
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

    // Check if media is video
    const mediaInput = document.getElementById('slideMedia');
    if (mediaInput.files.length > 0) {
        const file = mediaInput.files[0];
        if (file.type.startsWith('video/')) {
            videoSettings.style.display = 'block';
        } else {
            videoSettings.style.display = 'none';
        }
    } else if (currentEditingSlide) {
        const slide = allSlides.find(s => s.id === currentEditingSlide);
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

async function handleSlideSubmit(e) {
    e.preventDefault();

    const slideId = document.getElementById('slideId').value;
    const formData = new FormData();

    const fileInput = document.getElementById('slideMedia');
    const contentType = document.getElementById('slideContentType').value;

    // Validation
    if (!contentType) {
        Utils.showError('İçerik tipi seçilmelidir!');
        return;
    }

    // For new slides, file is required
    if (!slideId && fileInput.files.length === 0) {
        Utils.showError('Yeni slayt için medya dosyası gereklidir!');
        return;
    }

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Check file size (100 MB)
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

    // Determine media type from file
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.type.startsWith('video/')) {
            formData.append('media_type', 'video');
        } else if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
            formData.append('media_type', 'gif');
        } else if (file.type.startsWith('image/')) {
            formData.append('media_type', 'image');
        } else {
            // Fallback: try to determine from extension
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
        // Keep existing media type when editing without new file
        const slide = allSlides.find(s => s.id === parseInt(slideId));
        if (slide) {
            formData.append('media_type', slide.media_type);
        }
    }

    // Show progress
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

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `Yükleniyor... ${Math.round(percentComplete)}%`;
            }
        };

        xhr.onload = function () {
            progressDiv.style.display = 'none';
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    Utils.showSuccess(slideId ? 'Slayt başarıyla güncellendi!' : 'Slayt başarıyla eklendi!');
                    closeSlideForm();
                    fetchSlides();
                } catch (parseErr) {
                    // Silent - nested error
                    Utils.showError('Yanıt işlenirken hata oluştu');
                }
            } else {
                let errorMessage = 'Slayt kaydedilirken hata oluştu';
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
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
    } catch (e) {
        progressDiv.style.display = 'none';
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving slide', e); }
        Utils.showError('Slayt kaydedilirken hata oluştu.');
    }
}

window.editSlide = function (id) {
    showSlideForm(id);
};

window.deleteSlide = async function (id) {
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
        fetchSlides();
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error deleting slide', e); }
        Utils.showError('Slayt silinirken hata oluştu.');
    }
};

window.toggleSlideActive = async function (id) {
    const slide = allSlides.find(s => s.id === id);
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
        fetchSlides();
    } catch (e) {
        logger.error(COMPONENTS.ADMIN, 'Error toggling slide active state', e, { slideId: id });
        Utils.showError('Slayt durumu güncellenirken hata oluştu.');
    }
};

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
