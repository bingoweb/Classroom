(function () {
    let setupDragAndDropHandler = () => {};

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

        setupDragAndDropHandler();
    }

    function init({ setupDragAndDrop } = {}) {
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDropHandler = setupDragAndDrop;
        }
    }

    window.AdminSlides = {
        init,
        renderSlides
    };
})();
