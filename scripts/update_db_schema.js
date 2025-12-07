const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'classroom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Check if 'photo' column exists in 'students' table
    db.all("PRAGMA table_info(students)", (err, rows) => {
        if (err) {
            console.error("Error getting table info:", err);
            return;
        }
        const hasPhoto = rows.some(row => row.name === 'photo');
        if (!hasPhoto) {
            console.log("Adding 'photo' column to students table...");
            db.run("ALTER TABLE students ADD COLUMN photo TEXT", (err) => {
                if (err) console.error("Error adding column:", err);
                else console.log("Column 'photo' added successfully.");
            });
        } else {
            console.log("'photo' column already exists.");
        }
    });
});

db.close();
