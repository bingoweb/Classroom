'use strict';

const ADMIN_PASSWORD_ENV = 'CLASSROOM_ADMIN_PASSWORD';

function readAdminPassword(env = process.env) {
    if (!env || typeof env !== 'object') {
        return null;
    }

    const value = env[ADMIN_PASSWORD_ENV];

    if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
    }

    return value;
}

module.exports = {
    ADMIN_PASSWORD_ENV,
    readAdminPassword
};
