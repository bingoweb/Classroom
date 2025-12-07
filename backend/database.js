const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'classroom.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
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

        // Schedule Table
        db.run(`CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            period INTEGER NOT NULL,
            course TEXT NOT NULL,
            UNIQUE(day, period)
        )`);

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
        db.run(`CREATE INDEX IF NOT EXISTS idx_schedule_day_period ON schedule(day, period)`);
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
    });
}

module.exports = db;
