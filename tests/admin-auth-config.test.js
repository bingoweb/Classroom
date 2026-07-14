const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ADMIN_PASSWORD_ENV,
    readAdminPassword,
    matchesAdminPassword
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

test('8. An exact configured password matches', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(
        matchesAdminPassword('sinif-parolasi', env),
        true
    );
});

test('9. An incorrect password does not match', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(
        matchesAdminPassword('yanlis-parola', env),
        false
    );
});

test('10. Missing configuration and non-string candidates do not match', () => {
    assert.strictEqual(matchesAdminPassword('aday', {}), false);
    assert.strictEqual(
        matchesAdminPassword('aday', {
            CLASSROOM_ADMIN_PASSWORD: '   '
        }),
        false
    );

    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(matchesAdminPassword(null, env), false);
    assert.strictEqual(matchesAdminPassword(false, env), false);
    assert.strictEqual(matchesAdminPassword(123, env), false);
    assert.strictEqual(matchesAdminPassword({}, env), false);
});

test('11. Different password lengths return false without throwing', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'uzun-sinif-parolasi'
    };

    assert.doesNotThrow(() => {
        assert.strictEqual(matchesAdminPassword('kisa', env), false);
    });

    assert.doesNotThrow(() => {
        assert.strictEqual(
            matchesAdminPassword('cok-daha-uzun-bir-aday-parola', env),
            false
        );
    });
});

test('12. Password comparison preserves whitespace exactly', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: '  bosluklu-parola  '
    };

    assert.strictEqual(
        matchesAdminPassword('  bosluklu-parola  ', env),
        true
    );
    assert.strictEqual(
        matchesAdminPassword('bosluklu-parola', env),
        false
    );
    assert.strictEqual(
        matchesAdminPassword(' bosluklu-parola ', env),
        false
    );
});

test('13. Password comparison preserves Unicode exactly', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'öğretmen-🔐'
    };

    assert.strictEqual(
        matchesAdminPassword('öğretmen-🔐', env),
        true
    );
    assert.strictEqual(
        matchesAdminPassword('ogretmen-🔐', env),
        false
    );
    assert.strictEqual(
        matchesAdminPassword('öğretmen-🔓', env),
        false
    );
});

test('14. Password comparison reads process.env at call time and restores safely', () => {
    const hadOriginalValue = Object.prototype.hasOwnProperty.call(
        process.env,
        'CLASSROOM_ADMIN_PASSWORD'
    );
    const originalValue = process.env.CLASSROOM_ADMIN_PASSWORD;

    try {
        process.env.CLASSROOM_ADMIN_PASSWORD = 'birinci-parola';
        assert.strictEqual(
            matchesAdminPassword('birinci-parola'),
            true
        );
        assert.strictEqual(
            matchesAdminPassword('ikinci-parola'),
            false
        );

        process.env.CLASSROOM_ADMIN_PASSWORD = 'ikinci-parola';
        assert.strictEqual(
            matchesAdminPassword('ikinci-parola'),
            true
        );
        assert.strictEqual(
            matchesAdminPassword('birinci-parola'),
            false
        );
    } finally {
        if (hadOriginalValue) {
            process.env.CLASSROOM_ADMIN_PASSWORD = originalValue;
        } else {
            delete process.env.CLASSROOM_ADMIN_PASSWORD;
        }
    }
});
