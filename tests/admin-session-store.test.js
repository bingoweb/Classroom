const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_ADMIN_SESSION_TTL_MS,
    ADMIN_SESSION_ID_BYTES,
    createAdminSessionStore
} = require('../backend/admin-session-store.js');

test('1. Session constants use the required secure defaults', () => {
    assert.strictEqual(
        DEFAULT_ADMIN_SESSION_TTL_MS,
        8 * 60 * 60 * 1000
    );
    assert.strictEqual(ADMIN_SESSION_ID_BYTES, 32);
});

test('2. Invalid store construction options are rejected', () => {
    assert.throws(() => createAdminSessionStore(null), TypeError);
    assert.throws(() => createAdminSessionStore([]), TypeError);
    assert.throws(
        () => createAdminSessionStore({ ttlMs: 0 }),
        TypeError
    );
    assert.throws(
        () => createAdminSessionStore({ ttlMs: -1 }),
        TypeError
    );
    assert.throws(
        () => createAdminSessionStore({ ttlMs: 1.5 }),
        TypeError
    );
    assert.throws(
        () => createAdminSessionStore({ now: 'invalid' }),
        TypeError
    );
    assert.throws(
        () => createAdminSessionStore({ randomBytes: 'invalid' }),
        TypeError
    );
});

test('3. A session uses 32 random bytes, base64url encoding, and the default expiry', () => {
    let requestedByteCount = null;

    const store = createAdminSessionStore({
        now: () => 1000,
        randomBytes: (size) => {
            requestedByteCount = size;
            return Buffer.alloc(size, 0xab);
        }
    });

    const session = store.createSession();

    assert.strictEqual(requestedByteCount, 32);
    assert.strictEqual(
        session.id,
        Buffer.alloc(32, 0xab).toString('base64url')
    );
    assert.strictEqual(
        session.expiresAt,
        1000 + DEFAULT_ADMIN_SESSION_TTL_MS
    );
    assert.strictEqual(Object.isFrozen(session), true);
    assert.strictEqual(store.hasSession(session.id), true);
});

test('4. A session expires exactly at the now >= expiresAt boundary', () => {
    let currentTime = 5000;

    const store = createAdminSessionStore({
        ttlMs: 1000,
        now: () => currentTime,
        randomBytes: (size) => Buffer.alloc(size, 0x01)
    });

    const session = store.createSession();

    currentTime = session.expiresAt - 1;
    assert.strictEqual(store.hasSession(session.id), true);

    currentTime = session.expiresAt;
    assert.strictEqual(store.hasSession(session.id), false);

    currentTime = session.expiresAt - 1;
    assert.strictEqual(
        store.hasSession(session.id),
        false,
        'An expired session must remain removed'
    );
});

test('5. A custom positive session lifetime is applied exactly', () => {
    const store = createAdminSessionStore({
        ttlMs: 2500,
        now: () => 2000,
        randomBytes: (size) => Buffer.alloc(size, 0x02)
    });

    const session = store.createSession();

    assert.strictEqual(session.expiresAt, 4500);
});

test('6. Explicit deletion invalidates a session and is idempotent', () => {
    const store = createAdminSessionStore({
        now: () => 3000,
        randomBytes: (size) => Buffer.alloc(size, 0x03)
    });

    const session = store.createSession();

    assert.strictEqual(store.deleteSession(session.id), true);
    assert.strictEqual(store.hasSession(session.id), false);
    assert.strictEqual(store.deleteSession(session.id), false);
    assert.strictEqual(store.deleteSession(null), false);
    assert.strictEqual(store.deleteSession(''), false);
});

test('7. Expired-session cleanup removes only expired sessions', () => {
    let currentTime = 1000;
    let randomValue = 0;

    const store = createAdminSessionStore({
        ttlMs: 1000,
        now: () => currentTime,
        randomBytes: (size) => {
            randomValue += 1;
            return Buffer.alloc(size, randomValue);
        }
    });

    const firstSession = store.createSession();

    currentTime = 1500;
    const secondSession = store.createSession();

    currentTime = 2000;
    assert.strictEqual(store.clearExpiredSessions(), 1);
    assert.strictEqual(store.hasSession(firstSession.id), false);
    assert.strictEqual(store.hasSession(secondSession.id), true);

    currentTime = 2500;
    assert.strictEqual(store.clearExpiredSessions(), 1);
    assert.strictEqual(store.hasSession(secondSession.id), false);
    assert.strictEqual(store.clearExpiredSessions(), 0);
});

test('8. Invalid session identifiers are safely rejected', () => {
    const store = createAdminSessionStore();

    assert.strictEqual(store.hasSession(null), false);
    assert.strictEqual(store.hasSession(false), false);
    assert.strictEqual(store.hasSession(0), false);
    assert.strictEqual(store.hasSession({}), false);
    assert.strictEqual(store.hasSession([]), false);
    assert.strictEqual(store.hasSession(''), false);
});

test('9. Invalid clock and random-byte results fail safely', () => {
    const invalidClockStore = createAdminSessionStore({
        now: () => 'invalid-time',
        randomBytes: (size) => Buffer.alloc(size)
    });

    assert.throws(
        () => invalidClockStore.createSession(),
        TypeError
    );

    const nonBufferStore = createAdminSessionStore({
        now: () => 1000,
        randomBytes: (size) => new Uint8Array(size)
    });

    assert.throws(
        () => nonBufferStore.createSession(),
        TypeError
    );

    const shortBufferStore = createAdminSessionStore({
        now: () => 1000,
        randomBytes: () => Buffer.alloc(31)
    });

    assert.throws(
        () => shortBufferStore.createSession(),
        TypeError
    );
});

test('10. Stores are isolated and do not expose mutable internal state', () => {
    const options = Object.freeze({
        now: () => 1000,
        randomBytes: (size) => Buffer.alloc(size, 0x04)
    });

    const firstStore = createAdminSessionStore(options);
    const secondStore = createAdminSessionStore(options);

    const firstSession = firstStore.createSession();
    const secondSession = secondStore.createSession();

    assert.strictEqual(firstSession.id, secondSession.id);
    assert.strictEqual(Object.isFrozen(firstStore), true);
    assert.strictEqual(Object.isFrozen(secondStore), true);

    assert.strictEqual(firstStore.deleteSession(firstSession.id), true);
    assert.strictEqual(firstStore.hasSession(firstSession.id), false);
    assert.strictEqual(secondStore.hasSession(secondSession.id), true);

    assert.deepStrictEqual(Object.keys(firstStore), [
        'createSession',
        'hasSession',
        'deleteSession',
        'clearExpiredSessions'
    ]);
});
