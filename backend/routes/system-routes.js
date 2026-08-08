'use strict';

function registerSystemRoutes(app, deps) {
    const {
        db,
        logger,
        COMPONENTS,
        getIstanbulDateKey,
        networkInterfaces,
        PORT
    } = deps;

    // Get Network Info (Local IP)
    app.get('/api/network-info', (req, res) => {
        const nets = networkInterfaces();
        const results = {};

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.address);
                }
            }
        }

        // Just return the first found IP
        const ip = Object.values(results).flat()[0] || 'localhost';
        res.json({ ip, port: PORT });
    });

    // Get Class Statistics
    app.get('/api/stats', (req, res) => {
        const totalQuery = "SELECT COUNT(*) as total FROM students";
        const totalParams = [];
        db.get(totalQuery, totalParams, (err, totalRow) => {
            if (err) {
                logger.error(COMPONENTS.API, 'Error fetching total student count', err, { query: totalQuery, params: totalParams });
                return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
            }

            const femaleQuery = "SELECT COUNT(*) as girls FROM students WHERE gender = 'F'";
            const femaleParams = [];
            db.get(femaleQuery, femaleParams, (err, girlsRow) => {
                if (err) {
                    logger.error(COMPONENTS.API, 'Error fetching female student count', err, { query: femaleQuery, params: femaleParams });
                    return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                }

                const maleQuery = "SELECT COUNT(*) as boys FROM students WHERE gender = 'M'";
                const maleParams = [];
                db.get(maleQuery, maleParams, (err, boysRow) => {
                    if (err) {
                        logger.error(COMPONENTS.API, 'Error fetching male student count', err, { query: maleQuery, params: maleParams });
                        return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                    }

                    const today = getIstanbulDateKey();
                    const presentQuery = "SELECT COUNT(*) as present FROM attendance WHERE date = ? AND status = 'present'";
                    const presentParams = [today];
                    db.get(presentQuery, presentParams, (err, presentRow) => {
                        if (err) {
                            logger.error(COMPONENTS.API, 'Error fetching present student count', err, { query: presentQuery, params: presentParams });
                            return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                        }

                        // Fetch absent students with details for avatars
                        const absentQuery = "SELECT students.id, students.name, students.photo, students.gender FROM attendance JOIN students ON attendance.student_id = students.id WHERE attendance.date = ? AND attendance.status = 'absent'";
                        const absentParams = [today];
                        db.all(absentQuery, absentParams, (err, absentRows) => {
                            if (err) {
                                logger.error(COMPONENTS.API, 'Error fetching absent student details', err, { query: absentQuery, params: absentParams });
                                return res.status(500).json({ error: 'Sınıf istatistikleri alınırken hata oluştu' });
                            }

                            const absentCount = absentRows.length;
                            // Return full student objects instead of just names
                            const absentStudents = absentRows;

                            res.json({
                                total: totalRow.total,
                                girls: girlsRow.girls,
                                boys: boysRow.boys,
                                todayPresent: presentRow.present || 0,
                                todayAbsent: absentCount,
                                absentStudents: absentStudents
                            });
                        });
                    });
                });
            });
        });
    });
}

module.exports = { registerSystemRoutes };
