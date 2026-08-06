const path = require('path');

const NO_STORE = 'no-store, no-cache, must-revalidate, private';
const REVALIDATE_PUBLIC = 'public, max-age=0, must-revalidate';

function isAdminStaticFile(filePath, requestPath = '') {
    const normalizedFilePath = String(filePath || '').split(path.sep).join('/');
    const normalizedRequestPath = String(requestPath || '');

    return normalizedFilePath.includes('/public/admin/')
        || normalizedRequestPath === '/admin'
        || normalizedRequestPath.startsWith('/admin/');
}

function cacheControlForPublicFile(filePath, requestPath = '') {
    const extension = path.extname(String(filePath || '')).toLowerCase();
    if (extension === '.html' || isAdminStaticFile(filePath, requestPath)) {
        return NO_STORE;
    }

    return REVALIDATE_PUBLIC;
}

function setPublicStaticCacheHeaders(res, filePath) {
    const requestPath = res.req && typeof res.req.path === 'string' ? res.req.path : '';
    res.set('Cache-Control', cacheControlForPublicFile(filePath, requestPath));
}

function setUploadStaticCacheHeaders(res) {
    res.set('Cache-Control', REVALIDATE_PUBLIC);
}

module.exports = {
    NO_STORE,
    REVALIDATE_PUBLIC,
    cacheControlForPublicFile,
    setPublicStaticCacheHeaders,
    setUploadStaticCacheHeaders
};
