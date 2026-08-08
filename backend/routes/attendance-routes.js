'use strict';

function registerAttendanceRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        getIstanbulDateKey,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

    // Get Today's Attendance
    app.get('/api/attendance/today', (req, res) => {
        const today = getIstanbulDateKey();
        const sql = `SELECT attendance.*, students.name, students.gender\x20
                 FROM attendance\x20
                 JOIN students ON attendance.student_id = students.id\x20
                 WHERE attendance.date = ?\x20
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
        const sql = `SELECT attendance.*, students.name, students.gender\x20
                 FROM attendance\x20
                 JOIN students ON attendance.student_id = students.id\x20
                 WHERE attendance.date = ?\x20
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

        db.createIsolatedConnection((connErr, isolatedDb) => {
            if (connErr) {
                logger.error(COMPONENTS.API, 'Error creating isolated connection for attendance', connErr, { date });
                return res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
            }

            isolatedDb.run("BEGIN IMMEDIATE", (err) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error beginning transaction for attendance', err, { date });
                    return isolatedDb.close(() => {
                        res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                    });
                }

                isolatedDb.run("DELETE FROM attendance WHERE date = ?", [date], (err) => {
                    if (err) {
                        logger.error(COMPONENTS.API, 'Error deleting existing attendance', err, { date });
                        return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                            if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after delete failure', rollbackErr, { date });
                            isolatedDb.close(() => {
                                res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                            });
                        });
                    }

                    if (normalizedList.length === 0) {
                        return isolatedDb.run("COMMIT", (commitErr) => {
                            if (commitErr) {
                                logger.error(COMPONENTS.API, 'Error committing empty attendance', commitErr, { date });
                                return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                    if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr, { date });
                                    isolatedDb.close(() => {
                                        res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                                    });
                                });
                            }
                            isolatedDb.close(() => {
                                res.json({ message: "Yoklama kaydedildi", count: 0 });
                            });
                        });
                    }

                    let currentIndex = 0;

                    const insertNext = () => {
                        if (currentIndex >= normalizedList.length) {
                            return isolatedDb.run("COMMIT", (commitErr) => {
                                if (commitErr) {
                                    logger.error(COMPONENTS.API, 'Error committing attendance', commitErr, { date });
                                    return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                        if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr, { date });
                                        isolatedDb.close(() => {
                                            res.status(500).json({ error: 'Yoklama kaydedilirken hata oluştu' });
                                        });
                                    });
                                }
                                isolatedDb.close(() => {
                                    res.json({ message: "Yoklama başarıyla kaydedildi", count: normalizedList.length });
                                });
                            });
                        }

                        const item = normalizedList[currentIndex];
                        isolatedDb.run("INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)", [item.student_id, date, item.status], (err) => {
                            if (err) {
                                logger.error(COMPONENTS.API, 'Error inserting attendance', err, {
                                    studentId: item.student_id,
                                    date: date,
                                    status: item.status
                                });
                                return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                    if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after insert failure', rollbackErr, { date });
                                    isolatedDb.close(() => {
                                        res.status(500).json({ error: 'Yoklama kaydedilirken bazı kayıtlarda hata oluştu' });
                                    });
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
}

module.exports = { registerAttendanceRoutes };
