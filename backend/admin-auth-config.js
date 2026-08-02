'use strict';

const crypto = require('node:crypto');

const ADMIN_USERNAME_ENV = 'CLASSROOM_ADMIN_USERNAME';
const ADMIN_PASSWORD_ENV = 'CLASSROOM_ADMIN_PASSWORD';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD_DIGEST_HEX = 'da19166e6ccc17da20921240a80d12c2e89e95450823d872a247dd77802374c1';

function readAdminUsername(env = process.env) {
    if (env && typeof env === 'object') {
        const value = env[ADMIN_USERNAME_ENV];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }

    return DEFAULT_ADMIN_USERNAME;
}

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

function digestCredential(value) {
    return crypto
        .createHash('sha256')
        .update(value, 'utf8')
        .digest();
}

function matchesAdminUsername(candidate, env = process.env) {
    if (typeof candidate !== 'string') {
        return false;
    }

    return crypto.timingSafeEqual(
        digestCredential(readAdminUsername(env)),
        digestCredential(candidate)
    );
}

function matchesAdminPassword(candidate, env = process.env) {
    const configuredPassword = readAdminPassword(env);

    if (typeof candidate !== 'string') {
        return false;
    }

    const configuredDigest = configuredPassword === null
        ? Buffer.from(DEFAULT_ADMIN_PASSWORD_DIGEST_HEX, 'hex')
        : digestCredential(configuredPassword);
    const candidateDigest = digestCredential(candidate);

    return crypto.timingSafeEqual(configuredDigest, candidateDigest);
}

function matchesAdminCredentials(username, password, env = process.env) {
    return matchesAdminUsername(username, env) && matchesAdminPassword(password, env);
}

module.exports = {
    ADMIN_USERNAME_ENV,
    ADMIN_PASSWORD_ENV,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD_DIGEST_HEX,
    readAdminUsername,
    readAdminPassword,
    matchesAdminUsername,
    matchesAdminPassword,
    matchesAdminCredentials
};
