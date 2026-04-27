const crypto = require('crypto');

/**
 * Per-request correlation ID middleware.
 *
 * Why this exists: every error/log line needs a stable handle so an admin
 * who sees a failure in the UI can hand "Request ID: abc-123" to support
 * and pull the matching server logs in seconds. Without this, we have to
 * guess at userId + timestamp, and shared infra can't correlate at all.
 *
 * Behavior:
 *   - If the upstream sent `X-Request-Id` and it looks safe (printable,
 *     <= 128 chars, no control characters), we trust it. This lets a
 *     reverse proxy / API gateway propagate its own request id end-to-end.
 *   - Otherwise we generate a UUID v4.
 *   - The id is exposed as `req.requestId` and echoed in the
 *     `X-Request-Id` response header.
 *
 * NB: We do NOT trust arbitrary client-supplied ids in the auth path
 * because they would then leak into logs. The validation regex ensures
 * the id is only ASCII alnum + a few separators (hex/UUID/ULID-ish).
 */

const VALID_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function isValidIncomingId(value) {
    if (!value || typeof value !== 'string') return false;
    return VALID_ID_RE.test(value);
}

function generateRequestId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
}

function requestIdMiddleware(req, res, next) {
    const incoming = req.get('x-request-id');
    const requestId = isValidIncomingId(incoming) ? incoming : generateRequestId();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
}

module.exports = {
    requestIdMiddleware,
    generateRequestId,
    isValidIncomingId,
};
