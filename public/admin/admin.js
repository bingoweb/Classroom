
// Tab Switching
window.showTab = function (tabName) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    // Find the button that calls this function and add active class
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick') === `showTab('${tabName}')`) {
            btn.classList.add('active');
        }
    });
}

// Fetch Data
async function fetchStudents() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/students`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const students = await res.json();
        renderStudents(students);
        updateRoleSelects(students);
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error fetching students', e); }
        Utils.showError('Öğrenciler yüklenirken hata oluştu');
    }
}

async function fetchRoles() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/roles`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const roles = await res.json();
        renderRoles(roles);
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error fetching roles', e);
        }
        Utils.showError('Roller yüklenirken hata oluştu');
    }
}

async function fetchSettings() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/settings`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const settings = await res.json();
        // Settings loaded (no city needed for offline operation)
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error fetching settings', e);
        }
        Utils.showError('Ayarlar yüklenirken hata oluştu');
    }
}

// Fetch Word of the Day
// fetchWord removed - Word of the Day feature deprecated

// Render Students - MODERNIZED
let allStudents = []; // Store all students for filtering

function renderStudents(students) {
    allStudents = students; // Store for filtering
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
        // Normalize avatar path for admin panel
        let displayPath = avatarPath;
        if (Utils.normalizePath) {
            displayPath = Utils.normalizePath(avatarPath, false);
        }
        // Add ../ prefix for admin panel
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
                 data-gender="${s.gender}"
                 data-student-name="${s.name.toLowerCase()}">
                
                <!-- Gender Badge -->
                <div style="position: absolute; top: 10px; right: 10px; background: ${genderColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; z-index: 1;">
                    ${genderIcon} ${genderText}
                </div>

                <!-- Avatar -->
                <div style="position: relative; padding-top: 100%; background: linear-gradient(135deg, ${genderColor}20 0%, ${genderColor}10 100%); overflow: hidden;">
                    <img src="${displayPath}" 
                         onerror="this.onerror=null; this.src='${defaultAvatar}'"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                </div>

                <!-- Info -->
                <div style="padding: 15px;">
                    <div style="font-size: 1.1rem; font-weight: 600; color: #333; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${s.name}
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 8px;">
                        <button class="upload-photo-btn" data-id="${s.id}" data-name="${s.name}"
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

// Filter Students - NEW FUNCTION
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

// Make filterStudents global
window.filterStudents = filterStudents;

// Add Student
document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
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
        fetchStudents();
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error adding student', e);
        }
        Utils.showError('Öğrenci eklenirken hata oluştu.');
    }
});

// Delete Student - Explicitly attached to window
window.deleteStudent = async function (id) {
    if (!confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;
    try {
        const response = await fetch(`${CONFIG.API_URL}/students/${id}`, { method: 'DELETE' });

        // Check response status before parsing JSON
        if (!response.ok) {
            let errorMessage = 'Öğrenci silinirken hata oluştu';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
                // If JSON parsing fails, try to get text
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

        // Parse JSON only if response is OK
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.ADMIN, 'Error parsing response JSON during student deletion', parseError);
            }
            // Even if JSON parsing fails, if status is OK, consider it success
            Utils.showSuccess('Öğrenci başarıyla silindi!');
            fetchStudents();
            fetchRoles(); // Refresh roles as they may have been cascade deleted
            return;
        }

        Utils.showSuccess('Öğrenci başarıyla silindi!');
        fetchStudents();
        fetchRoles(); // Refresh roles as they may have been cascade deleted
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error deleting student', e);
        }
        Utils.showError('Öğrenci silinirken hata oluştu.');
    }
};

// Update Role Selects
function updateRoleSelects(students) {
    const options = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('presidentSelect').innerHTML = options;
    document.getElementById('vicePresidentSelect').innerHTML = options;
    document.getElementById('dutySelect').innerHTML = options;
    document.getElementById('starSelect').innerHTML = options;
}

// Assign Role
window.assignRole = async function (roleType) {
    let studentId;
    if (roleType === 'president') studentId = document.getElementById('presidentSelect').value;
    if (roleType === 'vice_president') studentId = document.getElementById('vicePresidentSelect').value;
    if (roleType === 'duty') studentId = document.getElementById('dutySelect').value;
    if (roleType === 'star') studentId = document.getElementById('starSelect').value;

    if (!studentId) {
        Utils.showError('Lütfen bir öğrenci seçin.');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, role_type: roleType })
        });

        const data = await response.json();

        if (!response.ok) {
            Utils.showError(data.error || 'Rol atanırken hata oluştu');
            return;
        }

        Utils.showSuccess(data.message || 'Rol başarıyla atandı!');
        fetchRoles();
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error assigning role', e);
        }
        Utils.showError('Görev atama sırasında hata oluştu.');
    }
};

// Render Roles
function renderRoles(roles) {

    const president = roles.find(r => r.role_type === 'president');
    const presidentHtml = president ?
        `✅ ${president.name} <button class="remove-role-btn" data-id="${president.role_id}">Kaldır</button>` : '---';
    document.getElementById('currentPresident').innerHTML = presidentHtml;

    const vicePresidents = roles.filter(r => r.role_type === 'vice_president');
    document.getElementById('currentVicePresidents').innerHTML = vicePresidents.map(vp => {
        return `<div>👑 ${vp.name} <button class="remove-role-btn" data-id="${vp.role_id}">Kaldır</button></div>`;
    }).join('') || '---';

    const duties = roles.filter(r => r.role_type === 'duty');
    document.getElementById('currentDuty').innerHTML = duties.map(d => {
        return `<div>📋 ${d.name} <button class="remove-role-btn" data-id="${d.role_id}">Kaldır</button></div>`;
    }).join('');

    const stars = roles.filter(r => r.role_type === 'star');
    document.getElementById('currentStars').innerHTML = stars.map(s => {
        return `<div>⭐ ${s.name} <button class="remove-role-btn" data-id="${s.role_id}">Kaldır</button></div>`;
    }).join('');
    // Event delegation is handled in DOMContentLoaded - no need to add listeners here
}

// Remove Role - Explicitly attached to window
window.removeRole = async function (roleId) {
    if (!confirm('Bu rolü kaldırmak istediğinize emin misiniz?')) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/roles/${roleId}`, { method: 'DELETE' });

        // Check response status before parsing JSON
        if (!response.ok) {
            let errorMessage = 'Rol kaldırılırken hata oluştu';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
                // If JSON parsing fails, try to get text
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                } catch (textError) {
                    // Silent - nested error
                }
            }
            Utils.showError(errorMessage);
            return;
        }

        // Parse JSON only if response is OK
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            // Silent - JSON parse error (expected for some responses)
            // Even if JSON parsing fails, if status is OK, consider it success
            Utils.showSuccess('Rol başarıyla kaldırıldı!');
            fetchRoles();
            return;
        }

        Utils.showSuccess('Rol başarıyla kaldırıldı!');
        fetchRoles();
    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error removing role', e, { roleId });
        }
        Utils.showError('Rol kaldırılırken hata oluştu.');
    }
};

// Save Settings
window.saveSetting = async function (key) {
    let value;
    if (key === 'message') value = document.getElementById('messageInput').value;
    // City setting removed for offline operation

    try {
        const response = await fetch(`${CONFIG.API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });

        const data = await response.json();

        if (!response.ok) {
            Utils.showError(data.error || 'Ayarlar kaydedilirken hata oluştu');
            return;
        }

        Utils.showSuccess('Ayarlar başarıyla kaydedildi!');
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving settings', e); }
        Utils.showError('Ayarlar kaydedilirken hata oluştu.');
    }
};

// QR Code - Simple URL display for offline operation
window.showQRCode = function () {
    document.getElementById('qrModal').style.display = 'flex';
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
};

window.closeQRCode = function () {
    document.getElementById('qrModal').style.display = 'none';
};

// Photo Upload Modal Functions
window.showPhotoUploadModal = function (studentId, studentName) {
    document.getElementById('photoUploadStudentId').value = studentId;
    document.getElementById('photoUploadStudentName').textContent = studentName;
    document.getElementById('photoUploadModal').style.display = 'flex';
    document.getElementById('photoUploadForm').reset();
};

window.closePhotoUploadModal = function () {
    document.getElementById('photoUploadModal').style.display = 'none';
};

// Upload Photo Handler
document.addEventListener('DOMContentLoaded', () => {
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

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                Utils.showError('Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP).');
                return;
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                Utils.showError('Resim dosyası çok büyük. Maksimum 5MB olmalıdır.');
                return;
            }

            // Show loading state
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
                    // Read response body only once
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorMessage;
                        } catch (parseError) {
                            // Silent - nested error
                            errorMessage = `Resim yüklenirken hata oluştu (${response.status} ${response.statusText})`;
                        }
                    } else {
                        try {
                            const errorText = await response.text();
                            errorMessage = errorText || errorMessage;
                        } catch (textError) {
                            // Silent - nested error
                            errorMessage = `Resim yüklenirken hata oluştu (${response.status} ${response.statusText})`;
                        }
                    }
                    Utils.showError(errorMessage);
                    return;
                }

                const data = await response.json();
                Utils.showSuccess('Resim başarıyla yüklendi!');
                closePhotoUploadModal();
                fetchStudents(); // Refresh student list
            } catch (e) {
                if (typeof logger !== 'undefined') {
                    logger.error(COMPONENTS.ADMIN, 'Error uploading photo', e);
                }
                Utils.showError('Resim yüklenirken hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
            } finally {
                // Restore button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
});

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

    // Set up event delegation for delete buttons and photo upload buttons (only once)
    // For student delete buttons and photo upload buttons
    document.getElementById('studentList').addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            deleteStudent(id);
        } else if (e.target && e.target.classList.contains('upload-photo-btn')) {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            showPhotoUploadModal(id, name);
        }
    });

    // For role remove buttons - use roles section as parent for event delegation
    const rolesSection = document.getElementById('roles');
    rolesSection.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('remove-role-btn')) {
            const id = e.target.getAttribute('data-id');
            removeRole(id);
        }
    });

    // Set today's date in attendance date input
    setTodayDate();

    // Excel Import Form - WITH CONTENT PREVIEW & CLEAR BUTTON
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
                                <div style="font-size: 0.9rem;">${file.name}</div>
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

                // Parse and preview Excel content
                parseExcelFile(file);
            }
        });
    }

    // Clear Excel file function
    window.clearExcelFile = function () {
        if (excelFileInput) {
            excelFileInput.value = '';
            excelImportResult.style.display = 'none';
            excelImportResult.innerHTML = '';
        }
    };

    // Parse Excel file and show preview
    function parseExcelFile(file) {
        // Check if XLSX library is loaded
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

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                console.log('First sheet:', firstSheetName, worksheet);

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                console.log('JSON data:', jsonData);
                console.log('Number of rows:', jsonData.length);

                // DEBUG: Show first 3 rows content
                console.log('First row (header):', jsonData[0]);
                console.log('Second row (sample):', jsonData[1]);
                console.log('Third row (sample):', jsonData[2]);

                // Check if data is empty
                if (!jsonData || jsonData.length === 0) {
                    document.getElementById('excelContentPreview').innerHTML = `
                        <div style="color: #ff9800; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 6px;">
                            ⚠️ Excel dosyası boş görünüyor. Lütfen başlık ve veri satırları içeren bir dosya seçin.
                        </div>
                    `;
                    return;
                }

                // Create HTML table
                let tableHTML = '<div style="margin-top: 10px;"><div style="font-weight: 600; margin-bottom: 8px;">📋 İçerik Önizlemesi (İlk 10 satır):</div>';
                tableHTML += '<div style="overflow-x: auto; max-height: 300px; overflow-y: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; background: white; border-radius: 6px; overflow: hidden;">';

                // Determine which columns have data (not all empty)
                const maxCols = Math.max(...jsonData.map(row => row ? row.length : 0));
                const nonEmptyCols = [];

                for (let col = 0; col < maxCols; col++) {
                    // Check if this column has any non-empty value
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

                // Show first 10 rows
                const maxRows = Math.min(jsonData.length, 10);
                for (let i = 0; i < maxRows; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue; // Skip empty rows

                    tableHTML += '<tr>';
                    // Only show non-empty columns
                    for (const colIndex of nonEmptyCols) {
                        const cellValue = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '';
                        const cellStyle = i === 0
                            ? 'padding: 8px; border: 1px solid #ddd; background: var(--primary); color: white; font-weight: 600; white-space: nowrap;'
                            : 'padding: 8px; border: 1px solid #ddd; white-space: nowrap; color: #333; background: white;';
                        tableHTML += `<td style="${cellStyle}">${cellValue}</td>`;
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
                        ⚠️ Excel dosyası okunamadı: ${error.message}
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

            // Check file extension
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
                        errorMessage = errorData.error || errorMessage;
                        if (errorData.errors && Array.isArray(errorData.errors)) {
                            errorMessage += '<br><ul style="margin-top: 10px; padding-left: 20px;">';
                            errorData.errors.forEach(err => {
                                errorMessage += `<li>${err}</li>`;
                            });
                            errorMessage += '</ul>';
                        }
                    } catch (parseError) {
                        try {
                            const errorText = await responseClone.text();
                            errorMessage = errorText || errorMessage;
                        } catch (textError) {
                            // Silent - nested error
                            errorMessage = `Excel yüklenirken hata oluştu (${response.status} ${response.statusText})`;
                        }
                    }
                    resultDiv.innerHTML = `<p style="color: #d32f2f;">${errorMessage}</p>`;
                    Utils.showError('Excel yüklenirken hata oluştu');
                    return;
                }

                const data = await response.json();
                let resultHtml = `<p style="color: #2e7d32; font-weight: bold;">${data.message}</p>`;

                if (data.failed > 0) {
                    resultHtml += `<p style="color: #d32f2f;">${data.failed} öğrenci eklenemedi</p>`;
                }

                if (data.errors && data.errors.length > 0) {
                    resultHtml += '<ul style="margin-top: 10px; padding-left: 20px; color: #d32f2f;">';
                    data.errors.forEach(err => {
                        resultHtml += `<li>${err}</li>`;
                    });
                    resultHtml += '</ul>';
                }

                resultDiv.innerHTML = resultHtml;
                Utils.showSuccess(data.message);

                // Clear file input
                fileInput.value = '';

                // Refresh student list
                fetchStudents();
            } catch (e) {
                if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error importing Excel', e); }
                resultDiv.innerHTML = '<p style="color: #d32f2f;">Excel yüklenirken hata oluştu.</p>';
                Utils.showError('Excel yüklenirken hata oluştu.');
            }
        });
    }

    // Photo Upload Preview - WITH CLEAR BUTTON
    const photoFileInput = document.getElementById('photoFileInput');
    if (photoFileInput) {
        photoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            let previewContainer = document.getElementById('photoPreviewContainer');

            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!previewContainer) {
                        // Create preview container if it doesn't exist
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

    // Clear photo file function
    window.clearPhotoFile = function () {
        const photoInput = document.getElementById('photoFileInput');
        const previewContainer = document.getElementById('photoPreviewContainer');

        if (photoInput) {
            photoInput.value = '';
        }
        if (previewContainer) {
            previewContainer.remove();
        }
    };

    fetchStudents();
    fetchRoles();
    fetchSettings();
    // fetchWord(); - removed, feature deprecated
    fetchSlides();
    fetchSlideSettings();
    fetchEqualizerTheme();

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

    fetchEqualizerTheme();
});

// ===== SLIDE MANAGEMENT FUNCTIONS =====

let allSlides = [];
let currentEditingSlide = null;

async function fetchSlides() {
    try {
        logger.debug(COMPONENTS.ADMIN, 'Fetching slides', null);
        const res = await fetch(`${CONFIG.API_URL}/slides`);
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

        return `
            <div class="slide-item" data-id="${slide.id}" data-order="${slide.display_order}" draggable="true" style="display: flex; align-items: center; gap: 15px; padding: 15px; margin-bottom: 10px; background: white; border-radius: 8px; border: 1px solid #ddd; cursor: move;">
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
                        ${slide.is_active ? '<span style="color: green;">✓ Aktif</span>' : '<span style="color: red;">✗ Pasif</span>'}
                    </div>
                    ${slide.text_content ? `<div style="color: #666; font-size: 0.9rem; margin-top: 5px;">${slide.text_content.substring(0, 50)}${slide.text_content.length > 50 ? '...' : ''}</div>` : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="editSlide(${slide.id})" style="padding: 5px 10px; background: var(--secondary); color: white; border: none; border-radius: 4px; cursor: pointer;">Düzenle</button>
                    <button onclick="toggleSlideActive(${slide.id})" style="padding: 5px 10px; background: ${slide.is_active ? '#ff9800' : '#4caf50'}; color: white; border: none; border-radius: 4px; cursor: pointer;">${slide.is_active ? 'Pasif' : 'Aktif'}</button>
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
        await fetch(`${CONFIG.API_URL}/slide-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'default_duration', value: (parseInt(duration) * 1000).toString() })
        });

        await fetch(`${CONFIG.API_URL}/slide-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'default_transition_mode', value: transitionMode })
        });

        await fetch(`${CONFIG.API_URL}/slide-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'default_transition_duration', value: (parseFloat(transitionDuration) * 1000).toString() })
        });

        Utils.showSuccess('Ayarlar başarıyla kaydedildi!');
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving slide settings', e); }
        Utils.showError('Ayarlar kaydedilirken hata oluştu.');
    }
}

// Attendance Functions
let allStudentsForAttendance = [];
let currentAttendanceDate = '';

window.setTodayDate = function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    loadAttendanceForDate();
};

window.loadAttendanceForDate = async function () {
    const dateInput = document.getElementById('attendanceDate');
    const date = dateInput.value;

    if (!date) {
        Utils.showError('Lütfen bir tarih seçin.');
        return;
    }

    currentAttendanceDate = date;

    try {
        // Fetch all students
        const studentsRes = await fetch(`${CONFIG.API_URL}/students`);
        if (!studentsRes.ok) {
            throw new Error(`HTTP ${studentsRes.status}: ${studentsRes.statusText}`);
        }
        const students = await studentsRes.json();
        allStudentsForAttendance = students;

        // Fetch today's attendance
        const attendanceRes = await fetch(`${CONFIG.API_URL}/attendance/${date}`);
        if (!attendanceRes.ok) {
            throw new Error(`HTTP ${attendanceRes.status}: ${attendanceRes.statusText}`);
        }
        const attendance = await attendanceRes.json();

        // Create attendance map
        const attendanceMap = {};
        attendance.forEach(a => {
            attendanceMap[a.student_id] = a.status;
        });

        // Render attendance list
        renderAttendanceList(students, attendanceMap);
        updateAttendanceSummary(students, attendanceMap);
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error loading attendance', e); }
        Utils.showError('Yoklama yüklenirken hata oluştu.');
    }
};

function renderAttendanceList(students, attendanceMap) {
    const list = document.getElementById('attendanceList');
    list.innerHTML = students.map(s => {
        const avatarPath = Utils.getAvatarPath(s);
        const currentStatus = attendanceMap[s.id] || 'present'; // Default to present
        return `
        <div class="student-item" style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 8px;">
            <img src="../${avatarPath}" class="student-thumb" onerror="this.src='../assets/default_boy.png'" style="width: 50px; height: 50px; border-radius: 50%;">
            <span style="flex: 1;">${s.name} (${s.gender === 'M' ? 'Erkek' : 'Kız'})</span>
            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="radio" name="attendance_${s.id}" value="present" ${currentStatus === 'present' ? 'checked' : ''} data-student-id="${s.id}">
                <span>Var</span>
            </label>
            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="radio" name="attendance_${s.id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''} data-student-id="${s.id}">
                <span>Yok</span>
            </label>
        </div>
    `;
    }).join('');
}

function updateAttendanceSummary(students, attendanceMap) {
    const total = students.length;
    let present = 0;
    let absent = 0;

    students.forEach(s => {
        const status = attendanceMap[s.id] || 'present';
        if (status === 'present') present++;
        else absent++;
    });

    document.getElementById('attendanceSummaryContent').innerHTML = `
        <p><strong>Toplam:</strong> ${total} öğrenci</p>
        <p style="color: green;"><strong>Var:</strong> ${present} öğrenci</p>
        <p style="color: red;"><strong>Yok:</strong> ${absent} öğrenci</p>
    `;
}

window.saveAttendance = async function () {
    if (!currentAttendanceDate) {
        Utils.showError('Lütfen bir tarih seçin.');
        return;
    }

    // Collect attendance data from radio buttons
    const attendanceList = [];
    allStudentsForAttendance.forEach(s => {
        const radioButtons = document.querySelectorAll(`input[name="attendance_${s.id}"]`);
        let status = 'present'; // default
        radioButtons.forEach(radio => {
            if (radio.checked) {
                status = radio.value;
            }
        });
        attendanceList.push({
            student_id: s.id,
            status: status
        });
    });

    try {
        const response = await fetch(`${CONFIG.API_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: currentAttendanceDate,
                attendanceList: attendanceList
            })
        });

        if (!response.ok) {
            let errorMessage = 'Yoklama kaydedilirken hata oluştu';
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    // Silent - nested error
                    errorMessage = `Yoklama kaydedilirken hata oluştu (${response.status} ${response.statusText})`;
                }
            } else {
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                } catch (textError) {
                    // Silent - nested error
                    errorMessage = `Yoklama kaydedilirken hata oluştu (${response.status} ${response.statusText})`;
                }
            }
            Utils.showError(errorMessage);
            return;
        }

        const data = await response.json();
        Utils.showSuccess('Yoklama başarıyla kaydedildi!');
        // Refresh attendance display
        loadAttendanceForDate();
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving attendance', e); }
        Utils.showError('Yoklama kaydedilirken hata oluştu.');
    }
};
// Equalizer Theme Management
const THEME_GRADIENTS = {
    neon: ['#ff0055', '#ffaa00', '#00ff00'],
    ocean: ['#0000ff', '#00ffff', '#ffffff'],
    sunset: ['#cc00cc', '#ff0066', '#ff9933'],
    forest: ['#009900', '#66ff00', '#ccff00'],
    love: ['#ff0000', '#ff3366', '#ff0066'],
    royal: ['#4b0082', '#9933ff', '#cc00ff'],
    ice: ['#0055ff', '#00aaff', '#00ffff'],
    fire: ['#ff0000', '#ff6600', '#ffcc00'],
    matrix: ['#003300', '#00ff00', '#00ff00'],
    rainbow: ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
};

window.setEqualizerTheme = async function (themeName) {
    // 1. UI Update (Immediate Feedback)
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`theme-btn-${themeName}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.getElementById('currentThemeDisplay').textContent = `Seçili Tema: ${themeName.toUpperCase()}`;

    // 2. Update Preview
    updateThemePreview(themeName);

    try {
        const response = await fetch(`${CONFIG.API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'equalizer_theme', value: themeName })
        });

        if (!response.ok) {
            Utils.showError('Tema değiştirilirken hata oluştu');
            return;
        }

        Utils.showSuccess(`Tema değiştirildi: ${themeName.toUpperCase()}`);
    } catch (e) {
        if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error setting theme', e); }
        Utils.showError('Tema değiştirilirken hata oluştu.');
    }
};

window.fetchEqualizerTheme = async function () {
    try {
        const res = await fetch(`${CONFIG.API_URL}/settings`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const settings = await res.json();

        let theme = 'neon'; // varsayılan

        // settings array mi obje mi kontrol et
        if (Array.isArray(settings)) {
            const found = settings.find(s => s.key === 'equalizer_theme');
            if (found) theme = found.value;
        } else if (settings.equalizer_theme) {
            theme = settings.equalizer_theme;
        }

        document.getElementById('currentThemeDisplay').textContent = `Seçili Tema: ${theme.toUpperCase()}`;

        // Butonu aktif yap
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`theme-btn-${theme}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Önizlemeyi güncelle
        updateThemePreview(theme);

    } catch (e) {
        if (typeof logger !== 'undefined') {
            logger.error(COMPONENTS.ADMIN, 'Error fetching theme', e);
        }
        // Varsayılan tema ile önizlemeyi güncelle
        updateThemePreview('neon');
    }
};

// =============================================
// ADMIN EQUALİZER ÖNİZLEME - GERÇEK MİKROFON
// =============================================
let adminAudioContext = null;
let adminAnalyser = null;
let adminMicrophone = null;
let adminDataArray = null;
let adminIsListening = false;
let adminEqBars = [];
let adminEqPeaks = [];
let adminCurrentTheme = 'neon';
let adminPeakLevels = new Array(128).fill(0);
let adminPeakHoldCounters = new Array(128).fill(0);

const ADMIN_THEMES = {
    neon: ['#ff0055', '#ffaa00', '#ffff00', '#00ff00'],
    fire: ['#ff0000', '#ff4500', '#ffcc00', '#ffff00'],
    ocean: ['#0000ff', '#0088ff', '#00ffff', '#e0ffff'],
    forest: ['#009900', '#33cc33', '#66ff66', '#ccff00'],
    sunset: ['#cc00cc', '#ff0066', '#ff9933', '#ffff00'],
    love: ['#ff0000', '#ff0066', '#ff3399', '#ff99cc'],
    royal: ['#4b0082', '#9900cc', '#cc00ff', '#ffd700'],
    matrix: ['#002200', '#006600', '#00cc00', '#00ff00'],
    ice: ['#0055ff', '#00aaff', '#00ffff', '#ffffff'],
    rainbow: ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
};

function initAdminEqualizer() {
    const eqWrapper = document.querySelector('#equalizer-container .equalizer-bars');
    if (!eqWrapper) return;

    // 128 bar oluştur - ana sayfa ile aynı
    eqWrapper.innerHTML = '';
    adminEqBars = [];
    adminEqPeaks = [];
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
        eqWrapper.appendChild(column);
        adminEqBars.push(bar);
        adminEqPeaks.push(peak);
    }
}

window.startAdminMicrophone = async function () {
    if (adminIsListening) return;

    const statusEl = document.getElementById('admin-mic-status');
    const btnEl = document.getElementById('admin-mic-btn');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        adminAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        adminAnalyser = adminAudioContext.createAnalyser();
        adminMicrophone = adminAudioContext.createMediaStreamSource(stream);

        adminAnalyser.fftSize = 1024;
        adminAnalyser.smoothingTimeConstant = 0.7;
        adminMicrophone.connect(adminAnalyser);

        const bufferLength = adminAnalyser.frequencyBinCount;
        adminDataArray = new Uint8Array(bufferLength);

        adminIsListening = true;

        if (btnEl) btnEl.style.display = 'none';
        if (statusEl) {
            statusEl.textContent = '🎤 Dinleniyor...';
            statusEl.style.color = '#2ed573';
        }

        // Barları oluştur
        initAdminEqualizer();

        // Döngüyü başlat
        adminUpdateLoop();

    } catch (error) {
        console.error('Microphone error:', error);
        if (statusEl) {
            statusEl.textContent = '❌ Mikrofon İzni Gerekli';
            statusEl.style.color = '#ff4757';
        }
    }
};

function adminUpdateLoop() {
    if (!adminIsListening) return;
    requestAnimationFrame(adminUpdateLoop);

    adminAnalyser.getByteFrequencyData(adminDataArray);

    const totalBars = 128;
    const totalBins = adminDataArray.length;
    const step = 5;
    const palette = ADMIN_THEMES[adminCurrentTheme] || ADMIN_THEMES.neon;

    for (let i = 0; i < totalBars; i++) {
        const bar = adminEqBars[i];
        const peak = adminEqPeaks[i];
        if (!bar) continue;

        const startBin = Math.floor(Math.pow(i / totalBars, 1.8) * (totalBins - 50));
        const endBin = Math.floor(Math.pow((i + 1) / totalBars, 1.8) * (totalBins - 50)) + 1;

        let sum = 0;
        let count = 0;
        for (let j = startBin; j < endBin; j++) {
            if (j < totalBins) {
                sum += adminDataArray[j];
                count++;
            }
        }
        if (count === 0 && startBin < totalBins) {
            sum = adminDataArray[startBin];
            count = 1;
        }

        let avg = count > 0 ? sum / count : 0;
        if (avg < 5) avg = 0;

        let amplification = 1.5;
        if (i < 32) amplification = 1.25;
        if (i > 64) amplification = 2.5;
        if (i > 96) amplification = 4.0;

        let percent = (avg / 255) * 100 * amplification;
        percent = Math.min(100, Math.max(0, percent));

        let quantizedPercent = Math.floor(percent / step) * step;
        if (quantizedPercent < step && avg > 0) quantizedPercent = step;
        if (avg === 0) quantizedPercent = 0;

        // Peak Hold
        if (adminPeakLevels[i] < quantizedPercent) {
            adminPeakLevels[i] = quantizedPercent;
            adminPeakHoldCounters[i] = 30;
        } else {
            if (adminPeakHoldCounters[i] > 0) adminPeakHoldCounters[i]--;
            else adminPeakLevels[i] -= 0.25;
        }
        if (adminPeakLevels[i] < quantizedPercent) adminPeakLevels[i] = quantizedPercent;

        // Renk hesapla
        let color;
        if (i < 32) color = palette[0];
        else if (i < 64) color = palette[1];
        else if (i < 96) color = palette[2];
        else color = palette[3];

        bar.style.height = `${quantizedPercent}%`;
        bar.style.backgroundColor = color;

        if (peak) {
            let displayPeak = Math.floor(adminPeakLevels[i] / step) * step;
            if (displayPeak > 0) {
                peak.style.bottom = `${displayPeak}%`;
                peak.style.opacity = 0.9;
            } else {
                peak.style.opacity = 0;
            }
        }
    }
}

// Tema değiştiğinde admin önizlemeyi de güncelle
function updateThemePreview(themeName) {
    adminCurrentTheme = themeName;

    // Equalizer container tema sınıfını güncelle
    const eqContainer = document.getElementById('equalizer-container');
    if (eqContainer) {
        const classes = eqContainer.className.split(' ').filter(c => !c.startsWith('theme-'));
        eqContainer.className = classes.join(' ');
        eqContainer.classList.add(`theme-${themeName}`);
    }
}

// Sayfa yüklendiğinde ekolayzer barlarını oluştur
document.addEventListener('DOMContentLoaded', function () {
    initAdminEqualizer();
});
