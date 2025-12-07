require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');
const XLSX = require('xlsx');
const { Logger, COMPONENTS, LOG_LEVELS } = require('./logger');
const { normalizePath } = require('./utils');

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

const app = express();
const PORT = 3000;

// Initialize logger
const logger = new Logger();
logger.init({ logLevel: LOG_LEVELS.INFO });
console.log('SERVER REVISION 5 - CHECKING PATHS');

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

app.use(cors());
app.use(express.json());
app.use(express.json());

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

// Get all students
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
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
app.post('/api/students', upload.single('photo'), (req, res) => {
    const { name, gender } = req.body;

    // Input validation using helper function
    const validation = validateStudentInput(name, gender);
    if (!validation.valid) {
        if (req.file) {
            safeDeleteFile(req.file.path);
        }
        return res.status(400).json({ error: validation.error });
    }

    const photo = req.file ? normalizePath(req.file.path, false) : null;
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
app.post('/api/students/import', upload.single('excel'), (req, res) => {
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
        res.status(500).json({ error: 'Excel dosyası işlenirken hata oluştu: ' + error.message });
    }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
    const studentId = parseInt(req.params.id);

    if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
    }

    // Foreign keys should handle cascade delete automatically
    // No need for redundant manual role deletion
    db.run("DELETE FROM students WHERE id = ?", [studentId], function (err) {
        if (err) {
            logger.error(COMPONENTS.API, 'Error deleting student', err, {
                studentId: studentId,
                errorCode: err.code,
                errorMessage: err.message
            });
            // Provide more detailed error message
            let errorMessage = 'Öğrenci silinirken hata oluştu';
            if (err.message) {
                errorMessage += ': ' + err.message;
            }
            return res.status(500).json({ error: errorMessage });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Öğrenci bulunamadı' });
        }
        res.json({ message: "Öğrenci silindi", changes: this.changes });
    });
});

// Update student photo
app.put('/api/students/:id/photo', upload.single('photo'), (req, res) => {
    const studentId = parseInt(req.params.id);

    if (isNaN(studentId)) {
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
        const newPhoto = normalizePath(req.file.path, false);

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
            if (oldPhoto && oldPhoto !== 'assets/default_boy.png' && oldPhoto !== 'assets/default_girl.png') {
                const oldPhotoPath = path.join(__dirname, oldPhoto);
                safeDeleteFile(oldPhotoPath);
            }

            res.json({ message: "Resim başarıyla güncellendi", photo: newPhoto });
        });
    });
});

// Get Roles
app.get('/api/roles', (req, res) => {
    const sql = `SELECT roles.id as role_id, roles.role_type, students.* 
                 FROM roles 
                 JOIN students ON roles.student_id = students.id`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Assign Role
app.post('/api/roles', (req, res) => {
    const { student_id, role_type } = req.body;

    // Input validation
    if (!student_id || isNaN(parseInt(student_id))) {
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
        db.run("DELETE FROM roles WHERE role_type = ?", [role_type], (err) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error clearing president role', err);
                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
            }
            insertRole();
        });
    } else if (role_type === 'vice_president') {
        // Check if already 2 vice presidents
        db.all("SELECT * FROM roles WHERE role_type = ?", [role_type], (err, rows) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error checking vice president count', err);
                return res.status(500).json({ error: 'Rol kontrol edilirken hata oluştu' });
            }
            if (rows.length >= 2) {
                return res.status(400).json({ error: 'En fazla 2 başkan yardımcısı olabilir' });
            }
            // Check if student already has this role
            if (rows.some(r => r.student_id === parseInt(student_id))) {
                return res.status(400).json({ error: 'Bu öğrenci zaten başkan yardımcısı' });
            }
            insertRole();
        });
    } else if (role_type === 'duty') {
        // Check if already 4 duty students
        db.get("SELECT COUNT(*) as count FROM roles WHERE role_type = 'duty'", [], (err, row) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error checking duty count', err);
                return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
            }
            if (row.count >= 4) {
                return res.status(400).json({ error: 'En fazla 4 nöbetçi atanabilir' });
            }
            insertRole();
        });
    } else {
        insertRole();
    }

    function insertRole() {
        db.run("INSERT INTO roles (student_id, role_type) VALUES (?, ?)", [student_id, role_type], function (err) {
            if (err) {
                console.error('DATABASE ERROR inserting role:', err.message, {
                    studentId: student_id,
                    roleType: role_type,
                    errorCode: err.code,
                    errorErrno: err.errno
                });
                logger.error(COMPONENTS.API, 'Error inserting role', err, {
                    studentId: student_id,
                    roleType: role_type,
                    errorMessage: err.message,
                    errorCode: err.code
                });

                // Check for foreign key constraint error
                if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
                    return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                }

                return res.status(500).json({ error: 'Rol atanırken hata oluştu: ' + (err.message || 'Bilinmeyen hata') });
            }
            console.log('Role inserted successfully:', { id: this.lastID, student_id, role_type });
            res.json({ id: this.lastID, message: 'Rol başarıyla atandı' });
        });
    }
});

// Remove Role by ID
app.delete('/api/roles/:id', (req, res) => {
    const roleId = parseInt(req.params.id);

    if (isNaN(roleId)) {
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
    db.all("SELECT * FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    });
});

// Update Settings
app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;

    // Input validation
    if (!key || !key.trim()) {
        return res.status(400).json({ error: 'Ayar anahtarı gereklidir' });
    }
    if (value === undefined || value === null) {
        return res.status(400).json({ error: 'Ayar değeri gereklidir' });
    }

    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key.trim(), value], function (err) {
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


// Get Schedule
app.get('/api/schedule', (req, res) => {
    db.all("SELECT * FROM schedule ORDER BY period", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Schedule Item
app.post('/api/schedule', (req, res) => {
    const { day, period, course } = req.body;
    // Check if exists
    db.get("SELECT id FROM schedule WHERE day = ? AND period = ?", [day, period], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update
            db.run("UPDATE schedule SET course = ? WHERE id = ?", [course, row.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Updated" });
            });
        } else {
            // Insert
            db.run("INSERT INTO schedule (day, period, course) VALUES (?, ?, ?)", [day, period, course], function (err) {
                if (err) return res.status(500).json({ error: err.message });
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
    db.get("SELECT COUNT(*) as total FROM students", [], (err, totalRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT COUNT(*) as girls FROM students WHERE gender = 'F'", [], (err, girlsRow) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get("SELECT COUNT(*) as boys FROM students WHERE gender = 'M'", [], (err, boysRow) => {
                if (err) return res.status(500).json({ error: err.message });

                const today = new Date().toISOString().split('T')[0];
                db.get("SELECT COUNT(*) as present FROM attendance WHERE date = ? AND status = 'present'", [today], (err, presentRow) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Fetch absent students with details for avatars
                    db.all("SELECT students.id, students.name, students.photo, students.gender FROM attendance JOIN students ON attendance.student_id = students.id WHERE attendance.date = ? AND attendance.status = 'absent'", [today], (err, absentRows) => {
                        if (err) return res.status(500).json({ error: err.message });

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
    const today = new Date().toISOString().split('T')[0];
    const sql = `SELECT attendance.*, students.name, students.gender 
                 FROM attendance 
                 JOIN students ON attendance.student_id = students.id 
                 WHERE attendance.date = ? 
                 ORDER BY students.name`;
    db.all(sql, [today], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
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
    db.all(sql, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Save Attendance (Bulk - multiple students at once)
app.post('/api/attendance', (req, res) => {
    const { date, attendanceList } = req.body; // attendanceList: [{student_id, status}]

    if (!date || !attendanceList || !Array.isArray(attendanceList)) {
        return res.status(400).json({ error: 'Tarih ve yoklama listesi gereklidir' });
    }

    // Delete existing attendance for this date
    db.run("DELETE FROM attendance WHERE date = ?", [date], (err) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error deleting existing attendance', err, {
                date: date
            });
            return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
        }

        // Insert new attendance records
        const stmt = db.prepare("INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");
        let completed = 0;
        let hasError = false;

        if (attendanceList.length === 0) {
            return res.json({ message: "Yoklama kaydedildi", count: 0 });
        }

        attendanceList.forEach((item) => {
            if (!item.student_id || !item.status || !['present', 'absent'].includes(item.status)) {
                hasError = true;
                completed++;
                if (completed === attendanceList.length) {
                    stmt.finalize();
                    if (hasError) {
                        return res.status(500).json({ error: 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu' });
                    }
                    return res.json({ message: "Yoklama başarıyla kaydedildi", count: attendanceList.length });
                }
                return;
            }

            stmt.run([item.student_id, date, item.status], (err) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error inserting attendance', err, {
                        studentId: item.student_id,
                        date: date,
                        status: item.status
                    });
                    hasError = true;
                }
                completed++;
                if (completed === attendanceList.length) {
                    stmt.finalize();
                    if (hasError) {
                        return res.status(500).json({ error: 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu' });
                    }
                    return res.json({ message: "Yoklama başarıyla kaydedildi", count: attendanceList.length });
                }
            });
        });
    });
});

// Update Single Attendance Record
app.put('/api/attendance/:id', (req, res) => {
    const attendanceId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(attendanceId)) {
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
        db.all(`
            SELECT * FROM slides 
            WHERE is_active = 1 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY display_order ASC
        `, [], async (err, rows) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error fetching active slides', err);
                return res.status(500).json({ error: err.message });
            }

            // Normalize paths
            const normalizedRows = rows.map(row => {
                if (row.media_path) {
                    row.media_path = normalizePath(row.media_path, true);
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
    db.all("SELECT * FROM slides WHERE is_active = 1 ORDER BY display_order ASC", [], (err, rows) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching slides', err, {
                endpoint: '/api/slides',
                requestId: req.requestId
            });
            return res.status(500).json({ error: err.message });
        }
        logger.debug(COMPONENTS.API, 'Fetched slides', null, {
            count: rows.length,
            requestId: req.requestId
        });
        // Normalize media_path for web (convert Windows paths to web paths)
        const normalizedRows = rows.map(row => {
            if (row.media_path) {
                row.media_path = normalizePath(row.media_path, true);
            }
            return row;
        });
        res.json(normalizedRows);
    });
});

// Get single slide
app.get('/api/slides/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }
    db.get("SELECT * FROM slides WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Slayt bulunamadı' });
        // Normalize media_path for web (convert Windows paths to web paths)
        if (row.media_path) {
            row.media_path = normalizePath(row.media_path, true);
        }
        res.json(row);
    });
});

// Create new slide
app.post('/api/slides', uploadSlide.single('slide'), (req, res, next) => {
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
        media_path = normalizePath(req.file.path, false);
    }

    // Get max display_order
    db.get("SELECT MAX(display_order) as max_order FROM slides", [], (err, row) => {
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
            return res.status(500).json({ error: err.message });
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
                res.json({ id: this.lastID, message: 'Slayt başarıyla oluşturuldu' });
            }
        );
    });
});

// Update slide
app.put('/api/slides/:id', uploadSlide.single('slide'), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    const { title, content_type, media_type, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode } = req.body;

    // Get existing slide
    db.get("SELECT media_path FROM slides WHERE id = ?", [id], (err, row) => {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Slayt bulunamadı' });
        }

        const oldMediaPath = row.media_path;
        let media_path = oldMediaPath;

        // If new file uploaded, update media_path
        if (req.file) {
            // Normalize path for storage (use forward slashes for web compatibility)
            media_path = normalizePath(req.file.path, false);
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

        values.push(id);

        db.run(
            `UPDATE slides SET ${updates.join(', ')} WHERE id = ?`,
            values,
            function (err) {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error updating slide', err, {
                        slideId: id,
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
                    try {
                        const oldPath = path.join(__dirname, oldMediaPath);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    } catch (unlinkErr) {
                        logger.warn(COMPONENTS.API, 'Error deleting old media file', unlinkErr, {
                            oldPath,
                            requestId: req.requestId
                        });
                        // Don't fail the request if old file deletion fails
                    }
                }

                logger.info(COMPONENTS.API, 'Slide updated successfully', null, {
                    slideId: id,
                    changes: this.changes,
                    requestId: req.requestId
                });
                res.json({ message: 'Slayt başarıyla güncellendi', changes: this.changes });
            }
        );
    });
});

// Delete slide
app.delete('/api/slides/:id', (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Geçersiz slayt ID' });
    }

    // Get slide to delete media file
    db.get("SELECT media_path FROM slides WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Slayt bulunamadı' });

        const mediaPath = row.media_path;

        // Delete slide
        db.run("DELETE FROM slides WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Delete media file
            if (mediaPath) {
                try {
                    const filePath = path.join(__dirname, mediaPath);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (unlinkErr) {
                    logger.warn(COMPONENTS.API, 'Error deleting media file', unlinkErr, {
                        mediaPath: mediaPath,
                        slideId: id
                    });
                    // Don't fail the request if file deletion fails
                }
            }

            // Reorder remaining slides
            db.run("UPDATE slides SET display_order = display_order - 1 WHERE display_order > (SELECT display_order FROM (SELECT display_order FROM slides WHERE id = ?))", [id], (reorderErr) => {
                if (reorderErr) {
                    logger.error(COMPONENTS.DATABASE, 'Error reordering slides after deletion', reorderErr, {
                        deletedSlideId: id,
                        requestId: req.requestId
                    });
                }
            });

            logger.info(COMPONENTS.API, 'Slide deleted successfully', null, {
                slideId: id,
                changes: this.changes,
                requestId: req.requestId
            });
            res.json({ message: 'Slayt başarıyla silindi', changes: this.changes });
        });
    });
});

// Reorder slides (bulk update)
app.put('/api/slides/reorder', (req, res) => {
    const { slideOrders } = req.body; // Array of {id, display_order}

    if (!slideOrders || !Array.isArray(slideOrders) || slideOrders.length === 0) {
        return res.status(400).json({ error: 'Geçersiz sıralama verisi' });
    }

    // Validate all items
    for (const item of slideOrders) {
        if (!item.id || item.display_order === undefined || isNaN(item.display_order)) {
            return res.status(400).json({ error: 'Geçersiz sıralama verisi: tüm öğeler id ve display_order içermelidir' });
        }
    }

    db.serialize(() => {
        const stmt = db.prepare("UPDATE slides SET display_order = ? WHERE id = ?");
        let completed = 0;
        let hasError = false;
        const totalItems = slideOrders.length;

        slideOrders.forEach((item) => {
            stmt.run([item.display_order, item.id], (err) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error updating slide order', err, {
                        slideId: item.id,
                        displayOrder: item.display_order,
                        requestId: req.requestId
                    });
                    hasError = true;
                }
                completed++;
                if (completed === totalItems) {
                    stmt.finalize();
                    if (hasError) {
                        return res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                    }
                    logger.info(COMPONENTS.API, 'Slides reordered successfully', null, {
                        totalItems,
                        requestId: req.requestId
                    });
                    res.json({ message: 'Sıralama başarıyla güncellendi' });
                }
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
    db.all("SELECT key, value FROM slide_settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    });
});

// Update slide settings
app.post('/api/slide-settings', (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key ve value gereklidir' });
    }

    db.run("INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)", [key, value], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Ayar başarıyla güncellendi' });
    });
});

// ===== ERROR LOGGING API ENDPOINTS =====

// Receive log from client
app.post('/api/logs', (req, res) => {
    const logEntry = req.body;

    // Validate log entry
    if (!logEntry.timestamp || !logEntry.level || !logEntry.component || !logEntry.message) {
        return res.status(400).json({ error: 'Invalid log entry' });
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
                return res.status(500).json({ error: 'Failed to save log' });
            }
            // Response is sent after file write to ensure both operations complete
        }
    );

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
});

// Get error logs
app.get('/api/logs', (req, res) => {
    const { level, component, since, limit = 100 } = req.query;

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
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error(COMPONENTS.API, 'Error fetching logs', err, { query, params });
            return res.status(500).json({ error: err.message });
        }

        // Parse JSON fields
        const parsedRows = rows.map(row => ({
            ...row,
            error_details: row.error_details ? JSON.parse(row.error_details) : null,
            context: row.context ? JSON.parse(row.context) : null
        }));

        res.json(parsedRows);
    });
});

// Delete old logs (cleanup)
app.delete('/api/logs/cleanup', (req, res) => {
    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    db.run(
        "DELETE FROM error_logs WHERE timestamp < ?",
        [cutoffDate.toISOString()],
        function (err) {
            if (err) {
                logger.error(COMPONENTS.DATABASE, 'Error cleaning up logs', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: `Deleted ${this.changes} old log entries` });
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
        url: req.url,
        body: req.body
    });

    if (!res.headersSent) {
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

app.listen(PORT, () => {
    logger.info(COMPONENTS.SYSTEM, `Server running on http://localhost:${PORT}`, null, { port: PORT });
    logger.info(COMPONENTS.SYSTEM, 'Server started', null, { port: PORT });
});
