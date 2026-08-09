(function () {
    let getSlidesHandler = () => [];
    let refreshSlidesHandler = () => {};
    let prepareMediaFormHandler = () => {};
    let resetMediaFormHandler = () => {};
    let syncContentTypeHandler = () => {};
    let syncTransitionModeHandler = () => {};
    let draggedElement = null;
    let currentEditingSlide = null;

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

                prepareMediaFormHandler(slide);
                syncContentTypeHandler();
                syncTransitionModeHandler();
            }
        } else {
            formTitle.textContent = 'Yeni Slayt Ekle';
            form.reset();
            document.getElementById('slideId').value = '';
            prepareMediaFormHandler(null);
            syncContentTypeHandler();
            syncTransitionModeHandler();
        }

        modal.style.display = 'flex';
    }

    function closeSlideForm() {
        const modal = document.getElementById('slideFormModal');
        modal.style.display = 'none';
        currentEditingSlide = null;
        document.getElementById('slideForm').reset();
        document.getElementById('slideId').value = '';
        resetMediaFormHandler();
    }

    function editSlide(id) {
        showSlideForm(id);
    }

    function getCurrentEditingSlideId() {
        return currentEditingSlide;
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

    function init({
        getSlides,
        refreshSlides,
        prepareMediaForm,
        resetMediaForm,
        syncContentType,
        syncTransitionMode
    } = {}) {
        if (typeof getSlides === 'function') {
            getSlidesHandler = getSlides;
        }
        if (typeof refreshSlides === 'function') {
            refreshSlidesHandler = refreshSlides;
        }
        if (typeof prepareMediaForm === 'function') {
            prepareMediaFormHandler = prepareMediaForm;
        }
        if (typeof resetMediaForm === 'function') {
            resetMediaFormHandler = resetMediaForm;
        }
        if (typeof syncContentType === 'function') {
            syncContentTypeHandler = syncContentType;
        }
        if (typeof syncTransitionMode === 'function') {
            syncTransitionModeHandler = syncTransitionMode;
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
        getCurrentEditingSlideId
    };
    window.toggleSlideActive = toggleSlideActive;
    window.showSlideForm = showSlideForm;
    window.closeSlideForm = closeSlideForm;
    window.editSlide = editSlide;
})();
