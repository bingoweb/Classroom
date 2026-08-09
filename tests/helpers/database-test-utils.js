'use strict';

async function awaitDatabaseReady(db) {
    const readiness = [];

    if (db && db.scheduleMigrationPromise && typeof db.scheduleMigrationPromise.then === 'function') {
        readiness.push(db.scheduleMigrationPromise);
    }
    if (db && db.errorLogsReadyPromise && typeof db.errorLogsReadyPromise.then === 'function') {
        readiness.push(db.errorLogsReadyPromise);
    }

    await Promise.all(readiness);
}

module.exports = { awaitDatabaseReady };
