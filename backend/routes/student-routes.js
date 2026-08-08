'use strict';

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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

function registerStudentRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit,
        upload,
        uploadsDir
    } = deps;

    function safeDeleteFile(filePath, component = COMPONENTS.API) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            logger.warn(component, 'Error deleting file', err, { filePath });
        }
    }

    function cleanupManagedPhoto(oldPhoto) {
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
                const uploadsRoot = path.resolve(uploadsDir);
                const oldFilePath = path.resolve(uploadsRoot, oldFilename);
                const remainsInsideUploads = oldFilePath.startsWith(uploadsRoot + path.sep);

                if (remainsInsideUploads) {
                    safeDeleteFile(oldFilePath);
                }
            }
        }
    }

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

    app.post('/api/students', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, upload.single('photo'), (req, res) => {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            if (req.file) {
                safeDeleteFile(req.file.path);
            }
            return res.status(400).json({ error: 'Öğrenci adı gereklidir' });
        }
        const { name, gender } = req.body;

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

            const maxSize = 5 * 1024 * 1024;
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

    app.post('/api/students/import', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, upload.single('excel'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Excel dosyası gereklidir' });
        }

        try {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (data.length === 0) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Excel dosyası boş' });
            }

            let startRow = 0;
            let numberCol = -1;
            let firstNameCol = -1;
            let lastNameCol = -1;
            let nameCol = -1;
            let genderCol = -1;

            const firstRow = data[0];
            if (firstRow && Array.isArray(firstRow)) {
                const hasHeaderKeywords = firstRow.some(cell => {
                    const cellStr = String(cell || '').toLowerCase();
                    return cellStr.includes('öğrenci') || cellStr.includes('ad') || cellStr.includes('soyad') ||
                        cellStr.includes('cinsiyet') || cellStr.includes('numara') || cellStr.includes('no');
                });

                if (hasHeaderKeywords) {
                    startRow = 1;
                    firstRow.forEach((cell, idx) => {
                        const cellStr = String(cell || '');
                        const cellLower = cellStr.toLowerCase();

                        if (cellStr && (cellStr.toLowerCase().includes('öğrenci') || cellStr.toLowerCase().includes('ogrenci')) &&
                            (cellStr.toLowerCase().includes('no') || cellStr.toLowerCase().includes('numara'))) {
                            numberCol = idx;
                        }
                        if (cellStr && (cellStr.toLowerCase() === 'adı' || cellStr.toLowerCase() === 'adi' ||
                            cellStr.toLowerCase() === 'ad') && !cellStr.toLowerCase().includes('soyad')) {
                            firstNameCol = idx;
                        } else if (cellLower.includes('ad') && !cellLower.includes('soyad') && firstNameCol === -1) {
                            firstNameCol = idx;
                        }
                        if (cellStr && (cellStr.toLowerCase() === 'soyadı' || cellStr.toLowerCase() === 'soyadi' ||
                            cellStr.toLowerCase() === 'soyad' || cellLower.includes('soyad'))) {
                            lastNameCol = idx;
                        }
                        if (cellLower.includes('ad') && cellLower.includes('soyad') && !cellLower.includes('soyadı')) {
                            nameCol = idx;
                        }
                        if (cellStr && (cellStr.toLowerCase().includes('cinsiyet') || cellStr.toLowerCase().includes('cinsiyeti') ||
                            cellLower.includes('gender') || cellLower.includes('sex'))) {
                            genderCol = idx;
                        }
                    });

                    if (numberCol === -1 && firstRow.length > 1) {
                        if (String(firstRow[1] || '').toLowerCase().includes('no') ||
                            String(firstRow[1] || '').toLowerCase().includes('numara')) {
                            numberCol = 1;
                        }
                    }
                    if (firstNameCol === -1 && firstRow.length > 4) {
                        if (String(firstRow[4] || '').toLowerCase().includes('ad') &&
                            !String(firstRow[4] || '').toLowerCase().includes('soyad')) {
                            firstNameCol = 4;
                        }
                    }
                    if (lastNameCol === -1 && firstRow.length > 9) {
                        if (String(firstRow[9] || '').toLowerCase().includes('soyad')) {
                            lastNameCol = 9;
                        }
                    }
                    if (genderCol === -1 && firstRow.length > 13) {
                        if (String(firstRow[13] || '').toLowerCase().includes('cinsiyet')) {
                            genderCol = 13;
                        }
                    }
                } else {
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

            const normalizeGender = (gender) => {
                if (!gender) return null;
                const g = String(gender).trim().toUpperCase();
                if (g === 'E' || g === 'ERKEK' || g === 'M' || g === 'MALE' || g === 'ER') return 'M';
                if (g === 'K' || g === 'KIZ' || g === 'F' || g === 'FEMALE' || g === 'KZ') return 'F';
                return null;
            };

            const students = [];
            const errors = [];

            for (let i = startRow; i < data.length; i++) {
                const row = data[i];
                if (!Array.isArray(row) || row.length === 0) continue;

                const number = numberCol >= 0 && row[numberCol] ? parseInt(row[numberCol]) : null;

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

                if (!name || name === '') {
                    continue;
                }

                if (!gender) {
                    errors.push(`Satır ${i + 1} (${name}): Geçersiz cinsiyet (${row[genderCol] || 'boş'})`);
                    continue;
                }

                students.push({ number: number !== null && !isNaN(number) ? number : null, name, gender });
            }

            if (students.some(s => s.number !== null)) {
                students.sort((a, b) => {
                    if (a.number === null && b.number === null) return 0;
                    if (a.number === null) return 1;
                    if (b.number === null) return -1;
                    return a.number - b.number;
                });
            }

            if (students.length === 0) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    error: 'Geçerli öğrenci bulunamadı',
                    errors: errors
                });
            }

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

                    if (inserted + failed === students.length) {
                        stmt.finalize();
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
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({
                error: 'Excel dosyası işlenirken hata oluştu'
            });
        }
    });

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

                cleanupManagedPhoto(oldPhoto);

                res.json({ message: "Öğrenci silindi", changes: this.changes });
            });
        });
    });

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

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            safeDeleteFile(req.file.path);
            return res.status(400).json({ error: 'Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WEBP)' });
        }

        const maxSize = 5 * 1024 * 1024;
        if (req.file.size > maxSize) {
            safeDeleteFile(req.file.path);
            return res.status(400).json({ error: 'Resim dosyası çok büyük. Maksimum 5MB olmalıdır.' });
        }

        db.get("SELECT photo FROM students WHERE id = ?", [studentId], (err, row) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error fetching student for photo update', err, {
                    studentId: studentId
                });
                safeDeleteFile(req.file.path);
                return res.status(500).json({ error: 'Öğrenci bulunurken hata oluştu' });
            }

            if (!row) {
                safeDeleteFile(req.file.path);
                return res.status(404).json({ error: 'Öğrenci bulunamadı' });
            }

            const oldPhoto = row.photo;
            const newPhoto = `/uploads/${path.posix.basename(String(req.file.filename).replace(/\\/g, '/'))}`;

            db.run("UPDATE students SET photo = ? WHERE id = ?", [newPhoto, studentId], function (updateErr) {
                if (updateErr) {
                    logger.error(COMPONENTS.API, 'Error updating student photo', updateErr, {
                        studentId: studentId,
                        newPhoto: newPhoto
                    });
                    safeDeleteFile(req.file.path);
                    return res.status(500).json({ error: 'Resim güncellenirken hata oluştu' });
                }

                if (this.changes === 0) {
                    safeDeleteFile(req.file.path);
                    return res.status(404).json({ error: 'Öğrenci bulunamadı veya güncellenemedi' });
                }

                cleanupManagedPhoto(oldPhoto);

                res.json({ message: "Resim başarıyla güncellendi", photo: newPhoto });
            });
        });
    });
}

module.exports = { registerStudentRoutes };
