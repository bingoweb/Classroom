require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');
const { Logger, COMPONENTS, LOG_LEVELS } = require('./logger');
const { getIstanbulDateKey } = require('./date-utils');
const { validateNormalizedSchedule, resolveScheduleDayKey, isValidDayKey } = require('./schedule-service');
const { getNormalizedScheduleRows, replaceNormalizedSchedule } = require('./schedule-repository');
const { matchesAdminCredentials, readAdminPassword } = require('./admin-auth-config.js');
const { createAdminSessionStore } = require('./admin-session-store.js');
const {
    serializeAdminSessionCookie,
    serializeClearedAdminSessionCookie,
    readAdminSessionIdFromCookieHeader
} = require('./admin-session-cookie.js');
const { createFailureRateLimiter, createRequestRateLimiter } = require('./request-rate-limiter.js');
const {
    REVALIDATE_PUBLIC,
    setPublicStaticCacheHeaders,
    setUploadStaticCacheHeaders
} = require('./static-cache-policy.js');
const { registerSettingsRoutes } = require('./routes/settings-routes.js');
const { registerScheduleRoutes } = require('./routes/schedule-routes.js');
const { registerStudentRoutes } = require('./routes/student-routes.js');
const { registerRoleRoutes } = require('./routes/role-routes.js');
const { registerSystemRoutes } = require('./routes/system-routes.js');
const { registerAttendanceRoutes } = require('./routes/attendance-routes.js');
const { registerSlideRoutes } = require('./routes/slide-routes.js');
const { registerLogRoutes } = require('./routes/log-routes.js');
const { networkInterfaces } = require('os');

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
const app = express();
const PORT = process.env.PORT || 3000;
const XLSX_BROWSER_BUNDLE_PATH = require.resolve('xlsx/dist/xlsx.full.min.js');
const THREE_BUILD_DIR = path.dirname(require.resolve('three'));
const THREE_MODULE_PATH = path.join(THREE_BUILD_DIR, 'three.module.min.js');
const THREE_CORE_PATH = path.join(THREE_BUILD_DIR, 'three.core.min.js');

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

// Serve the browser SheetJS bundle from the same installed package used by the backend.
app.get('/vendor/sheetjs/xlsx.full.min.js', (req, res) => {
    res.set('Cache-Control', REVALIDATE_PUBLIC);
    res.type('application/javascript');
    res.sendFile(XLSX_BROWSER_BUNDLE_PATH);
});

// Expose only the two browser modules required by the Magic Park attendance box.
app.get('/vendor/three/three.module.min.js', (req, res) => {
    res.set('Cache-Control', REVALIDATE_PUBLIC);
    res.type('application/javascript');
    res.sendFile(THREE_MODULE_PATH);
});

app.get('/vendor/three/three.core.min.js', (req, res) => {
    res.set('Cache-Control', REVALIDATE_PUBLIC);
    res.type('application/javascript');
    res.sendFile(THREE_CORE_PATH);
});

// Serve static files from PUBLIC directory (Frontend)
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: setPublicStaticCacheHeaders
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
app.use('/uploads', express.static(uploadsDir, {
    setHeaders: setUploadStaticCacheHeaders
}));

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
    if (
        !req.body ||
        typeof req.body.username !== 'string' ||
        typeof req.body.password !== 'string'
    ) {
        return res.status(400).json({
            authenticated: false,
            message: 'Geçersiz giriş bilgisi formatı.'
        });
    }

    if (readAdminPassword() === null) {
        logger.warn(
            COMPONENTS.SYSTEM,
            'Admin login is unavailable because CLASSROOM_ADMIN_PASSWORD is not configured'
        );
        return res.status(503).json({
            authenticated: false,
            message: 'Yönetici girişi yapılandırılmamış.'
        });
    }

    if (!matchesAdminCredentials(req.body.username, req.body.password)) {
        loginFailureLimiter.recordFailure(req);
        return res.status(401).json({
            authenticated: false,
            message: 'Kullanıcı adı veya parola hatalı.'
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

registerStudentRoutes(app, {
    db,
    logger,
    COMPONENTS,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit,
    upload,
    uploadsDir
});
registerRoleRoutes(app, {
    db,
    logger,
    COMPONENTS,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit
});

registerSettingsRoutes(app, {
    db,
    logger,
    COMPONENTS,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit
});

registerScheduleRoutes(app, {
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
});

registerSystemRoutes(app, {
    db,
    logger,
    COMPONENTS,
    getIstanbulDateKey,
    networkInterfaces,
    PORT
});

registerAttendanceRoutes(app, {
    db,
    logger,
    COMPONENTS,
    getIstanbulDateKey,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit
});

registerSlideRoutes(app, {
    db,
    fs,
    logger,
    COMPONENTS,
    uploadSlide,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit
});

// ===== ERROR LOGGING API ENDPOINTS =====
registerLogRoutes(app, {
    db,
    fs,
    logger,
    COMPONENTS,
    requireAdminSession,
    requireCsrfToken,
    requireAdminWriteRateLimit
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
db.errorLogsReadyPromise
    .then(() => cleanupOldLogs())
    .catch((err) => {
        logger.error(COMPONENTS.DATABASE, 'Error preparing old log cleanup on startup', err);
    });

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
