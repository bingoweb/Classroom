'use strict';

const crypto = require('node:crypto');

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

function matchesAdminPassword(candidate, env = process.env) {
    const configuredPassword = readAdminPassword(env);

    if (configuredPassword === null || typeof candidate !== 'string') {
        return false;
    }

    const configuredDigest = crypto
        .createHash('sha256')
        .update(configuredPassword, 'utf8')
        .digest();

    const candidateDigest = crypto
        .createHash('sha256')
        .update(candidate, 'utf8')
        .digest();

    return crypto.timingSafeEqual(configuredDigest, candidateDigest);
}

module.exports = {
    ADMIN_PASSWORD_ENV,
    readAdminPassword,
    matchesAdminPassword
};
