const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const authConfig = require('../backend/admin-auth-config.js');
const {
    ADMIN_USERNAME_ENV,
    ADMIN_PASSWORD_ENV,
    DEFAULT_ADMIN_USERNAME,
    readAdminUsername,
    readAdminPassword,
    matchesAdminUsername,
    matchesAdminPassword,
    matchesAdminCredentials
} = authConfig;

test('1. Admin credential environment variables use the required names', () => {
    assert.strictEqual(ADMIN_USERNAME_ENV, 'CLASSROOM_ADMIN_USERNAME');
    assert.strictEqual(ADMIN_PASSWORD_ENV, 'CLASSROOM_ADMIN_PASSWORD');
});

test('2. The default username is admin and can be overridden exactly', () => {
    assert.strictEqual(DEFAULT_ADMIN_USERNAME, 'admin');
    assert.strictEqual(readAdminUsername({}), 'admin');
    assert.strictEqual(readAdminUsername({ CLASSROOM_ADMIN_USERNAME: 'yonetici' }), 'yonetici');
    assert.strictEqual(matchesAdminUsername('admin', {}), true);
    assert.strictEqual(matchesAdminUsername('Admin', {}), false);
});

test('3. Missing or invalid password environment objects are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword(null), null);
    assert.strictEqual(readAdminPassword(false), null);
    assert.strictEqual(readAdminPassword('invalid'), null);
    assert.strictEqual(readAdminPassword({}), null);
});

test('4. Empty and whitespace-only values are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '' }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: ' ' }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '\t\n' }), null);
});

test('5. Non-string values are treated as unconfigured', () => {
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: 0 }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: false }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: {} }), null);
    assert.strictEqual(readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: [] }), null);
});

test('6. A valid configured password is returned without normalization', () => {
    assert.strictEqual(
        readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi' }),
        'sinif-parolasi'
    );

    assert.strictEqual(
        readAdminPassword({ CLASSROOM_ADMIN_PASSWORD: '  bosluklu-parola  ' }),
        '  bosluklu-parola  '
    );
});

test('7. The supplied environment object is not mutated', () => {
    const env = Object.freeze({
        CLASSROOM_ADMIN_PASSWORD: 'degistirilmemeli'
    });

    assert.strictEqual(readAdminPassword(env), 'degistirilmemeli');
    assert.deepStrictEqual(env, {
        CLASSROOM_ADMIN_PASSWORD: 'degistirilmemeli'
    });
});

test('8. The default process.env value is read at call time', () => {
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

test('9. An exact configured password matches', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(
        matchesAdminPassword('sinif-parolasi', env),
        true
    );
});

test('10. An incorrect password does not match', () => {
    const env = {
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(
        matchesAdminPassword('yanlis-parola', env),
        false
    );
});

test('11. Incorrect default candidates and non-string candidates do not match', () => {
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

test('12. Different password lengths return false without throwing', () => {
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

test('13. Password comparison preserves whitespace exactly', () => {
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

test('14. Password comparison preserves Unicode exactly', () => {
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

test('15. Password comparison reads process.env at call time and restores safely', () => {
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

test('16. No committed default password digest exists and unconfigured auth is fail-closed', () => {
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(authConfig, 'DEFAULT_ADMIN_PASSWORD_DIGEST_HEX'),
        false
    );

    for (const candidate of ['admin', 'password', 'classroom', 'test-password', 'öğretmen-🔐']) {
        assert.strictEqual(matchesAdminPassword(candidate, {}), false);
        assert.strictEqual(
            matchesAdminCredentials('admin', candidate, {}),
            false
        );
    }
});

test('17. Auth source contains no fallback password digest contract', () => {
    const source = fs.readFileSync(path.join(__dirname, '../backend/admin-auth-config.js'), 'utf8');
    assert.doesNotMatch(source, /DEFAULT_ADMIN_PASSWORD_DIGEST_HEX/);
    assert.doesNotMatch(source, /configuredPassword\s*===\s*null[\s\S]{0,160}Buffer\.from/);
});

test('18. Username and password must both match', () => {
    const env = {
        CLASSROOM_ADMIN_USERNAME: 'admin',
        CLASSROOM_ADMIN_PASSWORD: 'sinif-parolasi'
    };

    assert.strictEqual(matchesAdminCredentials('admin', 'sinif-parolasi', env), true);
    assert.strictEqual(matchesAdminCredentials('yanlis', 'sinif-parolasi', env), false);
    assert.strictEqual(matchesAdminCredentials('admin', 'yanlis-parola', env), false);
});
