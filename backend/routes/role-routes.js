function registerRoleRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

    // Get Roles
    app.get('/api/roles', (req, res) => {
        const sql = `SELECT roles.id as role_id, roles.role_type, students.*\x20
                 FROM roles\x20
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
                db.createIsolatedConnection((connErr, isolatedDb) => {
                    if (connErr) {
                        logger.error(COMPONENTS.API, 'Error creating isolated connection for president role', connErr);
                        return res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                    }

                    isolatedDb.run("BEGIN IMMEDIATE", (err) => {
                        if (err) {
                            logger.error(COMPONENTS.API, 'Error beginning transaction for president role', err);
                            return isolatedDb.close(() => {
                                res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                            });
                        }
                        isolatedDb.run("DELETE FROM roles WHERE role_type = ?", [role_type], (err) => {
                            if (err) {
                                logger.error(COMPONENTS.API, 'Error clearing president role', err);
                                return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                    if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after delete failure', rollbackErr);
                                    isolatedDb.close(() => {
                                        res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                                    });
                                });
                            }
                            const insertSql = "INSERT INTO roles (student_id, role_type) VALUES (?, ?)";
                            const insertParams = [studentId, role_type];
                            isolatedDb.run(insertSql, insertParams, function (err) {
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
                                    return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                        if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after insert failure', rollbackErr);
                                        isolatedDb.close(() => {
                                            if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
                                                return res.status(400).json({ error: 'Seçilen öğrenci bulunamadı. Lütfen önce öğrenci ekleyin.' });
                                            }
                                            res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                                        });
                                    });
                                }
                                const insertedRoleId = this.lastID;
                                isolatedDb.run("COMMIT", (commitErr) => {
                                    if (commitErr) {
                                        logger.error(COMPONENTS.API, 'Error committing president role', commitErr);
                                        return isolatedDb.run("ROLLBACK", (rollbackErr) => {
                                            if (rollbackErr) logger.error(COMPONENTS.API, 'Error rolling back after commit failure', rollbackErr);
                                            isolatedDb.close(() => {
                                                res.status(500).json({ error: 'Rol atanırken hata oluştu' });
                                            });
                                        });
                                    }
                                    isolatedDb.close(() => {
                                        res.json({
                                            id: insertedRoleId,
                                            message: 'Rol başarıyla atandı'
                                        });
                                    });
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
}

module.exports = {
    registerRoleRoutes
};
