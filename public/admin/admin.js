
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
    AdminSlides.init({
        getSlides: () => allSlides,
        refreshSlides: fetchSlides
    });

    fetchStudents();
    fetchRoles();
    // fetchWord(); - removed, feature deprecated
    fetchSlides();
    AdminSlides.fetchSlideSettings();

});

// ===== SLIDE MANAGEMENT FUNCTIONS =====

let allSlides = [];

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
        AdminSlides.renderSlides(allSlides);
    } catch (e) {
        logger.error(COMPONENTS.ADMIN, 'Error fetching slides', e);
        Utils.showError('Slaytlar yüklenirken hata oluştu.');
    }
}
