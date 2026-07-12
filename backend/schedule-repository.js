function getNormalizedScheduleRows(db, day) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                id,
                day,
                period,
                course,
                period_type,
                start_time,
                end_time,
                is_active
            FROM schedule
            WHERE day = ?
              AND is_active = 1
            ORDER BY period ASC
        `;
        db.all(sql, [day], (err, rows) => {
            if (err) return reject(err);
            const mapped = rows.map(row => ({
                name: row.course,
                type: row.period_type,
                start: row.start_time,
                end: row.end_time
            }));
            resolve(mapped);
        });
    });
}

function replaceNormalizedSchedule(db, day, periods) {
    return new Promise((resolve, reject) => {
        db.run('BEGIN IMMEDIATE', (err) => {
            if (err) return reject(err);

            db.run('DELETE FROM schedule WHERE day = ?', [day], function(err) {
                if (err) {
                    return db.run('ROLLBACK', () => reject(err));
                }

                if (periods.length === 0) {
                    return db.run('COMMIT', (err) => {
                        if (err) return db.run('ROLLBACK', () => reject(err));
                        resolve([]);
                    });
                }

                const stmt = db.prepare(`
                    INSERT INTO schedule 
                    (day, period, course, period_type, start_time, end_time, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `);

                let completed = 0;
                let hasError = false;

                for (let i = 0; i < periods.length; i++) {
                    const p = periods[i];
                    stmt.run([day, i + 1, p.name, p.type, p.start, p.end], function(err) {
                        if (hasError) return;
                        if (err) {
                            hasError = true;
                            stmt.finalize(() => {
                                db.run('ROLLBACK', () => reject(err));
                            });
                            return;
                        }

                        completed++;
                        if (completed === periods.length) {
                            stmt.finalize(() => {
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        db.run('ROLLBACK', () => reject(err));
                                    } else {
                                        resolve(periods.map((period, idx) => ({
                                            day: day,
                                            period: idx + 1,
                                            course: period.name,
                                            period_type: period.type,
                                            start_time: period.start,
                                            end_time: period.end,
                                            is_active: 1
                                        })));
                                    }
                                });
                            });
                        }
                    });
                }
            });
        });
    });
}

module.exports = {
    getNormalizedScheduleRows,
    replaceNormalizedSchedule
};
