'use strict';

function createFailureRateLimiter(options) {
    const windowMs = options.windowMs;
    const maxFailures = options.maxFailures;
    const keyGenerator = options.keyGenerator;
    const message = options.message;

    const store = new Map();

    function opportunisticCleanup(now) {
        for (const [key, record] of store.entries()) {
            if (now >= record.resetTime) {
                store.delete(key);
            }
        }
    }

    function guard(req, res, next) {
        const now = Date.now();
        opportunisticCleanup(now);

        const key = keyGenerator(req);
        if (!key) {
            return next();
        }

        const record = store.get(key);
        if (record) {
            if (now < record.resetTime) {
                if (record.count >= maxFailures) {
                    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
                    res.setHeader('Retry-After', String(retryAfterSeconds));
                    res.setHeader('Cache-Control', 'no-store');
                    return res.status(429).json(message);
                }
            } else {
                store.delete(key);
            }
        }
        next();
    }

    function recordFailure(req) {
        const now = Date.now();
        const key = keyGenerator(req);
        if (!key) {
            return;
        }

        const record = store.get(key);
        if (record && now < record.resetTime) {
            record.count += 1;
        } else {
            store.set(key, { count: 1, resetTime: now + windowMs });
        }
    }

    function reset(req) {
        const key = keyGenerator(req);
        if (key) {
            store.delete(key);
        }
    }

    return { guard, recordFailure, reset };
}

function createRequestRateLimiter(options) {
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;
    const keyGenerator = options.keyGenerator;
    const message = options.message;

    const store = new Map();

    function opportunisticCleanup(now) {
        for (const [key, record] of store.entries()) {
            if (now >= record.resetTime) {
                store.delete(key);
            }
        }
    }

    return function middleware(req, res, next) {
        const now = Date.now();
        opportunisticCleanup(now);

        const key = keyGenerator(req);
        if (!key) {
            return next();
        }

        let record = store.get(key);
        if (record && now < record.resetTime) {
            if (record.count >= maxRequests) {
                const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
                res.setHeader('Retry-After', String(retryAfterSeconds));
                res.setHeader('Cache-Control', 'no-store');
                return res.status(429).json(message);
            }
            record.count += 1;
        } else {
            store.set(key, { count: 1, resetTime: now + windowMs });
        }
        
        next();
    };
}

module.exports = {
    createFailureRateLimiter,
    createRequestRateLimiter
};
