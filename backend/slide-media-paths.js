'use strict';

const path = require('path');
const { normalizePath } = require('./utils');

const slidesDir = path.join(__dirname, 'uploads/slides');

function getCanonicalSlideMediaUrl(filename) {
    if (typeof filename !== 'string' || !filename.trim()) return null;
    if (filename.includes('/') || filename.includes('\\') || filename.includes('\0') || filename === '.' || filename === '..') return null;
    return `/uploads/slides/${filename}`;
}

function resolvePublicSlideMediaUrl(dbPath) {
    if (!dbPath || typeof dbPath !== 'string') return dbPath;

    const lower = dbPath.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('//')) {
        return dbPath;
    }

    const normalized = dbPath.replace(/\\/g, '/');
    const segment = 'uploads/slides/';
    const idx = normalized.indexOf(segment);
    if (idx !== -1) {
        const filename = normalized.slice(idx + segment.length);
        const canonical = getCanonicalSlideMediaUrl(filename);
        if (canonical) return canonical;
    }
    return normalizePath(dbPath, true);
}

function resolveManagedSlideMediaPath(dbPath) {
    if (!dbPath || typeof dbPath !== 'string') return null;

    const lower = dbPath.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('//')) {
        return null;
    }

    const normalized = dbPath.replace(/\\/g, '/');
    const segment = 'uploads/slides/';
    const idx = normalized.indexOf(segment);
    if (idx !== -1) {
        const filename = normalized.slice(idx + segment.length);
        if (getCanonicalSlideMediaUrl(filename)) {
            const absolutePath = path.resolve(slidesDir, filename);
            if (absolutePath.startsWith(slidesDir + path.sep)) {
                return absolutePath;
            }
        }
    }
    return null;
}

module.exports = {
    getCanonicalSlideMediaUrl,
    resolvePublicSlideMediaUrl,
    resolveManagedSlideMediaPath
};
