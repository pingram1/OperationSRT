const logger = require('../utils/logger');

/**
 * Structured access log: emits one log line per response with method,
 * path, status, durationMs, userId, requestId. We log once on `finish`
 * (and `close` as a safety net for aborted connections) so we capture
 * the final status code and total handler latency.
 *
 * Health/static endpoints are skipped to keep production logs readable.
 */

const SKIP_PATHS = new Set(['/health']);

function shouldSkip(pathname) {
    if (!pathname) return false;
    if (SKIP_PATHS.has(pathname)) return true;
    if (pathname.startsWith('/uploads/')) return true;
    return false;
}

function levelForStatus(status) {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    return 'info';
}

function requestLogger(req, res, next) {
    if (shouldSkip(req.path)) {
        return next();
    }
    const start = process.hrtime.bigint();
    let logged = false;

    function emit() {
        if (logged) return;
        logged = true;
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const level = levelForStatus(res.statusCode);
        logger[level](`${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, {
            requestId: req.requestId,
            userId: req.user?.id,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    }

    res.on('finish', emit);
    res.on('close', emit);
    next();
}

module.exports = requestLogger;
