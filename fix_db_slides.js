const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { normalizePath } = require('./backend/utils');

const dbPath = path.join(__dirname, 'backend', 'classroom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, media_path FROM slides", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        const stmt = db.prepare("UPDATE slides SET media_path = ? WHERE id = ?");

        rows.forEach(row => {
            let p = row.media_path;
            if (p && (p.includes(':') || p.includes('\\'))) {
                // It's a messy path, fix it
                let newPath = p.replace(/\\/g, '/');
                if (newPath.includes('/uploads/')) {
                    newPath = newPath.substring(newPath.lastIndexOf('/uploads/')); // keeps /uploads/...
                    // remove leading slash if it became //uploads due to some reason, but DB usually stores without leading / for some apps, 
                    // BUT server.js expects path to NOT start with / until normalized?
                    // Actually server.js insert uses normalizePath(req.file.path, false)
                    // normalizePath returns string.
                    // If ensureAbsolute is false, it returns 'uploads/slides/...' (if my fix is applied).
                    // If my fix handles ensureAbsolute=false properly:
                }

                // Let's rely on my manual logic here to match 'uploads/slides/filename'
                if (newPath.startsWith('/')) newPath = newPath.substring(1); // remove leading / for DB storage if preferred, 
                // OR match what server expects.
                // server.js serving static /uploads maps to backend/uploads.
                // If src="uploads/..." works relative to base.
                // If src="/uploads/..." works absolute.
                // Let's store 'uploads/slides/...' in DB.

                if (newPath.startsWith('/')) newPath = newPath.substring(1);
                // Wait, lastIndexOf('/uploads/') returns /uploads/...
                // newPath is /uploads/slides/...
                // removing leading / makes it uploads/slides/...

                console.log(`Fixing Slide ${row.id}: ${p} -> ${newPath}`);
                stmt.run([newPath, row.id]);
            }
        });
        stmt.finalize(() => {
            console.log('Database update complete.');
        });
    });
});
