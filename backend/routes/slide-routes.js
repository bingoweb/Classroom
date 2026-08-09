const path = require('path');
const crypto = require('crypto');
const {
    getCanonicalSlideMediaUrl,
    resolvePublicSlideMediaUrl,
    resolveManagedSlideMediaPath
} = require('../slide-media-paths.js');

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

    if (normalized.includes('ataturk') || normalized.includes('atatürk') || normalized.includes('mustafa_kemal')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: 'Atatürk'
        };
    }

    if (normalized.includes('bayrak') || normalized.includes('flag') || normalized.includes('turk_bayragi')) {
        return {
            is_poster: true,
            content_type: 'poster',
            title: 'Türk Bayrağı'
        };
    }

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

function registerSlideRoutes(app, deps) {
    const {
        db,
        fs,
        logger,
        COMPONENTS,
        uploadSlide,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

    let slidesCache = null;
    let cacheTimestamp = null;
    const CACHE_DURATION = 5 * 60 * 1000;

    // Get active slides (AI optimized) - MUST be before /api/slides/:id route
    app.get('/api/slides/active', async (req, res) => {
        logger.debug(COMPONENTS.API, 'GET /api/slides/active called', null, {
            requestId: req.requestId
        });
        try {
            const now = Date.now();

            if (slidesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
                return res.json(slidesCache);
            }

            const sql = `
            SELECT * FROM slides
            WHERE is_active = 1
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            AND is_fallback = CASE
                WHEN EXISTS (
                    SELECT 1 FROM slides
                    WHERE is_active = 1
                    AND is_fallback = 0
                    AND (expires_at IS NULL OR expires_at > datetime('now'))
                ) THEN 0
                ELSE 1
            END
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

                const normalizedRows = rows.map(row => {
                    if (row.media_path) {
                        row.media_path = resolvePublicSlideMediaUrl(row.media_path);
                    }
                    return row;
                });

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
            const normalizedRows = rows.map(row => {
                if (row.media_path) {
                    row.media_path = resolvePublicSlideMediaUrl(row.media_path);
                }
                return row;
            });
            res.json(normalizedRows);
        });
    });

    // Get all slides for authenticated admin management (active + inactive)
    app.get('/api/admin/slides', requireAdminSession, (req, res) => {
        const sql = "SELECT * FROM slides WHERE COALESCE(is_fallback, 0) = 0 ORDER BY display_order ASC";
        const params = [];

        db.all(sql, params, (err, rows) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error fetching admin slides', err, {
                    endpoint: '/api/admin/slides',
                    requestId: req.requestId,
                    query: sql,
                    params
                });
                return res.status(500).json({ error: 'Slayt bilgileri alınırken hata oluştu' });
            }

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
            if (row.media_path) {
                row.media_path = resolvePublicSlideMediaUrl(row.media_path);
            }
            res.json(row);
        });
    });

    // Create new slide
    app.post('/api/slides', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, uploadSlide.single('slide'), (req, res, next) => {
        const { title, content_type, media_type, text_content, display_duration, video_auto_advance, transition_type, transition_duration, transition_mode, expires_at } = req.body;

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
                detectedMediaType = 'image';
            }
        } else if (!detectedMediaType) {
            detectedMediaType = 'image';
        }

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

        let expiresAt = expires_at || null;
        if (!expiresAt && (content_type === 'announcement' || content_type === 'news' || content_type === 'celebration')) {
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
        const { slideOrders } = req.body;

        if (!slideOrders || !Array.isArray(slideOrders) || slideOrders.length === 0) {
            return res.status(400).json({ error: 'Geçersiz sıralama verisi' });
        }

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

        db.createIsolatedConnection((connErr, isolatedDb) => {
            if (connErr) {
                logger.error(COMPONENTS.API, 'Error creating isolated connection for slides reorder', connErr, { requestId: req.requestId });
                return res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
            }

            isolatedDb.run("BEGIN IMMEDIATE", function (beginErr) {
                if (beginErr) {
                    logger.error(COMPONENTS.API, 'Error beginning transaction for slides reorder', beginErr, { requestId: req.requestId });
                    return isolatedDb.close(() => {
                        res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                    });
                }

                const slideIds = [...new Set(slideOrders.map(item => item.id))];
                const fallbackPlaceholders = slideIds.map(() => '?').join(', ');
                const fallbackOwnershipSql = `SELECT id FROM slides WHERE is_fallback = 1 AND id IN (${fallbackPlaceholders}) LIMIT 1`;

                isolatedDb.get(fallbackOwnershipSql, slideIds, (ownershipErr, systemSlide) => {
                    if (ownershipErr) {
                        logger.error(COMPONENTS.API, 'Error checking system-owned slides before reorder', ownershipErr, { requestId: req.requestId });
                        return isolatedDb.run("ROLLBACK", () => {
                            isolatedDb.close(() => {
                                res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                            });
                        });
                    }

                    if (systemSlide) {
                        return isolatedDb.run("ROLLBACK", () => {
                            isolatedDb.close(() => {
                                res.status(403).json({ error: 'Sistem slaytları yeniden sıralanamaz' });
                            });
                        });
                    }

                    let stmt;
                    try {
                        stmt = isolatedDb.prepare("UPDATE slides SET display_order = ? WHERE id = ?", function (prepErr) {
                        if (prepErr) {
                            logger.error(COMPONENTS.API, 'Error preparing statement for slides reorder', prepErr, { requestId: req.requestId });
                            return isolatedDb.run("ROLLBACK", () => {
                                isolatedDb.close(() => {
                                    res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                });
                            });
                        }

                        let i = 0;
                        const totalItems = slideOrders.length;

                        function nextUpdate() {
                            if (i >= totalItems) {
                                stmt.finalize((finalizeErr) => {
                                    if (finalizeErr) {
                                        logger.error(COMPONENTS.API, 'Error finalizing statement after successful updates', finalizeErr, { requestId: req.requestId });
                                        return isolatedDb.run("ROLLBACK", () => {
                                            isolatedDb.close(() => {
                                                res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                            });
                                        });
                                    }

                                    isolatedDb.run("COMMIT", function (commitErr) {
                                        if (commitErr) {
                                            logger.error(COMPONENTS.API, 'Error committing transaction for slides reorder', commitErr, { requestId: req.requestId });
                                            return isolatedDb.run("ROLLBACK", () => {
                                                isolatedDb.close(() => {
                                                    res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                                });
                                            });
                                        }

                                        slidesCache = null;
                                        cacheTimestamp = null;
                                        logger.info(COMPONENTS.API, 'Slides reordered successfully', null, {
                                            totalItems,
                                            requestId: req.requestId
                                        });
                                        isolatedDb.close(() => {
                                            res.json({ message: 'Sıralama başarıyla güncellendi' });
                                        });
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
                                        return isolatedDb.run("ROLLBACK", () => {
                                            isolatedDb.close(() => {
                                                res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                                            });
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
                        return isolatedDb.run("ROLLBACK", () => {
                            isolatedDb.close(() => {
                                res.status(500).json({ error: 'Sıralama güncellenirken bazı kayıtlarda hata oluştu' });
                            });
                        });
                    }
                });
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

        const {
            title,
            content_type,
            media_type,
            text_content,
            display_duration,
            video_auto_advance,
            transition_type,
            transition_duration,
            transition_mode,
            is_active
        } = req.body;

        let normalizedIsActive;
        if (is_active !== undefined) {
            const isBoolean = typeof is_active === 'boolean';
            const isIntegerFlag = Number.isInteger(is_active) && (is_active === 0 || is_active === 1);

            if (!isBoolean && !isIntegerFlag) {
                if (req.file) {
                    try { fs.unlinkSync(req.file.path); } catch (e) { }
                }
                return res.status(400).json({ error: 'Geçersiz slayt aktiflik değeri' });
            }

            normalizedIsActive = isBoolean ? (is_active ? 1 : 0) : is_active;
        }

        const lookupSql = 'SELECT media_path, is_fallback FROM slides WHERE id = ?';
        const lookupParams = [slideId];

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
            if (row.is_fallback === 1) {
                if (req.file) {
                    try { fs.unlinkSync(req.file.path); } catch (unlinkErr) { }
                }
                return res.status(403).json({ error: 'Sistem slaytları düzenlenemez' });
            }

            const oldMediaPath = row.media_path;
            let media_path = oldMediaPath;

            if (req.file) {
                const canonicalUrl = getCanonicalSlideMediaUrl(req.file.filename);
                if (!canonicalUrl) {
                    try { fs.unlinkSync(req.file.path); } catch (e) { }
                    return res.status(400).json({ error: 'Geçersiz dosya adı' });
                }
                media_path = canonicalUrl;
            }

            const videoAutoAdvance = video_auto_advance === 'true' || video_auto_advance === true ? 1 : 0;

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
            if (normalizedIsActive !== undefined) { updates.push('is_active = ?'); values.push(normalizedIsActive); }

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

        if (typeof req.requestId !== 'string' || req.requestId.trim() === '') {
            req.requestId = crypto.randomUUID();
        }

        const slideDeleteInternalError = 'Slayt silinirken hata oluştu';
        const logSlideDeleteFailure = (stage, error) => {
            logger.error(COMPONENTS.DATABASE, 'Error deleting slide', error, {
                slideId,
                requestId: req.requestId,
                stage
            });
        };

        db.createIsolatedConnection((connErr, isolatedDb) => {
            if (connErr) {
                logSlideDeleteFailure('connection', connErr);
                return res.status(500).json({ error: slideDeleteInternalError });
            }

            isolatedDb.run("BEGIN IMMEDIATE", function (beginErr) {
                if (beginErr) {
                    logSlideDeleteFailure('begin', beginErr);
                    return isolatedDb.close(() => {
                        res.status(500).json({ error: slideDeleteInternalError });
                    });
                }

                const rollbackAndRespond = (originalErr, statusCode, errorMsg, stage) => {
                    if (originalErr) {
                        logSlideDeleteFailure(stage, originalErr);
                    }

                    isolatedDb.run("ROLLBACK", (rollbackErr) => {
                        if (rollbackErr) {
                            logger.error(COMPONENTS.DATABASE, 'Rollback failed after slide delete error', rollbackErr, {
                                slideId,
                                requestId: req.requestId,
                                stage: 'rollback',
                                originalStage: stage,
                                originalError: originalErr ? originalErr.message : null
                            });
                        }
                        isolatedDb.close(() => {
                            res.status(statusCode).json({ error: errorMsg });
                        });
                    });
                };

                isolatedDb.get("SELECT media_path, display_order, is_fallback FROM slides WHERE id = ?", [slideId], (lookupErr, row) => {
                    if (lookupErr) return rollbackAndRespond(lookupErr, 500, slideDeleteInternalError, 'lookup');
                    if (!row) return rollbackAndRespond(null, 404, 'Slayt bulunamadı', 'missing');
                    if (row.is_fallback === 1) {
                        return rollbackAndRespond(null, 403, 'Sistem slaytları silinemez', 'system-owned');
                    }

                    const mediaPath = row.media_path;
                    const displayOrder = row.display_order;

                    isolatedDb.run("DELETE FROM slides WHERE id = ?", [slideId], function (deleteErr) {
                        if (deleteErr) return rollbackAndRespond(deleteErr, 500, slideDeleteInternalError, 'delete');

                        const deleteChanges = this.changes;

                        isolatedDb.run("UPDATE slides SET display_order = display_order - 1 WHERE display_order > ?", [displayOrder], function(reorderErr) {
                            if (reorderErr) return rollbackAndRespond(reorderErr, 500, slideDeleteInternalError, 'compaction');

                            isolatedDb.run("COMMIT", function (commitErr) {
                                if (commitErr) return rollbackAndRespond(commitErr, 500, slideDeleteInternalError, 'commit');

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

    // Atomically update the three admin-managed slide settings.
    app.put('/api/slide-settings', requireAdminSession, requireCsrfToken, requireAdminWriteRateLimit, (req, res) => {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Geçersiz slayt ayarları' });
        }

        const requiredKeys = [
            'default_duration',
            'default_transition_mode',
            'default_transition_duration'
        ];
        const bodyKeys = Object.keys(req.body);
        const unknownKey = bodyKeys.find(key => !requiredKeys.includes(key));

        if (unknownKey) {
            return res.status(400).json({ error: 'Bilinmeyen slayt ayarı' });
        }

        if (!requiredKeys.every(key => Object.prototype.hasOwnProperty.call(req.body, key))) {
            return res.status(400).json({ error: 'Tüm slayt ayarları gereklidir' });
        }

        const {
            default_duration: defaultDuration,
            default_transition_mode: defaultTransitionMode,
            default_transition_duration: defaultTransitionDuration
        } = req.body;

        if (!Number.isInteger(defaultDuration) || defaultDuration < 1000 || defaultDuration > 60000) {
            return res.status(400).json({ error: 'Varsayılan gösterim süresi geçersiz' });
        }

        if (!['auto', 'random', 'manual'].includes(defaultTransitionMode)) {
            return res.status(400).json({ error: 'Geçiş modu geçersiz' });
        }

        if (
            !Number.isInteger(defaultTransitionDuration) ||
            defaultTransitionDuration < 500 ||
            defaultTransitionDuration > 3000 ||
            defaultTransitionDuration % 100 !== 0
        ) {
            return res.status(400).json({ error: 'Varsayılan geçiş süresi geçersiz' });
        }

        if (typeof req.requestId !== 'string' || req.requestId.trim() === '') {
            req.requestId = crypto.randomUUID();
        }

        const genericError = 'Slayt ayarları güncellenirken hata oluştu';
        const updates = [
            ['default_duration', String(defaultDuration)],
            ['default_transition_mode', defaultTransitionMode],
            ['default_transition_duration', String(defaultTransitionDuration)]
        ];
        const upsertQuery = 'INSERT OR REPLACE INTO slide_settings (key, value) VALUES (?, ?)';

        const logFailure = (stage, error, extraContext = {}) => {
            logger.error(COMPONENTS.DATABASE, 'Error updating slide settings atomically', error, {
                requestId: req.requestId,
                stage,
                ...extraContext
            });
        };

        db.createIsolatedConnection((connectionErr, isolatedDb) => {
            if (connectionErr) {
                logFailure('connection', connectionErr);
                return res.status(500).json({ error: genericError });
            }

            isolatedDb.run('BEGIN IMMEDIATE', (beginErr) => {
                if (beginErr) {
                    logFailure('begin', beginErr);
                    return isolatedDb.close(() => {
                        res.status(500).json({ error: genericError });
                    });
                }

                const rollbackAndRespond = (originalErr, stage, extraContext = {}) => {
                    logFailure(stage, originalErr, extraContext);
                    isolatedDb.run('ROLLBACK', (rollbackErr) => {
                        if (rollbackErr) {
                            logger.error(COMPONENTS.DATABASE, 'Rollback failed after atomic slide settings error', rollbackErr, {
                                requestId: req.requestId,
                                stage: 'rollback',
                                originalStage: stage,
                                originalError: originalErr ? originalErr.message : null
                            });
                        }
                        isolatedDb.close(() => {
                            res.status(500).json({ error: genericError });
                        });
                    });
                };

                let updateIndex = 0;
                const writeNextSetting = () => {
                    if (updateIndex >= updates.length) {
                        return isolatedDb.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                return rollbackAndRespond(commitErr, 'commit');
                            }
                            isolatedDb.close(() => {
                                res.json({ message: 'Slayt ayarları başarıyla güncellendi' });
                            });
                        });
                    }

                    const [settingKey, settingValue] = updates[updateIndex];
                    isolatedDb.run(upsertQuery, [settingKey, settingValue], (updateErr) => {
                        if (updateErr) {
                            return rollbackAndRespond(updateErr, 'update', { settingKey });
                        }
                        updateIndex += 1;
                        writeNextSetting();
                    });
                };

                writeNextSetting();
            });
        });
    });
}

module.exports = {
    registerSlideRoutes
};
