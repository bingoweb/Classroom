(function () {
    let allStudents = [];
    let refreshStudents = () => {};
    let refreshRoles = () => {};
    let initialized = false;

    function renderStudents(students) {
        allStudents = students;
        updateStudentStats(students);
        displayStudents(students);
    }

    function updateStudentStats(students) {
        const total = students.length;
        const male = students.filter(s => s.gender === 'M').length;
        const female = students.filter(s => s.gender === 'F').length;

        document.getElementById('totalStudents').textContent = total;
        document.getElementById('maleStudents').textContent = male;
        document.getElementById('femaleStudents').textContent = female;
    }

    function displayStudents(students) {
        const list = document.getElementById('studentList');

        if (students.length === 0) {
            list.innerHTML = `
                <div class="admin-student-empty">
                    <div class="admin-student-empty__icon">📭</div>
                    <div class="admin-student-empty__title">Henüz öğrenci yok</div>
                    <div class="admin-student-empty__copy">Yukarıdaki formdan öğrenci ekleyebilirsiniz</div>
                </div>
            `;
            return;
        }

        list.innerHTML = students.map(s => {
            const avatarPath = Utils.getAvatarPath(s);
            let displayPath = avatarPath;
            if (Utils.normalizePath) {
                displayPath = Utils.normalizePath(avatarPath, false);
            }
            if (!displayPath.startsWith('http') && !displayPath.startsWith('../') && !displayPath.startsWith('data:')) {
                displayPath = displayPath.startsWith('/') ? '..' + displayPath : '../' + displayPath;
            }

            const defaultAvatar = s.gender === 'F' ? '../assets/default_girl.png' : '../assets/default_boy.png';
            const genderIcon = s.gender === 'M' ? '👦' : '👧';
            const genderText = s.gender === 'M' ? 'Erkek' : 'Kız';
            const genderClass = s.gender === 'M' ? 'admin-student-card--male' : 'admin-student-card--female';

            return `
                <div class="admin-student-card ${genderClass}"
                     data-gender="${s.gender}">
                    <div class="admin-student-card__badge">
                        ${genderIcon} ${genderText}
                    </div>
                    <div class="admin-student-card__visual">
                        <img src="${displayPath}"
                             data-default-avatar="${defaultAvatar}"
                             class="admin-student-card__avatar">
                    </div>
                    <div class="admin-student-card__body">
                        <div class="admin-student-card__name" title="${Utils.escapeHtml(s.name)}">
                            ${Utils.escapeHtml(s.name)}
                        </div>
                        <div class="admin-student-card__actions">
                            <button class="upload-photo-btn admin-student-card__photo-button" data-id="${s.id}">
                                📷 Resim
                            </button>
                            <button class="delete-btn admin-student-card__delete-button" data-id="${s.id}">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function filterStudents() {
        const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
        const genderFilter = document.getElementById('genderFilter').value;

        const filtered = allStudents.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(searchTerm);
            const matchesGender = !genderFilter || student.gender === genderFilter;
            return matchesSearch && matchesGender;
        });

        displayStudents(filtered);
    }

    async function deleteStudent(id) {
        if (!confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/students/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                let errorMessage = 'Öğrenci silinirken hata oluştu';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    try {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        if (typeof logger !== 'undefined') {
                            logger.error(COMPONENTS.ADMIN, 'Error reading error response during student deletion', textError);
                        }
                    }
                }
                Utils.showError(errorMessage);
                return;
            }

            try {
                await response.json();
            } catch (parseError) {
                if (typeof logger !== 'undefined') {
                    logger.error(COMPONENTS.ADMIN, 'Error parsing response JSON during student deletion', parseError);
                }
                Utils.showSuccess('Öğrenci başarıyla silindi!');
                refreshStudents();
                refreshRoles();
                return;
            }

            Utils.showSuccess('Öğrenci başarıyla silindi!');
            refreshStudents();
            refreshRoles();
        } catch (e) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.ADMIN, 'Error deleting student', e);
            }
            Utils.showError('Öğrenci silinirken hata oluştu.');
        }
    }

    function showPhotoUploadModal(studentId, studentName) {
        document.getElementById('photoUploadStudentId').value = studentId;
        document.getElementById('photoUploadStudentName').textContent = studentName;
        document.getElementById('photoUploadModal').style.display = 'flex';
        document.getElementById('photoUploadForm').reset();
    }

    function closePhotoUploadModal() {
        document.getElementById('photoUploadModal').style.display = 'none';
    }

    function clearExcelFile() {
        const excelFileInput = document.getElementById('excelFileInput');
        const excelImportResult = document.getElementById('excelImportResult');
        if (excelFileInput) {
            excelFileInput.value = '';
            excelImportResult.style.display = 'none';
            excelImportResult.innerHTML = '';
        }
    }

    function clearPhotoFile() {
        const photoInput = document.getElementById('photoFileInput');
        const previewContainer = document.getElementById('photoPreviewContainer');

        if (photoInput) {
            photoInput.value = '';
        }
        if (previewContainer) {
            previewContainer.remove();
        }
    }

    function handleStudentListPointerState(event, isHovering) {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        const card = target.closest('.admin-student-card');
        if (card) {
            card.style.transform = isHovering ? 'translateY(-4px)' : 'translateY(0)';
            card.style.boxShadow = isHovering
                ? '0 4px 16px rgba(0,0,0,0.15)'
                : '0 2px 8px rgba(0,0,0,0.1)';
            card.style.borderColor = isHovering ? 'var(--primary)' : 'transparent';
        }

        const actionButton = target.closest('.admin-student-card__photo-button, .admin-student-card__delete-button');
        if (actionButton) {
            actionButton.style.opacity = isHovering ? '0.9' : '1';
        }
    }

    function handleStudentAvatarError(event) {
        const avatar = event.target;
        if (!avatar || !avatar.classList || !avatar.classList.contains('admin-student-card__avatar')) return;

        const defaultAvatar = avatar.getAttribute('data-default-avatar');
        if (!defaultAvatar) return;

        avatar.removeAttribute('data-default-avatar');
        avatar.src = defaultAvatar;
    }

    function handleStudentActionClick(event) {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        const actionButton = target.closest('[data-student-action]');
        if (!actionButton) return;

        const action = actionButton.getAttribute('data-student-action');
        if (action === 'clear-excel-file') {
            clearExcelFile();
        } else if (action === 'clear-photo-file') {
            clearPhotoFile();
        }
    }

    function parseExcelFile(file) {
        if (typeof XLSX === 'undefined') {
            document.getElementById('excelContentPreview').innerHTML = `
                <div class="admin-excel-message admin-excel-message--error">
                    ⚠️ Excel kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.
                </div>
            `;
            console.error('XLSX library not loaded');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                console.log('Reading Excel file...');
                const data = new Uint8Array(e.target.result);
                console.log('File data loaded, size:', data.length);

                const workbook = XLSX.read(data, { type: 'array' });
                console.log('Workbook parsed:', workbook);
                console.log('Sheet names:', workbook.SheetNames);

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                console.log('First sheet:', firstSheetName, worksheet);

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                console.log('JSON data:', jsonData);
                console.log('Number of rows:', jsonData.length);
                console.log('First row (header):', jsonData[0]);
                console.log('Second row (sample):', jsonData[1]);
                console.log('Third row (sample):', jsonData[2]);

                if (!jsonData || jsonData.length === 0) {
                    document.getElementById('excelContentPreview').innerHTML = `
                        <div class="admin-excel-message admin-excel-message--warning">
                            ⚠️ Excel dosyası boş görünüyor. Lütfen başlık ve veri satırları içeren bir dosya seçin.
                        </div>
                    `;
                    return;
                }

                let tableHTML = '<div class="admin-excel-preview-block"><div class="admin-excel-preview-heading">📋 İçerik Önizlemesi (İlk 10 satır):</div>';
                tableHTML += '<div class="admin-excel-preview-scroll"><table class="admin-excel-preview-table">';

                const maxCols = Math.max(...jsonData.map(row => row ? row.length : 0));
                const nonEmptyCols = [];

                for (let col = 0; col < maxCols; col++) {
                    const hasData = jsonData.some(row => {
                        if (!row) return false;
                        const val = row[col];
                        return val !== undefined && val !== null && val !== '';
                    });
                    if (hasData) {
                        nonEmptyCols.push(col);
                    }
                }

                console.log('Non-empty columns:', nonEmptyCols);

                const maxRows = Math.min(jsonData.length, 10);
                for (let i = 0; i < maxRows; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    tableHTML += '<tr>';
                    for (const colIndex of nonEmptyCols) {
                        const cellValue = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '';
                        const cellClass = i === 0
                            ? 'admin-excel-preview-cell admin-excel-preview-cell--header'
                            : 'admin-excel-preview-cell admin-excel-preview-cell--body';
                        tableHTML += `<td class="${cellClass}">${Utils.escapeHtml(cellValue)}</td>`;
                    }
                    tableHTML += '</tr>';
                }

                tableHTML += '</table></div>';

                if (jsonData.length > 10) {
                    tableHTML += `<div class="admin-excel-preview-more">... ve ${jsonData.length - 10} satır daha</div>`;
                }

                tableHTML += `<div class="admin-excel-preview-summary">
                    <strong>📊 Toplam:</strong> ${jsonData.length} satır (${jsonData.length > 1 ? jsonData.length - 1 + ' öğrenci' : 'başlık satırı'})
                </div></div>`;

                console.log('Table HTML generated, length:', tableHTML.length);
                console.log('First 200 chars of HTML:', tableHTML.substring(0, 200));

                const previewElement = document.getElementById('excelContentPreview');
                console.log('Preview element found:', !!previewElement);

                if (previewElement) {
                    previewElement.innerHTML = tableHTML;
                    console.log('Table HTML written to DOM');
                } else {
                    console.error('excelContentPreview element not found!');
                }
            } catch (error) {
                console.error('Excel parse error:', error);
                document.getElementById('excelContentPreview').innerHTML = `
                    <div class="admin-excel-message admin-excel-message--error">
                        ⚠️ Excel dosyası okunamadı: ${Utils.escapeHtml(error.message)}
                        <br><small class="admin-excel-message__detail">Tarayıcı console'unu kontrol edin (F12)</small>
                    </div>
                `;
            }
        };

        reader.onerror = function (error) {
            console.error('FileReader error:', error);
            document.getElementById('excelContentPreview').innerHTML = `
                <div class="admin-excel-message admin-excel-message--error">
                    ⚠️ Dosya okunamadı. Lütfen başka bir dosya deneyin.
                </div>
            `;
        };

        reader.readAsArrayBuffer(file);
    }

    function init(dependencies = {}) {
        if (typeof dependencies.refreshStudents === 'function') {
            refreshStudents = dependencies.refreshStudents;
        }
        if (typeof dependencies.refreshRoles === 'function') {
            refreshRoles = dependencies.refreshRoles;
        }
        if (initialized) return;
        initialized = true;

        const addStudentForm = document.getElementById('addStudentForm');
        if (addStudentForm) {
            addStudentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);

                try {
                    const response = await fetch(`${CONFIG.API_URL}/students`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        Utils.showError(data.error || 'Öğrenci eklenirken hata oluştu');
                        return;
                    }

                    Utils.showSuccess('Öğrenci başarıyla eklendi!');
                    e.target.reset();
                    refreshStudents();
                } catch (e) {
                    if (typeof logger !== 'undefined') {
                        logger.error(COMPONENTS.ADMIN, 'Error adding student', e);
                    }
                    Utils.showError('Öğrenci eklenirken hata oluştu.');
                }
            });
        }

        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('keyup', filterStudents);
        }

        const genderFilter = document.getElementById('genderFilter');
        if (genderFilter) {
            genderFilter.addEventListener('change', filterStudents);
        }

        const studentList = document.getElementById('studentList');
        if (studentList) {
            studentList.addEventListener('mouseover', (e) => handleStudentListPointerState(e, true));
            studentList.addEventListener('mouseout', (e) => handleStudentListPointerState(e, false));
            studentList.addEventListener('error', handleStudentAvatarError, true);
            studentList.addEventListener('click', function (e) {
                if (e.target && e.target.classList.contains('delete-btn')) {
                    const id = e.target.getAttribute('data-id');
                    window.deleteStudent(id);
                } else if (e.target && e.target.classList.contains('upload-photo-btn')) {
                    const id = e.target.getAttribute('data-id');
                    const student = allStudents.find(s => s.id == id);
                    const name = student ? student.name : 'Bilinmeyen';
                    window.showPhotoUploadModal(id, name);
                }
            });
        }

        document.addEventListener('click', handleStudentActionClick);

        const photoUploadForm = document.getElementById('photoUploadForm');
        const closePhotoUploadModalButton = document.getElementById('closePhotoUploadModalButton');
        if (closePhotoUploadModalButton) {
            closePhotoUploadModalButton.addEventListener('click', closePhotoUploadModal);
        }

        if (photoUploadForm) {
            photoUploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const studentId = document.getElementById('photoUploadStudentId').value;
                const fileInput = document.getElementById('photoFileInput');
                const file = fileInput.files[0];

                if (!file) {
                    Utils.showError('Lütfen bir resim seçin.');
                    return;
                }

                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Utils.showError('Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP).');
                    return;
                }

                const maxSize = 5 * 1024 * 1024;
                if (file.size > maxSize) {
                    Utils.showError('Resim dosyası çok büyük. Maksimum 5MB olmalıdır.');
                    return;
                }

                const submitBtn = photoUploadForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Yükleniyor...';

                const formData = new FormData();
                formData.append('photo', file);

                try {
                    const response = await fetch(`${CONFIG.API_URL}/students/${studentId}/photo`, {
                        method: 'PUT',
                        body: formData
                    });

                    if (!response.ok) {
                        let errorMessage = 'Resim yüklenirken hata oluştu';
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            try {
                                const errorData = await response.json();
                                errorMessage = errorData.error || errorMessage;
                            } catch (parseError) {
                                errorMessage = `Resim yüklenirken hata oluştu (${response.status} ${response.statusText})`;
                            }
                        } else {
                            try {
                                const errorText = await response.text();
                                errorMessage = errorText || errorMessage;
                            } catch (textError) {
                                errorMessage = `Resim yüklenirken hata oluştu (${response.status} ${response.statusText})`;
                            }
                        }
                        Utils.showError(errorMessage);
                        return;
                    }

                    await response.json();
                    Utils.showSuccess('Resim başarıyla yüklendi!');
                    window.closePhotoUploadModal();
                    refreshStudents();
                } catch (e) {
                    if (typeof logger !== 'undefined') {
                        logger.error(COMPONENTS.ADMIN, 'Error uploading photo', e);
                    }
                    Utils.showError('Resim yüklenirken hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }

        const excelImportForm = document.getElementById('excelImportForm');
        const excelFileInput = document.getElementById('excelFileInput');
        const excelImportResult = document.getElementById('excelImportResult');

        if (excelFileInput) {
            excelFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    excelImportResult.style.display = 'block';
                    excelImportResult.innerHTML = `
                        <div class="admin-excel-selected">
                            <div class="admin-excel-selected__header">
                                <div>
                                    <div class="admin-excel-selected__label">📄 Seçilen dosya:</div>
                                    <div class="admin-excel-selected__name">${Utils.escapeHtml(file.name)}</div>
                                    <div class="admin-excel-selected__size">
                                        ${(file.size / 1024).toFixed(2)} KB
                                    </div>
                                </div>
                                <button type="button" class="admin-excel-selected__clear" data-student-action="clear-excel-file">
                                    ✖ Temizle
                                </button>
                            </div>
                            <div id="excelContentPreview" class="admin-excel-selected__preview">
                                <div class="admin-excel-result admin-excel-result--loading">📊 İçerik yükleniyor...</div>
                            </div>
                        </div>
                    `;

                    parseExcelFile(file);
                }
            });
        }

        if (excelImportForm) {
            excelImportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('excelFileInput');
                const resultDiv = document.getElementById('excelImportResult');
                const file = fileInput.files[0];

                if (!file) {
                    Utils.showError('Lütfen bir Excel dosyası seçin.');
                    return;
                }

                const fileName = file.name.toLowerCase();
                if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
                    Utils.showError('Lütfen geçerli bir Excel dosyası seçin (.xlsx veya .xls)');
                    return;
                }

                const formData = new FormData();
                formData.append('excel', file);

                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<p class="admin-excel-result admin-excel-result--loading">Yükleniyor...</p>';

                try {
                    const response = await fetch(`${CONFIG.API_URL}/students/import`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        let errorMessage = 'Excel yüklenirken hata oluştu';
                        const responseClone = response.clone();
                        try {
                            const errorData = await responseClone.json();
                            errorMessage = errorData.error ? Utils.escapeHtml(errorData.error) : errorMessage;
                            if (errorData.errors && Array.isArray(errorData.errors)) {
                                errorMessage += '<br><ul class="admin-excel-errors">';
                                errorData.errors.forEach(err => {
                                    errorMessage += `<li>${Utils.escapeHtml(err)}</li>`;
                                });
                                errorMessage += '</ul>';
                            }
                        } catch (parseError) {
                            try {
                                const errorText = await responseClone.text();
                                errorMessage = errorText ? Utils.escapeHtml(errorText) : errorMessage;
                            } catch (textError) {
                                errorMessage = Utils.escapeHtml(`Excel yüklenirken hata oluştu (${response.status} ${response.statusText})`);
                            }
                        }
                        resultDiv.innerHTML = `<p class="admin-excel-result admin-excel-result--error">${errorMessage}</p>`;
                        Utils.showError('Excel yüklenirken hata oluştu');
                        return;
                    }

                    const data = await response.json();
                    let resultHtml = `<p class="admin-excel-result admin-excel-result--success">${Utils.escapeHtml(data.message)}</p>`;

                    if (data.failed > 0) {
                        resultHtml += `<p class="admin-excel-result admin-excel-result--error">${data.failed} öğrenci eklenemedi</p>`;
                    }

                    if (data.errors && data.errors.length > 0) {
                        resultHtml += '<ul class="admin-excel-errors admin-excel-errors--error">';
                        data.errors.forEach(err => {
                            resultHtml += `<li>${Utils.escapeHtml(err)}</li>`;
                        });
                        resultHtml += '</ul>';
                    }

                    resultDiv.innerHTML = resultHtml;
                    Utils.showSuccess(data.message);
                    fileInput.value = '';
                    refreshStudents();
                } catch (e) {
                    if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error importing Excel', e); }
                    resultDiv.innerHTML = '<p class="admin-excel-result admin-excel-result--error">Excel yüklenirken hata oluştu.</p>';
                    Utils.showError('Excel yüklenirken hata oluştu.');
                }
            });
        }

        const photoFileInput = document.getElementById('photoFileInput');
        if (photoFileInput) {
            photoFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                let previewContainer = document.getElementById('photoPreviewContainer');

                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (!previewContainer) {
                            const container = document.createElement('div');
                            container.id = 'photoPreviewContainer';
                            container.style.cssText = 'margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.05); border-radius: 8px;';
                            photoFileInput.parentElement.appendChild(container);
                            previewContainer = container;
                        }

                        previewContainer.innerHTML = `
                            <div class="admin-photo-preview__header">
                                <div class="admin-photo-preview__title">📷 Yüklenecek Resim Önizlemesi:</div>
                                <button type="button" class="admin-photo-preview__clear" data-student-action="clear-photo-file">
                                    ✖ Temizle
                                </button>
                            </div>
                            <div class="admin-photo-preview__body">
                                <img src="${event.target.result}" class="admin-photo-preview__image">
                                <div class="admin-photo-preview__meta">
                                    ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                                </div>
                            </div>
                        `;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    window.filterStudents = filterStudents;
    window.deleteStudent = deleteStudent;
    window.showPhotoUploadModal = showPhotoUploadModal;
    window.closePhotoUploadModal = closePhotoUploadModal;
    window.clearExcelFile = clearExcelFile;
    window.clearPhotoFile = clearPhotoFile;

    window.AdminStudents = {
        init: init,
        renderStudents: renderStudents,
        displayStudents: displayStudents
    };
})();
