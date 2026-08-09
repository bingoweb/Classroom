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
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 4rem; margin-bottom: 15px;">📭</div>
                    <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">Henüz öğrenci yok</div>
                    <div style="font-size: 0.95rem;">Yukarıdaki formdan öğrenci ekleyebilirsiniz</div>
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
            const genderColor = s.gender === 'M' ? '#2196F3' : '#E91E63';

            return `
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; border: 2px solid transparent; position: relative;"
                     onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'; this.style.borderColor='var(--primary)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='transparent'"
                     data-gender="${s.gender}">
                    <div style="position: absolute; top: 10px; right: 10px; background: ${genderColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; z-index: 1;">
                        ${genderIcon} ${genderText}
                    </div>
                    <div style="position: relative; padding-top: 100%; background: linear-gradient(135deg, ${genderColor}20 0%, ${genderColor}10 100%); overflow: hidden;">
                        <img src="${displayPath}"
                             onerror="this.onerror=null; this.src='${defaultAvatar}'"
                             style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 15px;">
                        <div style="font-size: 1.1rem; font-weight: 600; color: #333; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${Utils.escapeHtml(s.name)}">
                            ${Utils.escapeHtml(s.name)}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="upload-photo-btn" data-id="${s.id}"
                                style="flex: 1; padding: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;"
                                onmouseover="this.style.opacity='0.9'"
                                onmouseout="this.style.opacity='1'">
                                📷 Resim
                            </button>
                            <button class="delete-btn" data-id="${s.id}"
                                style="padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;"
                                onmouseover="this.style.opacity='0.9'"
                                onmouseout="this.style.opacity='1'">
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

    function parseExcelFile(file) {
        if (typeof XLSX === 'undefined') {
            document.getElementById('excelContentPreview').innerHTML = `
                <div style="color: #d32f2f; padding: 10px; background: rgba(211, 47, 47, 0.1); border-radius: 6px;">
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
                        <div style="color: #ff9800; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 6px;">
                            ⚠️ Excel dosyası boş görünüyor. Lütfen başlık ve veri satırları içeren bir dosya seçin.
                        </div>
                    `;
                    return;
                }

                let tableHTML = '<div style="margin-top: 10px;"><div style="font-weight: 600; margin-bottom: 8px;">📋 İçerik Önizlemesi (İlk 10 satır):</div>';
                tableHTML += '<div style="overflow-x: auto; max-height: 300px; overflow-y: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; background: white; border-radius: 6px; overflow: hidden;">';

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
                        const cellStyle = i === 0
                            ? 'padding: 8px; border: 1px solid #ddd; background: var(--primary); color: white; font-weight: 600; white-space: nowrap;'
                            : 'padding: 8px; border: 1px solid #ddd; white-space: nowrap; color: #333; background: white;';
                        tableHTML += `<td style="${cellStyle}">${Utils.escapeHtml(cellValue)}</td>`;
                    }
                    tableHTML += '</tr>';
                }

                tableHTML += '</table></div>';

                if (jsonData.length > 10) {
                    tableHTML += `<div style="margin-top: 8px; font-size: 0.85rem; color: #666;">... ve ${jsonData.length - 10} satır daha</div>`;
                }

                tableHTML += `<div style="margin-top: 10px; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 6px; font-size: 0.85rem;">
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
                    <div style="color: #d32f2f; padding: 10px; background: rgba(211, 47, 47, 0.1); border-radius: 6px;">
                        ⚠️ Excel dosyası okunamadı: ${Utils.escapeHtml(error.message)}
                        <br><small style="opacity: 0.8;">Tarayıcı console'unu kontrol edin (F12)</small>
                    </div>
                `;
            }
        };

        reader.onerror = function (error) {
            console.error('FileReader error:', error);
            document.getElementById('excelContentPreview').innerHTML = `
                <div style="color: #d32f2f; padding: 10px; background: rgba(211, 47, 47, 0.1); border-radius: 6px;">
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

        const studentList = document.getElementById('studentList');
        if (studentList) {
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

        const photoUploadForm = document.getElementById('photoUploadForm');
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
                        <div style="padding: 15px; background: rgba(255,255,255,0.3); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 5px;">📄 Seçilen dosya:</div>
                                    <div style="font-size: 0.9rem;">${Utils.escapeHtml(file.name)}</div>
                                    <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 3px;">
                                        ${(file.size / 1024).toFixed(2)} KB
                                    </div>
                                </div>
                                <button onclick="clearExcelFile()" type="button"
                                    style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                                    ✖ Temizle
                                </button>
                            </div>
                            <div id="excelContentPreview" style="margin-top: 15px;">
                                <div style="color: #666;">📊 İçerik yükleniyor...</div>
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
                resultDiv.innerHTML = '<p style="color: #666;">Yükleniyor...</p>';

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
                                errorMessage += '<br><ul style="margin-top: 10px; padding-left: 20px;">';
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
                        resultDiv.innerHTML = `<p style="color: #d32f2f;">${errorMessage}</p>`;
                        Utils.showError('Excel yüklenirken hata oluştu');
                        return;
                    }

                    const data = await response.json();
                    let resultHtml = `<p style="color: #2e7d32; font-weight: bold;">${Utils.escapeHtml(data.message)}</p>`;

                    if (data.failed > 0) {
                        resultHtml += `<p style="color: #d32f2f;">${data.failed} öğrenci eklenemedi</p>`;
                    }

                    if (data.errors && data.errors.length > 0) {
                        resultHtml += '<ul style="margin-top: 10px; padding-left: 20px; color: #d32f2f;">';
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
                    resultDiv.innerHTML = '<p style="color: #d32f2f;">Excel yüklenirken hata oluştu.</p>';
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
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="font-weight: 600;">📷 Yüklenecek Resim Önizlemesi:</div>
                                <button onclick="clearPhotoFile()" type="button"
                                    style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                                    ✖ Temizle
                                </button>
                            </div>
                            <div style="text-align: center;">
                                <img src="${event.target.result}"
                                     style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
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
