const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'classroom.db');
const db = new sqlite3.Database(dbPath);

const students = [
    { name: 'Ahmet Yılmaz', gender: 'M' },
    { name: 'Ayşe Demir', gender: 'F' },
    { name: 'Mehmet Kaya', gender: 'M' },
    { name: 'Fatma Çelik', gender: 'F' },
    { name: 'Mustafa Şahin', gender: 'M' },
    { name: 'Zeynep Yıldız', gender: 'F' },
    { name: 'Ali Öztürk', gender: 'M' },
    { name: 'Elif Arslan', gender: 'F' },
    { name: 'Emre Doğan', gender: 'M' },
    { name: 'Hiranur Aydın', gender: 'F' },
    { name: 'Yusuf Koç', gender: 'M' },
    { name: 'Miray Kurt', gender: 'F' },
    { name: 'Ömer Faruk', gender: 'M' },
    { name: 'Defne Polat', gender: 'F' },
    { name: 'Kerem Taş', gender: 'M' },
    { name: 'Azra Bulut', gender: 'F' },
    { name: 'Hamza Keskin', gender: 'M' },
    { name: 'Eylül Ünal', gender: 'F' },
    { name: 'Berat Yüksel', gender: 'M' },
    { name: 'Nehir Güler', gender: 'F' }
];

db.serialize(() => {
    // 1. Clear tables and reset IDs
    db.run("DELETE FROM students");
    db.run("DELETE FROM roles");
    db.run("DELETE FROM sqlite_sequence WHERE name='students'");
    db.run("DELETE FROM sqlite_sequence WHERE name='roles'");

    // 2. Insert Students
    const stmt = db.prepare("INSERT INTO students (name, gender, photo) VALUES (?, ?, ?)");
    students.forEach(student => {
        const photo = student.gender === 'M' ? 'assets/default_boy.png' : 'assets/default_girl.png';
        stmt.run(student.name, student.gender, photo);
    });
    stmt.finalize();

    // 3. Assign Roles (After students are inserted)
    // We assume IDs 1-20 are generated.

    // 4 Duty Students
    for (let i = 1; i <= 4; i++) {
        db.run("INSERT INTO roles (student_id, role_type) VALUES (?, 'duty')", [i]);
    }

    // 2 Stars
    for (let i = 5; i <= 6; i++) {
        db.run("INSERT INTO roles (student_id, role_type) VALUES (?, 'star')", [i]);
    }

    // 1 President
    db.run("INSERT INTO roles (student_id, role_type) VALUES (?, 'president')", [7], (err) => {
        if (err) console.error(err);
        else console.log("Database seeded successfully.");
        db.close(); // Close only after the last operation
    });
});
