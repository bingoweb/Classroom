'use strict';

const ADMIN_SESSION_COOKIE_NAME = 'classroom_admin_session';
const ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60; // 28800

function serializeAdminSessionCookie(sessionId, options = {}) {
    let cookie = `${ADMIN_SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS}`;
    if (options.secure) {
        cookie += '; Secure';
    }
    return cookie;
}

function serializeClearedAdminSessionCookie(options = {}) {
    let cookie = `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
    if (options.secure) {
        cookie += '; Secure';
    }
    return cookie;
}

function readAdminSessionIdFromCookieHeader(cookieHeader) {
    if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) {
        return null;
    }

    const parts = cookieHeader.split(';');
    let foundId = null;

    for (let i = 0; i < parts.length; i++) {
        const pair = parts[i].trim();
        if (pair.startsWith(ADMIN_SESSION_COOKIE_NAME + '=')) {
            const val = pair.substring(ADMIN_SESSION_COOKIE_NAME.length + 1);
            if (foundId !== null) {
                // duplicate
                return null;
            }
            foundId = val;
        }
    }

    if (foundId === null || foundId.length !== 43) {
        return null;
    }

    // validate base64url charset
    if (!/^[A-Za-z0-9_-]{43}$/.test(foundId)) {
        return null;
    }

    return foundId;
}

module.exports = {
    ADMIN_SESSION_COOKIE_NAME,
    ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS,
    serializeAdminSessionCookie,
    serializeClearedAdminSessionCookie,
    readAdminSessionIdFromCookieHeader
};
