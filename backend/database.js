const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { ensureScheduleSchema } = require('./schedule-schema');

const configuredDbPath = process.env.CLASSROOM_DB_PATH;
const dbPath = configuredDbPath
    ? path.resolve(configuredDbPath)
    : path.resolve(__dirname, 'classroom.db');
let resolveScheduleMigration;
let rejectScheduleMigration;

const scheduleMigrationPromise = new Promise((resolve, reject) => {
    resolveScheduleMigration = resolve;
    rejectScheduleMigration = reject;
});

// Do not swallow rejection, but log it
scheduleMigrationPromise.catch((err) => {
    console.error('Fatal: Schedule schema migration failed', err);
});

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        rejectScheduleMigration(err);
    } else {
        console.log('Connected to the SQLite database.');
        // Enable foreign keys for this connection (must be done for every connection)
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('Error enabling foreign keys:', err);
            } else {
                console.log('Foreign keys enabled.');
            }
        });
        initDatabase();
    }
});

db.scheduleMigrationPromise = scheduleMigrationPromise;

function initDatabase() {
    db.serialize(() => {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Students Table
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            photo TEXT,
            gender TEXT CHECK(gender IN ('M', 'F'))
        )`);

        // Roles Table (President, Vice President, Stars, Duty)
        // role_type: 'president', 'vice_president', 'star', 'duty'
        db.run(`CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            role_type TEXT NOT NULL CHECK(role_type IN ('president', 'vice_president', 'star', 'duty')),
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
        )`);

        // Settings Table (Message of the Day, City, etc.)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);

        // Schedule table migration is handled separately

        // Attendance Table (Daily attendance records)
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
            UNIQUE(student_id, date)
        )`);

        // Slides Table (Slideshow content management)
        db.run(`CREATE TABLE IF NOT EXISTS slides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content_type TEXT NOT NULL,
            media_type TEXT NOT NULL,
            media_path TEXT NOT NULL,
            text_content TEXT,
            display_duration INTEGER,
            video_auto_advance BOOLEAN,
            transition_type TEXT,
            transition_duration INTEGER,
            transition_mode TEXT,
            display_order INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            expires_at TEXT,
            priority INTEGER DEFAULT 5,
            is_poster BOOLEAN DEFAULT 0,
            is_fallback BOOLEAN DEFAULT 0,
            fallback_key TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Slide Settings Table (General slide settings)
        db.run(`CREATE TABLE IF NOT EXISTS slide_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);

        // Error Logs Table (Error tracking and debugging)
        db.run(`CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL CHECK(level IN ('ERROR', 'WARN', 'INFO', 'DEBUG')),
            component TEXT NOT NULL,
            message TEXT NOT NULL,
            error_details TEXT,
            context TEXT,
            stack_trace TEXT,
            user_agent TEXT,
            url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create indexes for better query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_roles_student_id ON roles(student_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_roles_type ON roles(role_type)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_slides_order ON slides(display_order)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_slides_active ON slides(is_active)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs(component)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level)`);

        // Insert default settings if not exist
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('message', 'Harika bir gün olsun!')`);
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('city', 'Istanbul')`);

        // Insert default slide settings if not exist
        db.run(`INSERT OR IGNORE INTO slide_settings (key, value) VALUES ('default_duration', '10000')`);
        db.run(`INSERT OR IGNORE INTO slide_settings (key, value) VALUES ('default_transition_mode', 'auto')`);
        db.run(`INSERT OR IGNORE INTO slide_settings (key, value) VALUES ('default_transition_duration', '1000')`);
        db.run(`INSERT OR IGNORE INTO slide_settings (key, value) VALUES ('default_announcement_duration', '7')`);

        // Add new columns to existing slides table if they don't exist
        db.run(`ALTER TABLE slides ADD COLUMN expires_at TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding expires_at column:', err.message);
            }
        });
        db.run(`ALTER TABLE slides ADD COLUMN priority INTEGER DEFAULT 5`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding priority column:', err.message);
            }
        });
        db.run(`ALTER TABLE slides ADD COLUMN is_poster BOOLEAN DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding is_poster column:', err.message);
            }
        });
        db.run(`ALTER TABLE slides ADD COLUMN is_fallback BOOLEAN DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding is_fallback column:', err.message);
            }
        });
        db.run(`ALTER TABLE slides ADD COLUMN fallback_key TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding fallback_key column:', err.message);
            }
        });
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_slides_fallback_key ON slides(fallback_key)`);

        // Keep a permanent, editable fallback set in SQLite. These rows are seeded
        // once, remain hidden while an admin-created slide is active, and return
        // automatically when the last admin-created slide is removed.
        const fallbackSeedMarker = 'fallback_ataturk_slides_seeded_v1';
        const fallbackSlides = [
            {
                key: 'ataturk-education',
                title: 'Başöğretmen Atatürk',
                mediaPath: '/assets/ataturk-slides/ataturk-1.webp',
                text: '“Öğretmenler! Yeni nesil sizin eseriniz olacaktır.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-children',
                title: 'Atatürk ve Çocuklar',
                mediaPath: '/assets/ataturk-slides/ataturk-2.webp',
                text: '“Küçük hanımlar, küçük beyler! Sizler hepiniz geleceğin bir gülü, yıldızı ve ikbal ışığısınız.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-sovereignty',
                title: 'Ulusal Egemenlik',
                mediaPath: '/assets/ataturk-slides/ataturk-3.webp',
                text: '“Egemenlik kayıtsız şartsız milletindir.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-youth',
                title: 'Aydınlık Yarınlar',
                mediaPath: '/assets/ataturk-slides/ataturk-4.webp',
                text: '“Bütün ümidim gençliktedir.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-science',
                title: 'Bilimin Işığı',
                mediaPath: '/assets/ataturk-slides/ataturk-5.webp',
                text: '“Hayatta en hakiki mürşit ilimdir, fendir.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-love',
                title: 'Çocuk Sevgisi',
                mediaPath: '/assets/ataturk-slides/ataturk-6.webp',
                text: '“Çocuk sevgisi, insan sevgisi için bir ihtiyaçtır.”\n— Mustafa Kemal Atatürk'
            },
            {
                key: 'ataturk-future',
                title: 'Geleceğimiz Çocuklar',
                mediaPath: '/assets/ataturk-slides/ataturk-7.webp',
                text: '“Çocuklar geleceğimizin güvencesi, yaşama sevincimizdir.”\n— Mustafa Kemal Atatürk'
            }
        ];

        const fallbackInsertSql = `
            INSERT OR IGNORE INTO slides (
                title, content_type, media_type, media_path, text_content,
                display_duration, video_auto_advance, transition_type,
                transition_duration, transition_mode, display_order,
                is_active, priority, is_poster, is_fallback, fallback_key
            )
            SELECT ?, 'rule', 'image', ?, ?, 12000, 0, 'fade', 1000,
                   'auto', ?, 1, 5, 0, 1, ?
            WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = ?)
        `;

        fallbackSlides.forEach((slide, index) => {
            db.run(fallbackInsertSql, [
                slide.title,
                slide.mediaPath,
                slide.text,
                index + 1,
                slide.key,
                fallbackSeedMarker
            ]);
        });
        db.run(
            `INSERT OR IGNORE INTO settings (key, value) VALUES (?, '1')`,
            [fallbackSeedMarker]
        );
    });

    ensureScheduleSchema(db)
        .then(() => resolveScheduleMigration())
        .catch(err => rejectScheduleMigration(err));
}

db.createIsolatedConnection = function(cb) {
    const isolatedDb = new sqlite3.Database(dbPath, (err) => {
        if (err) return cb(err);
        isolatedDb.run('PRAGMA foreign_keys = ON', (fkErr) => {
            if (fkErr) {
                isolatedDb.close();
                return cb(fkErr);
            }
            cb(null, isolatedDb);
        });
    });
};

module.exports = db;
