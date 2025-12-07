const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'classroom.db');
const db = new sqlite3.Database(dbPath);

// Sample schedule data for a week (6 periods per day)
const scheduleData = [
    // Monday
    { day: 'Pazartesi', period: 1, course: 'Matematik' },
    { day: 'Pazartesi', period: 2, course: 'Türkçe' },
    { day: 'Pazartesi', period: 3, course: 'Hayat Bilgisi' },
    { day: 'Pazartesi', period: 4, course: 'Beden Eğitimi' },
    { day: 'Pazartesi', period: 5, course: 'Müzik' },
    { day: 'Pazartesi', period: 6, course: 'Oyun ve Fiziki Etkinlikler' },

    // Tuesday
    { day: 'Salı', period: 1, course: 'Türkçe' },
    { day: 'Salı', period: 2, course: 'Matematik' },
    { day: 'Salı', period: 3, course: 'İngilizce' },
    { day: 'Salı', period: 4, course: 'Görsel Sanatlar' },
    { day: 'Salı', period: 5, course: 'Serbest Etkinlik' },
    { day: 'Salı', period: 6, course: 'Değerler Eğitimi' },

    // Wednesday
    { day: 'Çarşamba', period: 1, course: 'Matematik' },
    { day: 'Çarşamba', period: 2, course: 'Türkçe' },
    { day: 'Çarşamba', period: 3, course: 'Fen Bilimleri' },
    { day: 'Çarşamba', period: 4, course: 'Sosyal Bilgiler' },
    { day: 'Çarşamba', period: 5, course: 'Oyun ve Fiziki Etkinlikler' },
    { day: 'Çarşamba', period: 6, course: 'Müzik' },

    // Thursday
    { day: 'Perşembe', period: 1, course: 'Türkçe' },
    { day: 'Perşembe', period: 2, course: 'Matematik' },
    { day: 'Perşembe', period: 3, course: 'Hayat Bilgisi' },
    { day: 'Perşembe', period: 4, course: 'Görsel Sanatlar' },
    { day: 'Perşembe', period: 5, course: 'Trafik Güvenliği' },
    { day: 'Perşembe', period: 6, course: 'İngilizce' },

    // Friday
    { day: 'Cuma', period: 1, course: 'Matematik' },
    { day: 'Cuma', period: 2, course: 'Türkçe' },
    { day: 'Cuma', period: 3, course: 'İngilizce' },
    { day: 'Cuma', period: 4, course: 'Beden Eğitimi' },
    { day: 'Cuma', period: 5, course: 'Değerler Eğitimi' },
    { day: 'Cuma', period: 6, course: 'Serbest Etkinlik' }
];

db.serialize(() => {
    // Clear existing schedule
    db.run("DELETE FROM schedule");

    // Insert sample schedule
    const stmt = db.prepare("INSERT INTO schedule (day, period, course) VALUES (?, ?, ?)");
    scheduleData.forEach(item => {
        stmt.run(item.day, item.period, item.course);
    });
    stmt.finalize(() => {
        console.log("Sample schedule data added successfully! ✅");
        db.close();
    });
});
