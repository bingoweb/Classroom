const assert = require('node:assert/strict');
const test = require('node:test');

const {
    NO_STORE,
    REVALIDATE_PUBLIC,
    cacheControlForPublicFile,
    setPublicStaticCacheHeaders,
    setUploadStaticCacheHeaders
} = require('../backend/static-cache-policy.js');

test('kiosk documents remain uncached while reusable assets can be revalidated', () => {
    assert.equal(cacheControlForPublicFile('/app/public/index.html', '/'), NO_STORE);
    assert.equal(
        cacheControlForPublicFile('/app/public/admin/index.html', '/admin/'),
        NO_STORE
    );
    assert.equal(
        cacheControlForPublicFile('/app/public/admin/style.css', '/admin/style.css'),
        NO_STORE
    );
    assert.equal(
        cacheControlForPublicFile('/app/public/assets/kiosk-magic-park-shell.webp', '/assets/kiosk-magic-park-shell.webp'),
        REVALIDATE_PUBLIC
    );
    assert.equal(
        cacheControlForPublicFile('/app/public/js/noise-meter.js', '/js/noise-meter.js'),
        REVALIDATE_PUBLIC
    );
});

test('static header setters apply their scoped policies', () => {
    const createResponse = requestPath => ({
        req: { path: requestPath },
        headers: {},
        set(name, value) {
            this.headers[name] = value;
        }
    });

    const publicResponse = createResponse('/assets/icon.png');
    setPublicStaticCacheHeaders(publicResponse, '/app/public/assets/icon.png');
    assert.equal(publicResponse.headers['Cache-Control'], REVALIDATE_PUBLIC);

    const uploadResponse = createResponse('/uploads/student.png');
    setUploadStaticCacheHeaders(uploadResponse);
    assert.equal(uploadResponse.headers['Cache-Control'], REVALIDATE_PUBLIC);
});
