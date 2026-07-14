const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ADMIN_PASSWORD_ENV,
    readAdminPassword
} = require('../backend/admin-auth-config.js');

test('1. ADMIN_PASSWORD_ENV uses the required environment-variable name', () => {
    assert.strictEqual(ADMIN_PASSWORD_ENV, 'CLASSROOM_ADMIN_PASSWORD');
});

test('2. Missing or invalid environment objects are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword(null), null);
    assert.strictEqual(readAdminPassword(false), null);
    assert.strictEqual(readAdminPassword('invalid'), null);
    assert.strictEqual(readAdminPassword({}), null);
});

test('3. Empty and whitespace-only values are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '' }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: ' ' }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '\t\n' }), null);
});

test('4. Non-string values are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: 0 }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: false }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: {} }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: [] }), null);
});

test('5. A valid configured password is returned without normalization', () => {
    assert.strictEqual(
        readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi' }),
        'sinif-parolasi'
    );

    assert.strictEqual(
        readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '  bosluklu-parola  ' }),
        '  bosluklu-parola  '
    );
});

test('6. The supplied environment object is not mutated', () => {
    const env = Object.freeze({
        CLASSROOM_ADMIN_PASSWORD: 'degistirilmemeli'
    });

    assert.strictEqual(readAdminPassword(env), 'degistirilmemeli');
    assert.deepStrictEqual(env, {
        CLASSROOM_ADMIN_PASSWORD: 'degistirilmemeli'
    });
});

test('7. The default process.env value is read at call time', () => {
    const hadOriginalValue = Object.prototype.hasOwnProperty.call(
        process.env,
        'CLASSROOM_ADMIN_PASSWORD'
    );
    const originalValue = process.env.CLASSROOM_ADMIN_PASSWORD;

    try {
        process.env.CLASSROOM_ADMIN_PASSWORD = 'birinci-parola';
        assert.strictEqual(readAdminPassword(), 'birinci-parola');

        process.env.CLASSROOM_ADMIN_PASSWORD = 'ikinci-parola';
        assert.strictEqual(readAdminPassword(), 'ikinci-parola');

        delete process.env.CLASSROOM_ADMIN_PASSWORD;
        assert.strictEqual(readAdminPassword(), null);
    } finally {
        if (hadOriginalValue) {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalValue;
        } else {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        }
    }
});
