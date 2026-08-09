'use strict';

function registerLogRoutes(app, deps) {
    const {
        db,
        fs,
        logger,
        COMPONENTS,
        requireAdminSession,
        requireCsrfToken,
        requireAdminWriteRateLimit
    } = deps;

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
}

module.exports = { registerLogRoutes };
