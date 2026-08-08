'use strict';

function registerScheduleRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        validateNormalizedSchedule,
        resolveScheduleDayKey,
        getNormalizedScheduleRows,
        replaceNormalizedSchedule,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

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

            const isolatedDb = await new Promise((resolve, reject) => {
                db.createIsolatedConnection((err, conn) => {
                    if (err) reject(err);
                    else resolve(conn);
                });
            });

            let insertedRows;
            try {
                insertedRows = await replaceNormalizedSchedule(isolatedDb, day, validation.periods);
            } finally {
                await new Promise((resolve) => isolatedDb.close(resolve));
            }

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
}

module.exports = { registerScheduleRoutes };
