'use strict';

function registerSettingsRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

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
}

module.exports = { registerSettingsRoutes };
