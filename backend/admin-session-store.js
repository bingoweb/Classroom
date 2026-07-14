'use strict';

const crypto = require('node:crypto');

const DEFAULT_ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_SESSION_ID_BYTES = 32;

function createAdminSessionStore(options = {}) {
    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {
        throw new TypeError('options must be an object');
    }

    const {
        ttlMs = DEFAULT_ADMIN_SESSION_TTL_MS,
        now = Date.now,
        randomBytes = crypto.randomBytes
    } = options;

    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
        throw new TypeError('ttlMs must be a positive safe integer');
    }

    if (typeof now !== 'function') {
        throw new TypeError('now must be a function');
    }

    if (typeof randomBytes !== 'function') {
        throw new TypeError('randomBytes must be a function');
    }

    const sessions = new Map();

    function readCurrentTime() {
        const value = now();

        if (!Number.isSafeInteger(value) || value < 0) {
            throw new TypeError(
                'now must return a non-negative safe integer'
            );
        }

        return value;
    }

    function createSession() {
        const createdAt = readCurrentTime();
        const idBytes = randomBytes(ADMIN_SESSION_ID_BYTES);

        if (
            !Buffer.isBuffer(idBytes) ||
            idBytes.length !== ADMIN_SESSION_ID_BYTES
        ) {
            throw new TypeError(
                'randomBytes must return a 32-byte Buffer'
            );
        }

        const expiresAt = createdAt + ttlMs;

        if (!Number.isSafeInteger(expiresAt)) {
            throw new RangeError('session expiry is outside the safe range');
        }

        const id = idBytes.toString('base64url');

        sessions.set(id, expiresAt);

        return Object.freeze({
            id,
            expiresAt
        });
    }

    function hasSession(id) {
        if (typeof id !== 'string' || id.length === 0) {
            return false;
        }

        const expiresAt = sessions.get(id);

        if (expiresAt === undefined) {
            return false;
        }

        if (readCurrentTime() >= expiresAt) {
            sessions.delete(id);
            return false;
        }

        return true;
    }

    function deleteSession(id) {
        if (typeof id !== 'string' || id.length === 0) {
            return false;
        }

        return sessions.delete(id);
    }

    function clearExpiredSessions() {
        const currentTime = readCurrentTime();
        let removedCount = 0;

        for (const [id, expiresAt] of sessions) {
            if (currentTime >= expiresAt) {
                sessions.delete(id);
                removedCount += 1;
            }
        }

        return removedCount;
    }

    return Object.freeze({
        createSession,
        hasSession,
        deleteSession,
        clearExpiredSessions
    });
}

module.exports = {
    DEFAULT_ADMIN_SESSION_TTL_MS,
    ADMIN_SESSION_ID_BYTES,
    createAdminSessionStore
};
