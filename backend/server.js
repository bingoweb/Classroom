require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');
const XLSX = require('xlsx');
const { Logger, COMPONENTS, LOG_LEVELS } = require('./logger');
const { normalizePath } = require('./utils');
const { getIstanbulDateKey } = require('./date-utils');
const { validateNormalizedSchedule, resolveScheduleDayKey, isValidDayKey } = require('./schedule-service');
const { getNormalizedScheduleRows, replaceNormalizedSchedule } = require('./schedule-repository');
const { readAdminPassword, matchesAdminPassword } = require('./admin-auth-config.js');
const { createAdminSessionStore } = require('./admin-session-store.js');
const {
    serializeAdminSessionCookie,
    serializeClearedAdminSessionCookie,
    readAdminSessionIdFromCookieHeader
} = require('./admin-session-cookie.js');
const { createFailureRateLimiter, createRequestRateLimiter } = require('./request-rate-limiter.js');

const crypto = require('crypto');
const csrfSecret = crypto.randomBytes(32);

function generateCsrfToken(sessionId) {
    return crypto.createHmac('sha256', csrfSecret).update(sessionId).digest('hex');
}

function requireCsrfToken(req, res, next) {
    const token = req.headers['x-csrf-token'];
    
    if (typeof token !== 'string') {
        return res.status(403).json({ error: 'CSRF doğrulaması başarısız.' });
    }

    const expected = generateCsrfToken(req.adminSessionId);

    if (token.length !== 64 || !/^[0-9a-f]{64}$/i.test(token)) {
        return res.status(403).json({ error: 'CSRF doğrulaması başarısız.' });
    }

    try {
        const tokenBuf = Buffer.from(token, 'hex');
        const expectedBuf = Buffer.from(expected, 'hex');
        
        if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
            return res.status(403).json({ error: 'CSRF doğrulaması başarısız.' });
        }
    } catch (err) {
        return res.status(403).json({ error: 'CSRF doğrulaması başarısız.' });
    }
    
    next();
}
// File deletion utility - prevents code duplication
function safeDeleteFile(filePath, component = COMPONENTS.API) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        logger.warn(component, 'Error deleting file', err, { filePath });
    }
}

function cleanupManagedPhoto(oldPhoto, uploadsDirectory) {
    const uploadPrefix = '/uploads/';
    if (
        typeof oldPhoto === 'string' &&
        oldPhoto !== 'assets/default_boy.png' &&
        oldPhoto !== 'assets/default_girl.png' &&
        oldPhoto.startsWith(uploadPrefix)
    ) {
        const oldFilename = oldPhoto.slice(uploadPrefix.length);

        const isSingleSafeFilename =
            oldFilename.length > 0 &&
            oldFilename !== '.' &&
            oldFilename !== '..' &&
            !oldFilename.includes('/') &&
            !oldFilename.includes('\\') &&
            !oldFilename.includes('\0');

        if (isSingleSafeFilename) {
            const uploadsRoot = path.resolve(uploadsDirectory);
            const oldFilePath = path.resolve(uploadsRoot, oldFilename);
            const remainsInsideUploads = oldFilePath.startsWith(uploadsRoot + path.sep);

            if (remainsInsideUploads) {
                safeDeleteFile(oldFilePath);
            }
        }
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize logger
const logger = new Logger();
logger.init({ logLevel: LOG_LEVELS.INFO });

// Ensure logs directory exists
fs.mkdirSync('logs', { recursive: true });

app.use(express.json());

const adminSessionStore = createAdminSessionStore();

function requireAdminSession(req, res, next) {
    const cookieHeader = req.headers.cookie;
    let hasSession = false;
    let activeSessionId = null;
    if (cookieHeader) {
        const sessionId = readAdminSessionIdFromCookieHeader(cookieHeader);
        if (sessionId && adminSessionStore.hasSession(sessionId)) {
            hasSession = true;
            activeSessionId = sessionId;
        }
    }

    if (!hasSession) {
        if (req.method === 'GET' && (req.originalUrl === '/admin' || req.originalUrl === '/admin/')) {
            const accept = req.headers.accept || '';
            if (accept.includes('text/html')) {
                return res.redirect(302, '/admin-login.html?next=/admin/');
            }
        }
        return res.status(401).json({ authenticated: false, message: 'Yönetici oturumu gerekli.' });
    }
    req.adminSessionId = activeSessionId;
    next();
}

const requireAdminWriteRateLimit = createRequestRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyGenerator: (req) => req.adminSessionId,
    message: { error: "Çok fazla yönetici işlemi yapıldı. Lütfen kısa bir süre sonra tekrar deneyin." }
});

app.use('/admin', requireAdminSession);

// Serve static files from PUBLIC directory (Frontend)
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));

// Upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine destination based on field name
        if (file.fieldname === 'slide') {
            cb(null, path.join(__dirname, 'uploads/slides/'));
        } else {
            cb(null, path.join(__dirname, 'uploads/'));
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
    }
});

// Regular upload (for photos, etc.) - 10MB limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Slides upload - 100MB limit
const uploadSlide = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: function (req, file, cb) {
        // Accept images, gifs, and videos
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) ||
            file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/');

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Sadece resim (jpg, png, gif) ve video (mp4, webm, mov) dosyaları yüklenebilir!'));
        }
    }
});

// Ensure uploads directory exists (in root, relative to backend)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
const slidesDir = path.join(__dirname, 'uploads/slides');
if (!fs.existsSync(slidesDir)) {
    fs.mkdirSync(slidesDir, { recursive: true });
}

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

// --- API Endpoints ---

function isAdminCookieSecure() {
    return process.env.CLASSROOM_ADMIN_COOKIE_SECURE === 'true';
}

const loginFailureLimiter = createFailureRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxFailures: 5,
    keyGenerator: (req) => (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : 'unknown',
    message: {
        authenticated: false,
        message: "Çok fazla başarısız giriş denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin."
    }
});

app.post('/api/admin/login', loginFailureLimiter.guard, (req, res) => {
    const configuredPassword = readAdminPassword();

    if (configuredPassword === null) {
        return res.status(503).json({
            authenticated: false,
            message: 'Yönetici parolası yapılandırılmamış.'
        });
    }

    if (!req.body || typeof req.body.password !== 'string') {
        return res.status(400).json({
            authenticated: false,
            message: 'Geçersiz parola formatı.'
        });
    }

    if (!matchesAdminPassword(req.body.password)) {
        loginFailureLimiter.recordFailure(req);
        return res.status(401).json({
            authenticated: false,
            message: 'Parola hatalı.'
        });
    }

    loginFailureLimiter.reset(req);

    const session = adminSessionStore.createSession();
    const cookieString = serializeAdminSessionCookie(session.id, {
        secure: isAdminCookieSecure()
    });

    res.setHeader('Set-Cookie', cookieString);
    res.status(200).json({
        authenticated: true,
        message: 'Yönetici oturumu açıldı.'
    });
});

app.post('/api/admin/logout', (req, res) => {
    const cookieHeader = req.headers.cookie;
    const sessionId = readAdminSessionIdFromCookieHeader(cookieHeader);

    if (sessionId) {
        adminSessionStore.deleteSession(sessionId);
    }

    const clearingCookie = serializeClearedAdminSessionCookie({
        secure: isAdminCookieSecure()
    });

    res.setHeader('Set-Cookie', clearingCookie);
    res.status(200).json({
        authenticated: false,
        message: 'Yönetici oturumu kapatıldı.'
    });
});

app.get('/api/admin/session', (req, res) => {
    const cookieHeader = req.headers.cookie;
    const sessionId = readAdminSessionIdFromCookieHeader(cookieHeader);

    if (sessionId && adminSessionStore.hasSession(sessionId)) {
        res.setHeader('X-CSRF-Token', generateCsrfToken(sessionId));
        return res.status(200).json({ authenticated: true });
    }

    res.status(200).json({ authenticated: false });
});

// Get all students
app.get('/api/students', (req, res) => {
    const query = "SELECT * FROM students";
    const params = [];

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching students',
                err,
                { query, params }
            );

            return res.status(500).json({
                error: 'Öğrenciler alınırken hata oluştu'
            });
        }

        res.json(rows);
    });
});

// Input validation helper
function validateStudentInput(name, gender) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { valid: false, error: 'Öğrenci adı gereklidir' };
    }
    if (name.length > 100) {
        return { valid: false, error: 'Öğrenci adı çok uzun (maksimum 100 karakter)' };
    }
    if (gender && !['M', 'F'].includes(gender)) {
        return { valid: false, error: 'Geçersiz cinsiyet değeri' };
    }
    return { valid: true };
}

// Add student
app.post('/api/students', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, upload.single('photo'), (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        if (req.file) {
            safeDeleteFile(req.file.path);
        }
        return res.status(400).json({ error: 'Öğrenci adı gereklidir' });
    }
    const { name, gender } = req.body;

    // Input validation using helper function
    const validation = validateStudentInput(name, gender);
    if (!validation.valid) {
        if (req.file) {
            safeDeleteFile(req.file.path);
        }
        return res.status(400).json({ error: validation.error });
    }

    if (req.file) {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            safeDeleteFile(req.file.path);
            return res.status(400).json({ error: 'Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP)' });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            safeDeleteFile(req.file.path);
            return res.status(400).json({ error: 'Resim dosyası çok büyük. Maksimum 5MB olmalıdır.' });
        }
    }

    const photo = req.file ? `/uploads/${path.posix.basename(String(req.file.filename).replace(/\\/g, '/'))}` : null;
    db.run("INSERT INTO students (name, photo, gender) VALUES (?, ?, ?)", [name.trim(), photo, gender], function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error adding student', err, {
                studentName: name.trim(),
                gender: gender
            });
            if (req.file) {
                safeDeleteFile(req.file.path);
            }
            return res.status(500).json({ error: 'Öğrenci eklenirken hata oluştu' });
        }
        res.json({ id: this.lastID, name: name.trim(), photo, gender });
    });
});

// Import students from Excel
app.post('/api/students/import', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, upload.single('excel'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Excel dosyası gereklidir' });
    }

    try {
        // Read Excel file
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length === 0) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Excel dosyası boş' });
        }

        // Parse data - first row might be header
        let startRow = 0;
        let numberCol = -1;
        let firstNameCol = -1;
        let lastNameCol = -1;
        let nameCol = -1; // For combined name
        let genderCol = -1;

        // Check if first row is header
        const firstRow = data[0];
        if (firstRow && Array.isArray(firstRow)) {
            // Check if this looks like a header row
            const hasHeaderKeywords = firstRow.some(cell => {
                const cellStr = String(cell || '').toLowerCase();
                return cellStr.includes('öğrenci') || cellStr.includes('ad') || cellStr.includes('soyad') ||
                    cellStr.includes('cinsiyet') || cellStr.includes('numara') || cellStr.includes('no');
            });

            if (hasHeaderKeywords) {
                startRow = 1;
                // Try to find column indices
                firstRow.forEach((cell, idx) => {
                    const cellStr = String(cell || '');
                    const cellLower = cellStr.toLowerCase();

                    // Öğrenci no - encoding sorunlarına karşı daha esnek arama
                    if (cellStr && (cellStr.toLowerCase().includes('öğrenci') || cellStr.toLowerCase().includes('ogrenci')) &&
                        (cellStr.toLowerCase().includes('no') || cellStr.toLowerCase().includes('numara'))) {
                        numberCol = idx;
                    }
                    // Adı veya Ad sütunu (soyad içermeyen) - encoding sorunlarına karşı daha esnek
                    if (cellStr && (cellStr.toLowerCase() === 'adı' || cellStr.toLowerCase() === 'adi' ||
                        cellStr.toLowerCase() === 'ad') && !cellStr.toLowerCase().includes('soyad')) {
                        firstNameCol = idx;
                    } else if (cellLower.includes('ad') && !cellLower.includes('soyad') && firstNameCol === -1) {
                        firstNameCol = idx;
                    }
                    // Soyadı veya Soyad sütunu
                    if (cellStr && (cellStr.toLowerCase() === 'soyadı' || cellStr.toLowerCase() === 'soyadi' ||
                        cellStr.toLowerCase() === 'soyad' || cellLower.includes('soyad'))) {
                        lastNameCol = idx;
                    }
                    // Eğer "Ad Soyad" gibi birleşik bir sütun varsa
                    if (cellLower.includes('ad') && cellLower.includes('soyad') && !cellLower.includes('soyadı')) {
                        nameCol = idx;
                    }
                    // E-okul formatında "Cinsiyet" sütunu
                    if (cellStr && (cellStr.toLowerCase().includes('cinsiyet') || cellStr.toLowerCase().includes('cinsiyeti') ||
                        cellLower.includes('gender') || cellLower.includes('sex'))) {
                        genderCol = idx;
                    }
                });

                // E-okul formatı için fallback: Eğer sütunlar bulunamadıysa, standart pozisyonları kullan
                // E-okul formatı: S.No (0), Öğrenci No (1), Adı (4), Soyadı (9), Cinsiyeti (13)
                if (numberCol === -1 && firstRow.length > 1) {
                    // Öğrenci No genellikle 1. sütunda
                    if (String(firstRow[1] || '').toLowerCase().includes('no') ||
                        String(firstRow[1] || '').toLowerCase().includes('numara')) {
                        numberCol = 1;
                    }
                }
                if (firstNameCol === -1 && firstRow.length > 4) {
                    // Adı genellikle 4. sütunda
                    if (String(firstRow[4] || '').toLowerCase().includes('ad') &&
                        !String(firstRow[4] || '').toLowerCase().includes('soyad')) {
                        firstNameCol = 4;
                    }
                }
                if (lastNameCol === -1 && firstRow.length > 9) {
                    // Soyadı genellikle 9. sütunda
                    if (String(firstRow[9] || '').toLowerCase().includes('soyad')) {
                        lastNameCol = 9;
                    }
                }
                if (genderCol === -1 && firstRow.length > 13) {
                    // Cinsiyeti genellikle 13. sütunda
                    if (String(firstRow[13] || '').toLowerCase().includes('cinsiyet')) {
                        genderCol = 13;
                    }
                }
            } else {
                // If no header, assume: Number (col 0), Name (col 1), Gender (col 2)
                // Or: Name (col 0), Gender (col 1) if no number column
                if (data.length > startRow && data[startRow].length >= 3) {
                    numberCol = 0;
                    nameCol = 1;
                    genderCol = 2;
                } else {
                    nameCol = 0;
                    genderCol = 1;
                }
            }
        }

        // Normalize gender values (E-okul format: E=Erkek, K=Kız)
        const normalizeGender = (gender) => {
            if (!gender) return null;
            const g = String(gender).trim().toUpperCase();
            // E-okul formatı: E (Erkek), K (Kız)
            if (g === 'E' || g === 'ERKEK' || g === 'M' || g === 'MALE' || g === 'ER') return 'M';
            if (g === 'K' || g === 'KIZ' || g === 'F' || g === 'FEMALE' || g === 'KZ') return 'F';
            return null;
        };

        const students = [];
        const errors = [];

        // Process rows
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const number = numberCol >= 0 && row[numberCol] ? parseInt(row[numberCol]) : null;

            // Get name - either from combined nameCol or from firstName + lastName
            let name = '';
            if (nameCol >= 0 && row[nameCol]) {
                name = String(row[nameCol]).trim();
            } else if (firstNameCol >= 0 && lastNameCol >= 0) {
                const firstName = row[firstNameCol] ? String(row[firstNameCol]).trim() : '';
                const lastName = row[lastNameCol] ? String(row[lastNameCol]).trim() : '';
                name = `${firstName} ${lastName}`.trim();
            } else if (firstNameCol >= 0) {
                name = row[firstNameCol] ? String(row[firstNameCol]).trim() : '';
            }

            const gender = genderCol >= 0 ? normalizeGender(row[genderCol]) : null;

            // Skip empty rows
            if (!name || name === '') {
                continue;
            }

            if (!gender) {
                errors.push(`Satır ${i + 1} (${name}): Geçersiz cinsiyet (${row[genderCol] || 'boş'})`);
                continue;
            }

            students.push({ number: number !== null && !isNaN(number) ? number : null, name, gender });
        }

        // Sort by number if available, otherwise keep original order
        if (students.some(s => s.number !== null)) {
            students.sort((a, b) => {
                if (a.number === null && b.number === null) return 0;
                if (a.number === null) return 1;
                if (b.number === null) return -1;
                return a.number - b.number;
            });
        }

        if (students.length === 0) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Geçerli öğrenci bulunamadı',
                errors: errors
            });
        }

        // Insert students into database
        const stmt = db.prepare("INSERT INTO students (name, photo, gender) VALUES (?, ?, ?)");
        let inserted = 0;
        let failed = 0;
        const insertedStudents = [];

        students.forEach((student, idx) => {
            const defaultPhoto = student.gender === 'M' ? 'assets/default_boy.png' : 'assets/default_girl.png';
            stmt.run([student.name, defaultPhoto, student.gender], function (err) {
                if (err) {
                    logger.error(COMPONENTS.API, `Error inserting student ${student.name}`, err, {
                        studentName: student.name,
                        studentGender: student.gender
                    });
                    failed++;
                    errors.push(`Satır ${startRow + idx + 1} (${student.name}): Veritabanı hatası`);
                } else {
                    inserted++;
                    insertedStudents.push({ id: this.lastID, name: student.name, gender: student.gender });
                }

                // When all students are processed
                if (inserted + failed === students.length) {
                    stmt.finalize();
                    // Delete uploaded file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        message: `${inserted} öğrenci başarıyla eklendi`,
                        inserted: inserted,
                        failed: failed,
                        students: insertedStudents,
                        errors: errors.length > 0 ? errors : undefined
                    });
                }
            });
        });
    } catch (error) {
        logger.error(COMPONENTS.API, 'Error processing Excel file', error, {
            fileName: req.file ? req.file.originalname : 'unknown'
        });
        // Delete uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
            error: 'Excel dosyası işlenirken hata oluştu'
        });
    }
});

// Delete student
app.delete('/api/students/:id', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    const rawStudentId = req.params.id;

    if (
        typeof rawStudentId !== 'string' ||
        !/^[1-9]\d*$/.test(rawStudentId)
    ) {
        return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
    }

    const studentId = Number(rawStudentId);

    if (!Number.isSafeInteger(studentId)) {
        return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
    }

    const selectSql = "SELECT photo FROM students WHERE id = ?";
    const selectParams = [studentId];

    db.get(selectSql, selectParams, (err, row) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching student for deletion',
                err,
                {
                    endpoint: '/api/students/:id',
                    requestId: req.requestId,
                    studentId,
                    query: selectSql,
                    params: selectParams
                }
            );
            return res.status(500).json({
                error: 'Öğrenci silinirken hata oluştu'
            });
        }

        if (!row) {
            return res.status(404).json({ error: 'Öğrenci bulunamadı' });
        }

        const oldPhoto = row.photo;

        // Foreign keys should handle cascade delete automatically
        // No need for redundant manual role deletion
        const deleteSql = "DELETE FROM students WHERE id = ?";
        const deleteParams = [studentId];

        db.run(deleteSql, deleteParams, function (deleteErr) {
            if (deleteErr) {
                logger.error(
                    COMPONENTS.API,
                    'Error deleting student',
                    deleteErr,
                    {
                        endpoint: '/api/students/:id',
                        requestId: req.requestId,
                        studentId,
                        query: deleteSql,
                        params: deleteParams,
                        errorCode: deleteErr.code,
                        errorMessage: deleteErr.message
                    }
                );
                return res.status(500).json({
                    error: 'Öğrenci silinirken hata oluştu'
                });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Öğrenci bulunamadı' });
            }
            
            cleanupManagedPhoto(oldPhoto, uploadsDir);
            
            res.json({ message: "Öğrenci silindi", changes: this.changes });
        });
    });
});

// Update student photo
app.put('/api/students/:id/photo', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, upload.single('photo'), (req, res) => {
    const rawStudentId = req.params.id;

    if (
        typeof rawStudentId !== 'string' ||
        !/^[1-9]\d*$/.test(rawStudentId)
    ) {
        if (req.file) {
            safeDeleteFile(req.file.path);
        }
        return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
    }

    const studentId = Number(rawStudentId);

    if (!Number.isSafeInteger(studentId)) {
        if (req.file) {
            safeDeleteFile(req.file.path);
        }
        return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Resim dosyası gereklidir' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        safeDeleteFile(req.file.path);
        return res.status(400).json({ error: 'Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP)' });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
        safeDeleteFile(req.file.path);
        return res.status(400).json({ error: 'Resim dosyası çok büyük. Maksimum 5MB olmalıdır.' });
    }

    // First, get the current student to find old photo
    db.get("SELECT photo FROM students WHERE id = ?", [studentId], (err, row) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching student for photo update', err, {
                studentId: studentId
            });
            // Delete uploaded file on error
            safeDeleteFile(req.file.path);
            return res.status(500).json({ error: 'Öğrenci bulunurken hata oluştu' });
        }

        if (!row) {
            // Delete uploaded file if student not found
            safeDeleteFile(req.file.path);
            return res.status(404).json({ error: 'Öğrenci bulunamadı' });
        }

        const oldPhoto = row.photo;
        const newPhoto = `/uploads/${path.posix.basename(String(req.file.filename).replace(/\\/g, '/'))}`;

        // Update the photo in database
        db.run("UPDATE students SET photo = ? WHERE id = ?", [newPhoto, studentId], function (updateErr) {
            if (updateErr) {
                logger.error(COMPONENTS.API, 'Error updating student photo', updateErr, {
                    studentId: studentId,
                    newPhoto: newPhoto
                });
                // Delete uploaded file on DB error
                safeDeleteFile(req.file.path);
                return res.status(500).json({ error: 'Resim güncellenirken hata oluştu' });
            }

            if (this.changes === 0) {
                // No rows updated - student might have been deleted
                safeDeleteFile(req.file.path);
                return res.status(404).json({ error: 'Öğrenci bulunamadı veya güncellenemedi' });
            }

            // Delete old photo file if it exists and is not a default photo
            cleanupManagedPhoto(oldPhoto, uploadsDir);

            res.json({ message: "Resim başarıyla güncellendi", photo: newPhoto });
        });
    });
});

// Get Roles
app.get('/api/roles', (req, res) => {
    const sql = `SELECT roles.id as role_id, roles.role_type, students.* 
                 FROM roles 
                 JOIN students ON roles.student_id = students.id`;
    const params = [];

    db.all(sql, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching roles',
                err,
                { query: sql, params }
            );

            return res.status(500).json({
                error: 'Roller alınırken hata oluştu'
            });
        }

        res.json(rows);
    });
});

// Assign Role
app.post('/api/roles', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Geçerli bir öğrenci seçilmelidir' });
    }
    const { student_id, role_type } = req.body;

    let studentId;

    if (typeof student_id === 'string') {
        if (!/^[1-9]\d*$/.test(student_id)) {
            return res.status(400).json({ error: 'Geçerli bir öğrenci seçilmelidir' });
        }
        studentId = Number(student_id);
    } else if (typeof student_id === 'number') {
        studentId = student_id;
    } else {
        return res.status(400).json({ error: 'Geçerli bir öğrenci seçilmelidir' });
    }

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: 'Geçerli bir öğrenci seçilmelidir' });
    }

    if (!role_type || !['president', 'vice_president', 'duty', 'star'].includes(role_type)) {
        return res.status(400).json({ error: 'Geçersiz rol tipi' });
    }
    // Role limits:
    // president: only 1 allowed (replace existing)
    // vice_president: max 2 allowed
    // duty: max 4 students
    // star: unlimited

    if (role_type === 'president') {
        db.get("SELECT id FROM students WHERE id = ?", [studentId], (err, row) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error checking president student', err);
                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
            }
            if (!row) {
                return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
            }
            db.run("BEGIN IMMEDIATE TRANSACTION", (err) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error beginning transaction for president role', err);
                    return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                }
                db.run("DELETE FROM roles WHERE role_type = ?", [role_type], (err) => {
                    if (err) {
                        logger.error(COMPONENTS.API, 'Error clearing president role', err);
                        return db.run("ROLLBACK", (rollbackErr) => {
                            if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after delete failure', rollbackErr);
                            return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                        });
                    }
                    const insertSql = "INSERT INTO roles (student_id, role_type) VALUES (?, ?)";
                    const insertParams = [studentId, role_type];
                    db.run(insertSql, insertParams, function (err) {
                        if (err) {
                            logger.error(COMPONENTS.API, 'Error inserting role', err, {
                                endpoint: '/api/roles',
                                requestId: req.requestId,
                                studentId,
                                roleType: role_type,
                                query: insertSql,
                                params: insertParams,
                                errorMessage: err.message,
                                errorCode: err.code
                            });
                            return db.run("ROLLBACK", (rollbackErr) => {
                                if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after insert failure', rollbackErr);
                                if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
                                    return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                                }
                                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                            });
                        }
                        const insertedRoleId = this.lastID;
                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) {
                                logger.error(COMPONENTS.API, 'Error committing president role', commitErr);
                                return db.run("ROLLBACK", (rollbackErr) => {
                                    if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr);
                                    return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                                });
                            }
                            return res.json({
                                id: insertedRoleId,
                                message: 'Rol başarıyla atandı'
                            });
                        });
                    });
                });
            });
        });
    } else if (role_type === 'vice_president') {
        insertBoundedRole(studentId, role_type, 2);
    } else if (role_type === 'duty') {
        insertBoundedRole(studentId, role_type, 4);
    } else {
        insertRole();
    }

    function insertBoundedRole(studentId, roleType, maximum) {
        const sql = `
            INSERT INTO roles (student_id, role_type)
            SELECT ?, ?
            WHERE EXISTS (
                SELECT 1
                FROM students
                WHERE id = ?
            )
            AND NOT EXISTS (
                SELECT 1
                FROM roles
                WHERE student_id = ?
                  AND role_type = ?
            )
            AND (
                SELECT COUNT(*)
                FROM roles
                WHERE role_type = ?
            ) < ?
        `;
        const params = [
            studentId,
            roleType,
            studentId,
            studentId,
            roleType,
            roleType,
            maximum
        ];
        db.run(sql, params, function (err) {
            if (err) {
                logger.error(COMPONENTS.API, 'Error inserting bounded role', err, {
                    endpoint: '/api/roles',
                    requestId: req.requestId,
                    studentId,
                    roleType,
                    maximum,
                    query: sql,
                    params,
                    errorMessage: err.message,
                    errorCode: err.code
                });
                if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
                    return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                }
                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
            }

            if (this.changes === 1) {
                return res.json({ id: this.lastID, message: 'Rol başarıyla atandı' });
            }

            // Zero-change classification
            const countSql = "SELECT COUNT(*) as count FROM roles WHERE role_type = ?";
            const countParams = [roleType];
            db.get(countSql, countParams, (countErr, countRow) => {
                if (countErr) {
                    logger.error(COMPONENTS.API, 'Error counting bounded roles', countErr, {
                        endpoint: '/api/roles',
                        requestId: req.requestId,
                        studentId,
                        roleType,
                        maximum,
                        query: countSql,
                        params: countParams,
                        errorMessage: countErr.message,
                        errorCode: countErr.code
                    });
                    return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                }
                if (countRow.count >= maximum) {
                    if (roleType === 'vice_president') {
                        return res.status(400).json({ error: 'En fazla 2 başkan yardımcısı olabilir' });
                    } else if (roleType === 'duty') {
                        return res.status(400).json({ error: 'En fazla 4 nöbetçi atanabilir' });
                    }
                }

                const duplicateSql = "SELECT 1 FROM roles WHERE student_id = ? AND role_type = ?";
                const duplicateParams = [studentId, roleType];
                db.get(duplicateSql, duplicateParams, (dupErr, dupRow) => {
                    if (dupErr) {
                        logger.error(COMPONENTS.API, 'Error checking bounded role duplicate', dupErr, {
                            endpoint: '/api/roles',
                            requestId: req.requestId,
                            studentId,
                            roleType,
                            maximum,
                            query: duplicateSql,
                            params: duplicateParams,
                            errorMessage: dupErr.message,
                            errorCode: dupErr.code
                        });
                        return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                    }
                    if (dupRow) {
                        if (roleType === 'vice_president') {
                            return res.status(400).json({ error: 'Bu öğrenci zaten başkan yardımcısı' });
                        } else if (roleType === 'duty') {
                            return res.status(400).json({ error: 'Bu öğrenci zaten nöbetçi' });
                        }
                    }

                    const studentSql = "SELECT 1 FROM students WHERE id = ?";
                    const studentParams = [studentId];
                    db.get(studentSql, studentParams, (stuErr, stuRow) => {
                        if (stuErr) {
                            logger.error(COMPONENTS.API, 'Error checking bounded role student', stuErr, {
                                endpoint: '/api/roles',
                                requestId: req.requestId,
                                studentId,
                                roleType,
                                maximum,
                                query: studentSql,
                                params: studentParams,
                                errorMessage: stuErr.message,
                                errorCode: stuErr.code
                            });
                            return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                        }
                        if (!stuRow) {
                            return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                        }

                        const classificationError = new Error('Bounded role classification reached unknown state');
                        logger.error(COMPONENTS.API, 'Bounded role classification reached unknown state', classificationError, {
                            endpoint: '/api/roles',
                            requestId: req.requestId,
                            studentId,
                            roleType,
                            maximum,
                            countQuery: countSql,
                            countParams,
                            duplicateQuery: duplicateSql,
                            duplicateParams,
                            studentQuery: studentSql,
                            studentParams,
                            errorMessage: classificationError.message
                        });
                        return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                    });
                });
            });
        });
    }

    function insertRole() {
        const sql = `
            INSERT INTO roles (student_id, role_type)
            SELECT ?, ?
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE student_id = ? AND role_type = ?
            )
        `;
        const params = [studentId, role_type, studentId, role_type];
        db.run(sql, params, function (err) {
            if (err) {
                logger.error(COMPONENTS.API, 'Error inserting role', err, {
                    endpoint: '/api/roles',
                    requestId: req.requestId,
                    studentId,
                    roleType: role_type,
                    query: sql,
                    params,
                    errorMessage: err.message,
                    errorCode: err.code
                });

                // Check for foreign key constraint error
                if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
                    return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                }

                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
            }

            if (this.changes === 0) {
                let dupMsg = 'Öğrenci zaten bu role sahip';
                if (role_type === 'duty') dupMsg = 'Bu öğrenci zaten nöbetçi';
                if (role_type === 'star') dupMsg = 'Bu öğrenci zaten haftanın yıldızı';
                if (role_type === 'vice_president') dupMsg = 'Bu öğrenci zaten başkan yardımcısı';
                return res.status(400).json({ error: dupMsg });
            }

            res.json({ id: this.lastID, message: 'Rol başarıyla atandı' });
        });
    }
});

// Remove Role by ID
app.delete('/api/roles/:id', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    const rawRoleId = req.params.id;

    if (
        typeof rawRoleId !== 'string' ||
        !/^[1-9]\d*$/.test(rawRoleId)
    ) {
        return res.status(400).json({ error: 'Geçersiz rol ID' });
    }

    const roleId = Number(rawRoleId);

    if (!Number.isSafeInteger(roleId)) {
        return res.status(400).json({ error: 'Geçersiz rol ID' });
    }

    db.run("DELETE FROM roles WHERE id = ?", [roleId], function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error deleting role', err, {
                roleId: roleId
            });
            return res.status(500).json({ error: 'Rol silinirken hata oluştu' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Rol bulunamadı" });
        }
        res.json({ message: "Rol silindi", changes: this.changes });
    });
});

// Get Settings
app.get('/api/settings', (req, res) => {
    const query = "SELECT * FROM settings";
    const params = [];

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching settings',
                err,
                { query, params }
            );

            return res.status(500).json({
                error: 'Ayarlar alınırken hata oluştu'
            });
        }

        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    });
});

// Update Settings
app.post('/api/settings', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Ayar anahtarı gereklidir' });
    }

    const { key, value } = req.body;

    // Input validation
    if (typeof key !== 'string' || !key.trim()) {
        return res.status(400).json({ error: 'Ayar anahtarı gereklidir' });
    }
    if (value === undefined || value === null) {
        return res.status(400).json({ error: 'Ayar değeri gereklidir' });
    }

    const normalizedKey = key.trim();

    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [normalizedKey, value], function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error updating settings', err, {
                key: key,
                value: value
            });
            return res.status(500).json({ error: 'Ayarlar güncellenirken hata oluştu' });
        }
        res.json({ message: "Ayarlar güncellendi" });
    });
});

async function requireScheduleStorageReady(req, res, next) {
    try {
        await db.scheduleMigrationPromise;
        next();
    } catch (err) {
        logger.error(COMPONENTS.DATABASE, 'Schedule storage initialization failed', err);
        return res.status(503).json({
            code: 'SCHEDULE_STORAGE_UNAVAILABLE',
            error: 'Ders programı veritabanı hazırlanamadı.'
        });
    }
}

app.use('/api/schedule', requireScheduleStorageReady);

// Get Normalized Schedule
app.get('/api/schedule/normalized', async (req, res) => {
    try {
        const resolved = resolveScheduleDayKey(req.query.day, { defaultDay: 'weekday' });
        if (!resolved.valid) {
            return res.status(400).json({ code: resolved.error.code, error: resolved.error.message });
        }
        const day = resolved.day;

        const rows = await getNormalizedScheduleRows(db, day);
        
        if (rows.length === 0) {
            return res.json({ day, source: 'empty', valid: false, periods: [], warnings: [], errors: [] });
        }

        const validation = validateNormalizedSchedule(rows);
        
        if (!validation.valid || validation.errors.length > 0) {
            return res.json({ 
                day, 
                source: 'legacy-incomplete', 
                valid: false, 
                periods: [], 
                warnings: validation.warnings, 
                errors: validation.errors 
            });
        }

        return res.json({
            day,
            source: 'database',
            valid: true,
            periods: validation.periods,
            warnings: validation.warnings,
            errors: []
        });
    } catch (err) {
        logger.error(COMPONENTS.API, 'Normalized schedule read error', err);
        res.status(500).json({ error: 'Zaman çizelgesi okunurken bir hata oluştu.' });
    }
});

// Update Normalized Schedule
app.put('/api/schedule/normalized', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({
                day: null,
                valid: false,
                count: 0,
                periods: [],
                warnings: [],
                errors: [{ code: 'INVALID_SCHEDULE_BODY', message: 'Ders programı isteği geçersiz.' }]
            });
        }

        if (!Array.isArray(req.body.periods)) {
            return res.status(400).json({
                day: null,
                valid: false,
                count: 0,
                periods: [],
                warnings: [],
                errors: [{ code: 'INVALID_SCHEDULE_BODY', message: 'Ders programı isteği geçersiz.' }]
            });
        }

        const resolved = resolveScheduleDayKey(req.body.day, { defaultDay: 'weekday' });
        if (!resolved.valid) {
            return res.status(400).json({
                day: null,
                valid: false,
                count: 0,
                periods: [],
                warnings: [],
                errors: [resolved.error]
            });
        }
        const day = resolved.day;

        const validation = validateNormalizedSchedule(req.body.periods);
        if (!validation.valid || validation.errors.length > 0) {
            return res.status(422).json({
                day,
                valid: false,
                count: 0,
                periods: validation.periods,
                warnings: validation.warnings,
                errors: validation.errors
            });
        }

        const insertedRows = await replaceNormalizedSchedule(db, day, validation.periods);
        
        return res.json({
            day,
            valid: true,
            count: insertedRows.length,
            periods: validation.periods,
            warnings: validation.warnings,
            errors: []
        });
    } catch (err) {
        logger.error(COMPONENTS.API, 'Normalized schedule write error', err);
        res.status(500).json({ error: 'Zaman çizelgesi kaydedilirken bir hata oluştu.' });
    }
});

// Get Schedule
app.get('/api/schedule', (req, res) => {
    const query = "SELECT * FROM schedule ORDER BY period";
    const params = [];

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching schedule',
                err,
                { query, params }
            );

            return res.status(500).json({
                error: 'Ders programı alınırken hata oluştu'
            });
        }

        res.json(rows);
    });
});

// Update Schedule Item
app.post('/api/schedule', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Ders programı isteği geçersiz.' });
    }
    const { day, period, course } = req.body;

    if (typeof day !== 'string' || !day.trim()) {
        return res.status(400).json({ error: 'Ders programı isteği geçersiz.' });
    }
    const normalizedDayResult = resolveScheduleDayKey(day.trim(), { defaultDay: undefined });
    if (!normalizedDayResult.valid) {
        return res.status(400).json({ error: 'Ders programı isteği geçersiz.' });
    }
    const normalizedDay = normalizedDayResult.day;

    if (typeof period !== 'number' || !Number.isSafeInteger(period) || period <= 0) {
        return res.status(400).json({ error: 'Ders programı isteği geçersiz.' });
    }

    if (typeof course !== 'string' || !course.trim()) {
        return res.status(400).json({ error: 'Ders programı isteği geçersiz.' });
    }
    const trimmedCourse = course.trim();

    // Check if exists
    const lookupQuery = "SELECT id FROM schedule WHERE day = ? AND period = ?";
    const lookupParams = [normalizedDay, period];
    db.get(lookupQuery, lookupParams, (err, row) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error during schedule lookup',
                err,
                { query: lookupQuery, params: lookupParams }
            );
            return res.status(500).json({ error: 'Ders programı kaydedilirken hata oluştu' });
        }

        if (row) {
            // Update
            const updateQuery = "UPDATE schedule SET course = ? WHERE id = ?";
            const updateParams = [trimmedCourse, row.id];
            db.run(updateQuery, updateParams, function (err) {
                if (err) {
                    logger.error(
                        COMPONENTS.API,
                        'Error during schedule update',
                        err,
                        { query: updateQuery, params: updateParams }
                    );
                    return res.status(500).json({ error: 'Ders programı kaydedilirken hata oluştu' });
                }
                res.json({ message: "Ders programı güncellendi" });
            });
        } else {
            // Insert
            const insertQuery = "INSERT INTO schedule (day, period, course) VALUES (?, ?, ?)";
            const insertParams = [normalizedDay, period, trimmedCourse];
            db.run(insertQuery, insertParams, function (err) {
                if (err) {
                    logger.error(
                        COMPONENTS.API,
                        'Error during schedule insert',
                        err,
                        { query: insertQuery, params: insertParams }
                    );
                    return res.status(500).json({ error: 'Ders programı kaydedilirken hata oluştu' });
                }
                res.json({ id: this.lastID });
            });
        }
    });
});

// Get Network Info (Local IP)
app.get('/api/network-info', (req, res) => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    // Just return the first found IP
    const ip = Object.values(results).flat()[0] || 'localhost';
    res.json({ ip, port: PORT });
});

// Get Class Statistics
app.get('/api/stats', (req, res) => {
    const totalQuery = "SELECT COUNT(*) as total FROM students";
    const totalParams = [];
    db.get(totalQuery, totalParams, (err, totalRow) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching total student count', err, { query: totalQuery, params: totalParams });
            return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
        }

        const femaleQuery = "SELECT COUNT(*) as girls FROM students WHERE gender = 'F'";
        const femaleParams = [];
        db.get(femaleQuery, femaleParams, (err, girlsRow) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error fetching female student count', err, { query: femaleQuery, params: femaleParams });
                return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
            }

            const maleQuery = "SELECT COUNT(*) as boys FROM students WHERE gender = 'M'";
            const maleParams = [];
            db.get(maleQuery, maleParams, (err, boysRow) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error fetching male student count', err, { query: maleQuery, params: maleParams });
                    return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                }

                const today = getIstanbulDateKey();
                const presentQuery = "SELECT COUNT(*) as present FROM attendance WHERE date = ? AND status = 'present'";
                const presentParams = [today];
                db.get(presentQuery, presentParams, (err, presentRow) => {
                    if (err) {
                        logger.error(COMPONENTS.API, 'Error fetching present student count', err, { query: presentQuery, params: presentParams });
                        return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                    }

                    // Fetch absent students with details for avatars
                    const absentQuery = "SELECT students.id, students.name, students.photo, students.gender FROM attendance JOIN students ON attendance.student_id = students.id WHERE attendance.date = ? AND attendance.status = 'absent'";
                    const absentParams = [today];
                    db.all(absentQuery, absentParams, (err, absentRows) => {
                        if (err) {
                            logger.error(COMPONENTS.API, 'Error fetching absent student details', err, { query: absentQuery, params: absentParams });
                            return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                        }

                        const absentCount = absentRows.length;
                        // Return full student objects instead of just names
                        const absentStudents = absentRows;

                        res.json({
                            total: totalRow.total,
                            girls: girlsRow.girls,
                            boys: boysRow.boys,
                            todayPresent: presentRow.present || 0,
                            todayAbsent: absentCount,
                            absentStudents: absentStudents
                        });
                    });
                });
            });
        });
    });
});

// Get Today's Attendance
app.get('/api/attendance/today', (req, res) => {
    const today = getIstanbulDateKey();
    const sql = `SELECT attendance.*, students.name, students.gender 
                 FROM attendance 
                 JOIN students ON attendance.student_id = students.id 
                 WHERE attendance.date = ? 
                 ORDER BY students.name`;
    const params = [today];
    db.all(sql, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                "Error fetching today's attendance",
                err,
                { query: sql, params }
            );
            return res.status(500).json({ error: 'Yoklama bilgileri alınırken hata oluştu' });
        }
        res.json(rows);
    });
});

// Get Attendance by Date
app.get('/api/attendance/:date', (req, res) => {
    const date = req.params.date;
    const sql = `SELECT attendance.*, students.name, students.gender 
                 FROM attendance 
                 JOIN students ON attendance.student_id = students.id 
                 WHERE attendance.date = ? 
                 ORDER BY students.name`;
    const params = [date];
    db.all(sql, params, (err, rows) => {
        if (err) {
            logger.error(
                COMPONENTS.API,
                'Error fetching attendance by date',
                err,
                { query: sql, params }
            );
            return res.status(500).json({ error: 'Yoklama bilgileri alınırken hata oluştu' });
        }
        res.json(rows);
    });
});

// Save Attendance (Bulk - multiple students at once)
app.post('/api/attendance', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Tarih ve yoklama listesi gereklidir' });
    }
    const { date, attendanceList } = req.body;

    if (date === undefined || date === null || date === '') {
        return res.status(400).json({ error: 'Tarih ve yoklama listesi gereklidir' });
    }

    if (!attendanceList || !Array.isArray(attendanceList)) {
        return res.status(400).json({ error: 'Tarih ve yoklama listesi gereklidir' });
    }

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Geçerli bir tarih gereklidir (YYYY-MM-DD)' });
    }

    const year = parseInt(date.substring(0, 4), 10);
    const month = parseInt(date.substring(5, 7), 10);
    const day = parseInt(date.substring(8, 10), 10);

    if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Geçerli bir tarih gereklidir (YYYY-MM-DD)' });
    }

    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
        return res.status(400).json({ error: 'Geçerli bir tarih gereklidir (YYYY-MM-DD)' });
    }

    const normalizedList = [];
    const seenIds = new Set();

    for (const item of attendanceList) {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
            return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
        }

        const { student_id, status } = item;
        let normalizedStudentId;

        if (typeof student_id === 'string') {
            if (!/^[1-9]\d*$/.test(student_id)) {
                return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
            }
            normalizedStudentId = Number(student_id);
        } else if (typeof student_id === 'number') {
            normalizedStudentId = student_id;
        } else {
            return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
        }

        if (!Number.isSafeInteger(normalizedStudentId) || normalizedStudentId <= 0) {
            return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
        }

        if (status !== 'present' && status !== 'absent') {
            return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
        }

        if (seenIds.has(normalizedStudentId)) {
            return res.status(400).json({ error: 'Yoklama listesinde geçersiz kayıt var' });
        }
        seenIds.add(normalizedStudentId);

        normalizedList.push({
            student_id: normalizedStudentId,
            status: status
        });
    }

    // Begin transaction
    db.run("BEGIN IMMEDIATE TRANSACTION", (err) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error beginning transaction for attendance', err, { date });
            return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
        }

        // Delete existing attendance for this date
        db.run("DELETE FROM attendance WHERE date = ?", [date], (err) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error deleting existing attendance', err, { date });
                return db.run("ROLLBACK", (rollbackErr) => {
                    if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after delete failure', rollbackErr, { date });
                    return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                });
            }

            if (normalizedList.length === 0) {
                return db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                        logger.error(COMPONENTS.API, 'Error committing empty attendance', commitErr, { date });
                        return db.run("ROLLBACK", (rollbackErr) => {
                            if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr, { date });
                            return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                        });
                    }
                    return res.json({ message: "Yoklama kaydedildi", count: 0 });
                });
            }

            // Insert new attendance records sequentially to avoid partial state and leak of errors
            let currentIndex = 0;

            const insertNext = () => {
                if (currentIndex >= normalizedList.length) {
                    return db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            logger.error(COMPONENTS.API, 'Error committing attendance', commitErr, { date });
                            return db.run("ROLLBACK", (rollbackErr) => {
                                if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr, { date });
                                return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                            });
                        }
                        return res.json({ message: "Yoklama başarıyla kaydedildi", count: normalizedList.length });
                    });
                }

                const item = normalizedList[currentIndex];
                db.run("INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)", [item.student_id, date, item.status], (err) => {
                    if (err) {
                        logger.error(COMPONENTS.API, 'Error inserting attendance', err, {
                            studentId: item.student_id,
                            date: date,
                            status: item.status
                        });
                        return db.run("ROLLBACK", (rollbackErr) => {
                            if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after insert failure', rollbackErr, { date });
                            return res.status(500).json({ error: 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu' });
                        });
                    }
                    currentIndex++;
                    insertNext();
                });
            };

            insertNext();
        });
    });
});

// Update Single Attendance Record
app.put('/api/attendance/:id', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    const rawAttendanceId = req.params.id;

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Geçerli bir durum gereklidir (present/absent)' });
    }

    const { status } = req.body;

    if (typeof rawAttendanceId !== 'string' || !/^[1-9]\d*$/.test(rawAttendanceId)) {
        return res.status(400).json({ error: 'Geçersiz yoklama ID' });
    }

    const attendanceId = Number(rawAttendanceId);

    if (!Number.isSafeInteger(attendanceId)) {
        return res.status(400).json({ error: 'Geçersiz yoklama ID' });
    }

    if (!status || !['present', 'absent'].includes(status)) {
        return res.status(400).json({ error: 'Geçerli bir durum gereklidir (present/absent)' });
    }

    db.run("UPDATE attendance SET status = ? WHERE id = ?", [status, attendanceId], function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error updating attendance', err, {
                attendanceId: attendanceId,
                status: status
            });
            return res.status(500).json({ error: 'Yoklama güncellenirken hata oluştu' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Yoklama kaydı bulunamadı' });
        }
        res.json({ message: "Yoklama güncellendi", changes: this.changes });
    });
});

// ===== SLIDES API ENDPOINTS =====

// --- Slide Media Path Helpers ---
function getCanonicalSlideMediaUrl(filename) {
    if (typeof filename !== 'string' || !filename.trim()) return null;
    if (filename.includes('/') || filename.includes('\\') || filename.includes('\0') || filename === '.' || filename === '..') return null;
    return `/uploads/slides/${filename}`;
}

function resolvePublicSlideMediaUrl(dbPath) {
    if (!dbPath || typeof dbPath !== 'string') return dbPath;

    const lower = dbPath.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('//')) {
        return dbPath;
    }

    const normalized = dbPath.replace(/\\/g, '/');
    const segment = 'uploads/slides/';
    const idx = normalized.indexOf(segment);
    if (idx !== -1) {
        const filename = normalized.slice(idx + segment.length);
        const canonical = getCanonicalSlideMediaUrl(filename);
        if (canonical) return canonical;
    }
    return normalizePath(dbPath, true);
}

function resolveManagedSlideMediaPath(dbPath) {
    if (!dbPath || typeof dbPath !== 'string') return null;

    const lower = dbPath.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('//')) {
        return null;
    }

    const normalized = dbPath.replace(/\\/g, '/');
    const segment = 'uploads/slides/';
    const idx = normalized.indexOf(segment);
    if (idx !== -1) {
        const filename = normalized.slice(idx + segment.length);
        if (getCanonicalSlideMediaUrl(filename)) {
            const absolutePath = path.resolve(slidesDir, filename);
            if (absolutePath.startsWith(slidesDir + path.sep)) {
                return absolutePath;
            }
        }
    }
    return null;
}

// Get active slides (AI optimized) - MUST be before /api/slides/:id route
let slidesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/slides/active', async (req, res) => {
    logger.debug(COMPONENTS.API, 'GET /api/slides/active called', null, {
        requestId: req.requestId
    });
    try {
        const now = Date.now();

        // Check cache
        if (slidesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            return res.json(slidesCache);
        }

        // Fetch all active slides
        const sql = `
            SELECT * FROM slides 
            WHERE is_active = 1 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY display_order ASC
        `;
        const params = [];
        db.all(sql, params, async (err, rows) => {
            if (err) {
                logger.error(
                    COMPONENTS.API,
                    'Error fetching active slides',
                    err,
                    {
                        endpoint: '/api/slides/active',
                        requestId: req.requestId,
                        query: sql,
                        params
                    }
                );
                return res.status(500).json({ error: 'Slayt bilgileri alınırken hata oluştu' });
            }

            // Normalize paths
            const normalizedRows = rows.map(row => {
                if (row.media_path) {
                    row.media_path = resolvePublicSlideMediaUrl(row.media_path);
                }
                return row;
            });

            // Update cache
            slidesCache = normalizedRows;
            cacheTimestamp = now;

            res.json(normalizedRows);
        });
    } catch (error) {
        logger.error(COMPONENTS.API, 'Error in /api/slides/active', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all active slides (ordered by display_order)
app.get('/api/slides', (req, res, next) => {
    const sql = "SELECT * FROM slides WHERE is_active = 1 ORDER BY display_order ASC";
    const params = [];
    db.all(sql, params, (err, rows) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching slides', err, {
                endpoint: '/api/slides',
                requestId: req.requestId,
                query: sql,
                params
            });
            return res.status(500).json({ error: 'Slayt bilgileri alınırken hata oluştu' });
        }
        logger.debug(COMPONENTS.API, 'Fetched slides', null, {
            count: rows.length,
            requestId: req.requestId
        });
        // Normalize media_path for web (convert Windows paths to web paths)
        const normalizedRows = rows.map(row => {
            if (row.media_path) {
                row.media_path = resolvePublicSlideMediaUrl(row.media_path);
            }
            return row;
        });
        res.json(normalizedRows);
    });
});

// Get single slide
app.get('/api/slides/:id', (req, res) => {
    const rawSlideId = req.params.id;

    if (
        typeof rawSlideId !== 'string' ||
        !/^[1-9]\d*$/.test(rawSlideId)
    ) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    const slideId = Number(rawSlideId);

    if (!Number.isSafeInteger(slideId)) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    const sql = "SELECT * FROM slides WHERE id = ?";
    const params = [slideId];
    db.get(sql, params, (err, row) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching slide by id', err, {
                endpoint: '/api/slides/:id',
                requestId: req.requestId,
                slideId,
                query: sql,
                params
            });
            return res.status(500).json({ error: 'Slayt bilgileri alınırken hata oluştu' });
        }
        if (!row) return res.status(404).json({ error: 'Slayt bulunamadı' });
        // Normalize media_path for web (convert Windows paths to web paths)
        if (row.media_path) {
            row.media_path = resolvePublicSlideMediaUrl(row.media_path);
        }
        res.json(row);
    });
});

// Create new slide
app.post('/api/slides', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, uploadSlide.single('slide'), (req, res, next) => {
    const { title, content_type, media_type, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode, expires_at } = req.body;

    // Validation
    if (!content_type) {
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                logger.error(COMPONENTS.API, 'Error deleting file on validation failure', e, {
                    filePath: req.file.path,
                    requestId: req.requestId
                });
            }
        }
        logger.warn(COMPONENTS.API, 'Slide creation failed: missing content_type', null, {
            requestId: req.requestId,
            body: req.body
        });
        return res.status(400).json({ error: 'İçerik tipi gereklidir' });
    }

    if (!req.file && content_type !== 'rule') {
        return res.status(400).json({ error: 'Medya dosyası gereklidir' });
    }

    // Auto-detect media_type if not provided
    let detectedMediaType = media_type;
    if (!detectedMediaType && req.file) {
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        const mimeType = req.file.mimetype;

        if (mimeType.startsWith('video/') || ['.mp4', '.webm', '.mov', '.avi'].includes(fileExt)) {
            detectedMediaType = 'video';
        } else if (mimeType === 'image/gif' || fileExt === '.gif') {
            detectedMediaType = 'gif';
        } else if (mimeType.startsWith('image/')) {
            detectedMediaType = 'image';
        } else {
            detectedMediaType = 'image'; // Default fallback
        }
    } else if (!detectedMediaType) {
        detectedMediaType = 'image'; // Default for rules
    }

    // Detect poster from filename
    let posterInfo = null;
    let isPoster = 0;
    let finalContentType = content_type;
    let finalTitle = title;

    if (req.file) {
        posterInfo = detectPosterFromFilename(req.file.originalname);
        if (posterInfo) {
            isPoster = 1;
            finalContentType = posterInfo.content_type;
            if (!finalTitle) {
                finalTitle = posterInfo.title;
            }
        }
    }

    // Calculate expires_at for announcements
    let expiresAt = expires_at || null;
    if (!expiresAt && (content_type === 'announcement' || content_type === 'news' || content_type === 'celebration')) {
        // Default: 7 days from now
        const defaultDuration = 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + defaultDuration);
        expiresAt = expiryDate.toISOString();
    }

    let media_path = null;
    if (req.file) {
        const canonicalUrl = getCanonicalSlideMediaUrl(req.file.filename);
        if (!canonicalUrl) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
            return res.status(400).json({ error: 'Geçersiz dosya adı' });
        }
        media_path = canonicalUrl;
    }

    // Get max display_order
    const maxOrderQuery = "SELECT MAX(display_order) as max_order FROM slides";
    const maxOrderParams = [];
    db.get(maxOrderQuery, maxOrderParams, (err, row) => {
        if (err) {
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {
                    logger.error(COMPONENTS.API, 'Error deleting file on validation failure', e, {
                        filePath: req.file.path
                    });
                }
            }
            logger.error(COMPONENTS.DATABASE, 'Error getting max display order for new slide', err, {
                query: maxOrderQuery,
                params: maxOrderParams,
                requestId: req.requestId
            });
            return res.status(500).json({ error: 'Slayt sırası hesaplanırken bir hata oluştu.' });
        }

        const display_order = (row && row.max_order !== null ? row.max_order : 0) + 1;
        const videoAutoAdvance = video_auto_advance === 'true' || video_auto_advance === true ? 1 : 0;

        // For rules, media_path is required
        if (content_type === 'rule' && !media_path) {
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {
                    logger.error(COMPONENTS.API, 'Error deleting file', e);
                }
            }
            return res.status(400).json({ error: 'Kural için görsel dosyası gereklidir' });
        }

        // Normal slide creation
        db.run(
            "INSERT INTO slides (title, content_type, media_type, media_path, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode, display_order, expires_at, is_poster) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [finalTitle || null, finalContentType, detectedMediaType, media_path, text_content || null, display_duration ? parseInt(display_duration) * 1000 : null, videoAutoAdvance, transition_type || null, transition_duration ? parseInt(transition_duration) * 1000 : null, transition_mode || null, display_order, expiresAt, isPoster],
            function (err) {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error creating slide', err, {
                        slideData: { content_type: finalContentType, detectedMediaType, display_order },
                        requestId: req.requestId
                    });
                    if (req.file) {
                        try {
                            fs.unlinkSync(req.file.path);
                        } catch (unlinkErr) {
                            logger.error(COMPONENTS.API, 'Error deleting file after DB error', unlinkErr);
                        }
                    }
                    return res.status(500).json({ error: 'Slayt oluşturulurken hata oluştu' });
                }
                logger.info(COMPONENTS.API, 'Slide created successfully', null, {
                    slideId: this.lastID,
                    requestId: req.requestId
                });
                
                // Invalidate cache
                slidesCache = null;
                cacheTimestamp = null;

                res.json({ id: this.lastID, message: 'Slayt başarıyla oluşturuldu' });
            }
        );
    });
});

// Reorder slides (bulk update)
app.put('/api/slides/reorder', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Geçersiz sıralama verisi' });
    }
    const { slideOrders } = req.body; // Array of {id, display_order}

    if (!slideOrders || !Array.isArray(slideOrders) || slideOrders.length === 0) {
        return res.status(400).json({ error: 'Geçersiz sıralama verisi' });
    }

    // Validate all items
    for (const item of slideOrders) {
        if (
            !item ||
            typeof item !== 'object' ||
            Array.isArray(item) ||
            !Number.isSafeInteger(item.id) ||
            item.id <= 0 ||
            !Number.isSafeInteger(item.display_order) ||
            item.display_order <= 0
        ) {
            return res.status(400).json({ error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        }
    }

    db.serialize(() => {
        db.run("BEGIN IMMEDIATE TRANSACTION", function (beginErr) {
            if (beginErr) {
                logger.error(COMPONENTS.API, 'Error beginning transaction for slides reorder', beginErr, { requestId: req.requestId });
                return res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
            }

            let stmt;
            try {
                stmt = db.prepare("UPDATE slides SET display_order = ? WHERE id = ?", function (prepErr) {
                    if (prepErr) {
                        logger.error(COMPONENTS.API, 'Error preparing statement for slides reorder', prepErr, { requestId: req.requestId });
                        return db.run("ROLLBACK", () => {
                            res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                        });
                    }

                    let i = 0;
                    const totalItems = slideOrders.length;

                    function nextUpdate() {
                        if (i >= totalItems) {
                            stmt.finalize((finalizeErr) => {
                                if (finalizeErr) {
                                    logger.error(COMPONENTS.API, 'Error finalizing statement after successful updates', finalizeErr, { requestId: req.requestId });
                                    return db.run("ROLLBACK", () => {
                                        res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                    });
                                }

                                db.run("COMMIT", function (commitErr) {
                                    if (commitErr) {
                                        logger.error(COMPONENTS.API, 'Error committing slides reorder', commitErr, { requestId: req.requestId });
                                        return db.run("ROLLBACK", () => {
                                            res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                        });
                                    }

                                    slidesCache = null;
                                    cacheTimestamp = null;
                                    logger.info(COMPONENTS.API, 'Slides reordered successfully', null, {
                                        totalItems,
                                        requestId: req.requestId
                                    });
                                    res.json({ message: 'Sıralama başarıyla güncellendi' });
                                });
                            });
                            return;
                        }

                        const item = slideOrders[i];
                        stmt.run([item.display_order, item.id], function (err) {
                            if (err) {
                                logger.error(COMPONENTS.API, 'Error updating slide order', err, {
                                    slideId: item.id,
                                    displayOrder: item.display_order,
                                    requestId: req.requestId
                                });
                                stmt.finalize((finalizeErr) => {
                                    if (finalizeErr) {
                                        logger.error(COMPONENTS.API, 'Error finalizing statement after update failure', finalizeErr, { requestId: req.requestId });
                                    }
                                    return db.run("ROLLBACK", () => {
                                        res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                    });
                                });
                                return;
                            }
                            i++;
                            nextUpdate();
                        });
                    }

                    nextUpdate();
                });
            } catch (prepErr) {
                logger.error(COMPONENTS.API, 'Error preparing statement for slides reorder', prepErr, { requestId: req.requestId });
                return db.run("ROLLBACK", () => {
                    res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                });
            }
        });
    });
});

// Update slide
app.put('/api/slides/:id', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, uploadSlide.single('slide'), (req, res) => {
    const rawSlideId = req.params.id;

    if (
        typeof rawSlideId !== 'string' ||
        !/^[1-9]\d*$/.test(rawSlideId)
    ) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
            error: 'Geçersiz slayt ID'
        });
    }

    const slideId = Number(rawSlideId);

    if (!Number.isSafeInteger(slideId)) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
            error: 'Geçersiz slayt ID'
        });
    }

    const { title, content_type, media_type, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode } = req.body;

    const lookupSql = 'SELECT media_path FROM slides WHERE id = ?';
    const lookupParams = [slideId];

    // Get existing slide
    db.get(lookupSql, lookupParams, (err, row) => {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            logger.error(COMPONENTS.API, 'Error fetching slide for update', err, {
                endpoint: '/api/slides/:id',
                requestId: req.requestId,
                slideId: slideId,
                query: lookupSql,
                params: lookupParams
            });
            return res.status(500).json({ error: 'Slayt güncellenirken hata oluştu' });
        }
        if (!row) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Slayt bulunamadı' });
        }

        const oldMediaPath = row.media_path;
        let media_path = oldMediaPath;

        // If new file uploaded, update media_path
        if (req.file) {
            const canonicalUrl = getCanonicalSlideMediaUrl(req.file.filename);
            if (!canonicalUrl) {
                try { fs.unlinkSync(req.file.path); } catch (e) { }
                return res.status(400).json({ error: 'Geçersiz dosya adı' });
            }
            media_path = canonicalUrl;
        }

        const videoAutoAdvance = video_auto_advance === 'true' || video_auto_advance === true ? 1 : 0;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title || null); }
        if (content_type !== undefined) { updates.push('content_type = ?'); values.push(content_type); }
        if (media_type !== undefined) { updates.push('media_type = ?'); values.push(media_type); }
        if (media_path !== oldMediaPath) { updates.push('media_path = ?'); values.push(media_path); }
        if (text_content !== undefined) { updates.push('text_content = ?'); values.push(text_content || null); }
        if (display_duration !== undefined) { updates.push('display_duration = ?'); values.push(display_duration ? parseInt(display_duration) * 1000 : null); }
        if (video_auto_advance !== undefined) { updates.push('video_auto_advance = ?'); values.push(videoAutoAdvance); }
        if (transition_type !== undefined) { updates.push('transition_type = ?'); values.push(transition_type || null); }
        if (transition_duration !== undefined) { updates.push('transition_duration = ?'); values.push(transition_duration ? parseInt(transition_duration) * 1000 : null); }
        if (transition_mode !== undefined) { updates.push('transition_mode = ?'); values.push(transition_mode || null); }

        if (updates.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi' });
        }

        values.push(slideId);

        db.run(
            `UPDATE slides SET ${updates.join(', ')} WHERE id = ?`,
            values,
            function (err) {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error updating slide', err, {
                        slideId: slideId,
                        requestId: req.requestId
                    });
                    if (req.file) {
                        try {
                            fs.unlinkSync(req.file.path);
                        } catch (unlinkErr) {
                            logger.error(COMPONENTS.API, 'Error deleting file after update error', unlinkErr);
                        }
                    }
                    return res.status(500).json({ error: 'Slayt güncellenirken hata oluştu' });
                }

                // Delete old media file if new one uploaded
                if (req.file && oldMediaPath && oldMediaPath !== media_path) {
                    const resolvedOldPath = resolveManagedSlideMediaPath(oldMediaPath);
                    if (resolvedOldPath) {
                        try {
                            if (fs.existsSync(resolvedOldPath)) {
                                fs.unlinkSync(resolvedOldPath);
                            }
                        } catch (unlinkErr) {
                            logger.warn(COMPONENTS.API, 'Error deleting old media file', unlinkErr, {
                                oldPath: resolvedOldPath,
                                requestId: req.requestId
                            });
                        }
                    }
                }

                logger.info(COMPONENTS.API, 'Slide updated successfully', null, {
                    slideId: slideId,
                    changes: this.changes,
                    requestId: req.requestId
                });

                slidesCache = null;
                cacheTimestamp = null;

                res.json({ message: 'Slayt başarıyla güncellendi', changes: this.changes });
            }
        );
    });
});

// Delete slide
app.delete('/api/slides/:id', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res, next) => {
    const rawSlideId = req.params.id;

    if (
        typeof rawSlideId !== 'string' ||
        !/^[1-9]\d*$/.test(rawSlideId)
    ) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    const slideId = Number(rawSlideId);

    if (!Number.isSafeInteger(slideId)) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    db.createIsolatedConnection((connErr, isolatedDb) => {
        if (connErr) return res.status(500).json({ error: connErr.message });

        isolatedDb.run("BEGIN IMMEDIATE", function (beginErr) {
            if (beginErr) {
                return isolatedDb.close(() => {
                    res.status(500).json({ error: beginErr.message });
                });
            }

            const rollbackAndRespond = (originalErr, statusCode, errorMsg, logContextMsg) => {
                isolatedDb.run("ROLLBACK", (rollbackErr) => {
                    if (rollbackErr) {
                        logger.error(COMPONENTS.DATABASE, 'Rollback failed after ' + logContextMsg, rollbackErr, { originalError: originalErr ? originalErr.message : null });
                    }
                    isolatedDb.close(() => {
                        res.status(statusCode).json({ error: errorMsg });
                    });
                });
            };

            isolatedDb.get("SELECT media_path, display_order FROM slides WHERE id = ?", [slideId], (lookupErr, row) => {
                if (lookupErr) return rollbackAndRespond(lookupErr, 500, lookupErr.message, 'lookup error');
                if (!row) return rollbackAndRespond(null, 404, 'Slayt bulunamadı', 'missing slide');

                const mediaPath = row.media_path;
                const displayOrder = row.display_order;

                isolatedDb.run("DELETE FROM slides WHERE id = ?", [slideId], function (deleteErr) {
                    if (deleteErr) return rollbackAndRespond(deleteErr, 500, deleteErr.message, 'delete error');

                    const deleteChanges = this.changes;

                    isolatedDb.run("UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?", [displayOrder], function(reorderErr) {
                        if (reorderErr) return rollbackAndRespond(reorderErr, 500, reorderErr.message, 'compaction error');

                        isolatedDb.run("COMMIT", function (commitErr) {
                            if (commitErr) return rollbackAndRespond(commitErr, 500, commitErr.message, 'commit error');

                            isolatedDb.close(() => {
                                slidesCache = null;
                                cacheTimestamp = null;

                                if (mediaPath) {
                                    const resolvedMediaPath = resolveManagedSlideMediaPath(mediaPath);
                                    if (resolvedMediaPath) {
                                        try {
                                            if (fs.existsSync(resolvedMediaPath)) {
                                                fs.unlinkSync(resolvedMediaPath);
                                            }
                                        } catch (unlinkErr) {
                                            logger.warn(COMPONENTS.API, 'Error deleting media file', unlinkErr, {
                                                mediaPath: resolvedMediaPath,
                                                slideId: slideId
                                            });
                                        }
                                    }
                                }

                                logger.info(COMPONENTS.API, 'Slide deleted successfully', null, {
                                    slideId: slideId,
                                    changes: deleteChanges,
                                    requestId: req.requestId
                                });
                                res.json({ message: 'Slayt başarıyla silindi', changes: deleteChanges });
                            });
                        });
                    });
                });
            });
        });
    });
});


// Detect poster from filename
function detectPosterFromFilename(filename) {
    if (!filename) return null;

    const lowerFilename = filename.toLowerCase();
    const turkishChars = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
    };

    let normalized = lowerFilename;
    for (const [turkish, english] of Object.entries(turkishChars)) {
        normalized = normalized.replace(new RegExp(turkish, 'g'), english);
    }

    // Atatürk detection
    if (normalized.includes('ataturk') || normalized.includes('atatürk') || normalized.includes('mustafa_kemal')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: 'Atatürk'
        };
    }

    // Flag detection
    if (normalized.includes('bayrak') || normalized.includes('flag') || normalized.includes('turk_bayragi')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: 'Türk Bayrağı'
        };
    }

    // Special dates
    if (normalized.includes('10_kasim') || normalized.includes('10_kasım')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: '10 Kasım'
        };
    }
    if (normalized.includes('29_ekim')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: '29 Ekim'
        };
    }
    if (normalized.includes('23_nisan')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: '23 Nisan'
        };
    }

    return null;
}



// Get slide settings
app.get('/api/slide-settings', (req, res) => {
    const settingsQuery = "SELECT key, value FROM slide_settings";
    const settingsParams = [];

    db.all(settingsQuery, settingsParams, (err, rows) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching slide settings', err, {
                requestId: req.requestId,
                query: settingsQuery,
                params: settingsParams
            });
            return res.status(500).json({ error: 'Slayt ayarları alınırken hata oluştu' });
        }
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    });
});

// Update slide settings
app.post('/api/slide-settings', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key ve value gereklidir' });
    }

    const updateQuery = "INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)";
    const updateParams = [key, value];

    db.run(updateQuery, updateParams, function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error updating slide settings', err, {
                requestId: req.requestId,
                query: updateQuery,
                params: updateParams
            });
            return res.status(500).json({ error: 'Slayt ayarları güncellenirken hata oluştu' });
        }
        res.json({ message: 'Ayar başarıyla güncellendi' });
    });
});

// ===== ERROR LOGGING API ENDPOINTS =====

// Receive log from client
app.post('/api/logs', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    const logEntry = req.body;

    // Validate log entry
    if (!logEntry.timestamp || !logEntry.level || !logEntry.component || !logEntry.message) {
        return res.status(400).json({ error: 'Geçersiz log kaydı' });
    }

    // Write to database
    db.run(
        "INSERT INTO error_logs (timestamp, level, component, message, error_details, context, stack_trace, user_agent, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            logEntry.timestamp,
            logEntry.level,
            logEntry.component,
            logEntry.message,
            logEntry.errorDetails ? JSON.stringify(logEntry.errorDetails) : null,
            logEntry.context ? JSON.stringify(logEntry.context) : null,
            logEntry.stackTrace || null,
            logEntry.userAgent || null,
            logEntry.url || null
        ],
        function (err) {
            if (err) {
                logger.error(COMPONENTS.DATABASE, 'Error saving log to database', err);
                return res.status(500).json({ error: 'Log kaydedilemedi' });
            }

            // Write to file
            let logLine = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.component}] ${logEntry.message}`;
            if (logEntry.context) {
                logLine += ` | Context: ${JSON.stringify(logEntry.context)}`;
            }
            if (logEntry.errorDetails) {
                logLine += ` | Error: ${JSON.stringify(logEntry.errorDetails)}`;
            }
            if (logEntry.stackTrace) {
                logLine += `\nStack: ${logEntry.stackTrace}`;
            }
            logLine += '\n';

            try {
                // Ensure logs directory exists
                if (!fs.existsSync('logs')) {
                    fs.mkdirSync('logs', { recursive: true });
                }
                fs.appendFileSync('logs/slideshow-errors.log', logLine, 'utf8');
            } catch (fileErr) {
                logger.error(COMPONENTS.SYSTEM, 'Error writing to log file', fileErr);
                // Don't fail the request if file write fails
            }

            res.json({ success: true });
        }
    );
});

// Get error logs
app.get('/api/logs', requireAdminSession, (req, res) => {
    let rawLimit = req.query.limit;
    let numericLimit = 100;

    if (rawLimit !== undefined) {
        if (typeof rawLimit !== 'string' || !/^(?:[1-9][0-9]{0,2}|1000)$/.test(rawLimit)) {
            return res.status(400).json({ error: 'Geçersiz limit değeri' });
        }
        numericLimit = parseInt(rawLimit, 10);
    }

    const { level, component, since } = req.query;

    let query = "SELECT * FROM error_logs WHERE 1=1";
    const params = [];

    if (level) {
        query += " AND level = ?";
        params.push(level);
    }

    if (component) {
        query += " AND component = ?";
        params.push(component);
    }

    if (since) {
        query += " AND timestamp >= ?";
        params.push(since);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(numericLimit);

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching logs', err, { query, params });
            return res.status(500).json({
                error: 'Hata günlükleri alınırken hata oluştu'
            });
        }

        const safeParseJSON = (val) => {
            if (val === null || val === undefined || val === '') return null;
            if (typeof val !== 'string') return val;
            try {
                return JSON.parse(val);
            } catch (e) {
                return val;
            }
        };

        // Parse JSON fields
        const parsedRows = rows.map(row => ({
            ...row,
            error_details: safeParseJSON(row.error_details),
            context: safeParseJSON(row.context)
        }));

        res.json(parsedRows);
    });
});

// Delete old logs (cleanup)
app.delete('/api/logs/cleanup', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
    let numericDays = 30;

    if (req.query.days !== undefined) {
        const rawDays = req.query.days;

        if (typeof rawDays !== 'string' || !/^[1-9]\d*$/.test(rawDays)) {
            return res.status(400).json({ error: 'Geçersiz gün sayısı' });
        }

        numericDays = Number(rawDays);

        if (!Number.isSafeInteger(numericDays)) {
            return res.status(400).json({ error: 'Geçersiz gün sayısı' });
        }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numericDays);

    if (Number.isNaN(cutoffDate.getTime())) {
        return res.status(400).json({ error: 'Geçersiz gün sayısı' });
    }

    const cleanupQuery = "DELETE FROM error_logs WHERE timestamp < ?";
    const cleanupParams = [cutoffDate.toISOString()];

    db.run(
        cleanupQuery,
        cleanupParams,
        function (err) {
            if (err) {
                logger.error(COMPONENTS.DATABASE, 'Error cleaning up logs', err, {
                    requestId: req.requestId,
                    query: cleanupQuery,
                    params: cleanupParams
                });
                return res.status(500).json({ error: 'Eski loglar temizlenirken bir hata oluştu.' });
            }
            res.json({ message: `${this.changes} eski log kaydı silindi` });
        }
    );
});

// Cleanup old logs on startup (older than 30 days)
function cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    db.run(
        "DELETE FROM error_logs WHERE timestamp < ?",
        [cutoffDate.toISOString()],
        function (err) {
            if (err) {
                logger.error(COMPONENTS.DATABASE, 'Error cleaning up old logs on startup', err);
            } else if (this.changes > 0) {
                logger.info(COMPONENTS.SYSTEM, 'Cleaned up old logs', null, {
                    deletedCount: this.changes
                });
            }
        }
    );
}

// Schedule daily cleanup
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // Every 24 hours

// Run cleanup on startup
cleanupOldLogs();

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    logger.error(COMPONENTS.SYSTEM, 'Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        promise: String(promise)
    });
});

process.on('uncaughtException', (error) => {
    logger.error(COMPONENTS.SYSTEM, 'Uncaught Exception', error);
    // Don't exit immediately - let the server try to handle it
    // process.exit(1); // Uncomment if you want to exit on uncaught exceptions
});

// Global error handler for Express
app.use((err, req, res, next) => {
    logger.error(COMPONENTS.API, 'Unhandled Express error', err, {
        method: req.method,
        url: req.url
    });

    if (!res.headersSent) {
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(COMPONENTS.SYSTEM, `Server running on http://localhost:${PORT}`, null, { port: PORT });
        logger.info(COMPONENTS.SYSTEM, 'Server started', null, { port: PORT });
    });
}

module.exports = app;
