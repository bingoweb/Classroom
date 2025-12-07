// Database helper utilities
// Promisify database queries for cleaner async/await usage

/**
 * Helper function to promisify db.get()
 * @param {object} db - SQLite database instance
 * @param {string} query - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise} Promise that resolves with query result
 */
function dbGet(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Helper function to promisify db.all()
 * @param {object} db - SQLite database instance
 * @param {string} query - SQL query  
 * @param {array} params - Query parameters
 * @returns {Promise} Promise that resolves with array of results
 */
function dbAll(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Helper function to promisify db.run()
 * @param {object} db - SQLite database instance
 * @param {string} query - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise} Promise that resolves with {lastID, changes}
 */
function dbRun(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

module.exports = {
    dbGet,
    dbAll,
    dbRun
};
