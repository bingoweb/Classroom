function ensureScheduleSchema(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                period INTEGER NOT NULL,
                course TEXT NOT NULL,
                period_type TEXT,
                start_time TEXT,
                end_time TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                UNIQUE(day, period)
            )`, (err) => {
                if (err) return reject(err);

                db.all('PRAGMA table_info(schedule)', [], (err, columns) => {
                    if (err) return reject(err);

                    const existingColumns = columns.map(c => c.name);
                    const missingColumns = [];

                    if (!existingColumns.includes('period_type')) missingColumns.push('ALTER TABLE schedule ADD COLUMN period_type TEXT');
                    if (!existingColumns.includes('start_time')) missingColumns.push('ALTER TABLE schedule ADD COLUMN start_time TEXT');
                    if (!existingColumns.includes('end_time')) missingColumns.push('ALTER TABLE schedule ADD COLUMN end_time TEXT');
                    if (!existingColumns.includes('is_active')) missingColumns.push('ALTER TABLE schedule ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');

                    function executeNextAlter(index) {
                        if (index >= missingColumns.length) {
                            // All alters done, now create index
                            db.run(`CREATE INDEX IF NOT EXISTS idx_schedule_day_active_period ON schedule(day, is_active, period)`, (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                            return;
                        }

                        db.run(missingColumns[index], (err) => {
                            if (err) return reject(err);
                            executeNextAlter(index + 1);
                        });
                    }

                    executeNextAlter(0);
                });
            });
        });
    });
}

module.exports = {
    ensureScheduleSchema
};
