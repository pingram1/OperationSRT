/**
 * Shared PII / secret scrubber for logs and Sentry events.
 *
 * Two passes:
 *   1. KEY scrub  — any object key matching SENSITIVE_KEY_RE has its value
 *                   replaced with '[REDACTED]', regardless of the value.
 *   2. VALUE scrub — string values are scanned for high-confidence patterns
 *                   (JWTs, bearer tokens, Stripe keys, credit-card-shaped
 *                   numbers) and replaced inline.
 *
 * We mask emails partially (`a***@domain.tld`) instead of redacting them
 * entirely so logs stay useful for support — you can still tell which
 * tenant a message belongs to without storing the whole address.
 *
 * Caps:
 *   - depth: avoid infinite recursion on cyclic objects.
 *   - string length: long blobs (e.g. base64 PDFs, stack traces from a
 *     vendor) are truncated at MAX_STRING_LENGTH so a single log line
 *     can't blow our log budget.
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 4096;

const SENSITIVE_KEY_RE = /(password|passwd|pwd|secret|token|authorization|apikey|api[_-]?key|cookie|session|csrf|ssn|creditcard|cardnumber|cvv|pin|refreshtoken|accesstoken|idtoken|otp|twofactor|2fa)/i;

const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}/gi;
const STRIPE_KEY_RE = /\b(sk|pk|rk|whsec)_(test|live)_[A-Za-z0-9]{8,}/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const EMAIL_RE = /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

/**
 * Apply value-level scrubbing to a single string.
 */
function scrubString(value) {
    if (typeof value !== 'string') return value;
    let out = value;
    if (out.length > MAX_STRING_LENGTH) {
        out = `${out.slice(0, MAX_STRING_LENGTH)}…[truncated ${out.length - MAX_STRING_LENGTH} chars]`;
    }
    out = out.replace(JWT_RE, REDACTED);
    out = out.replace(BEARER_RE, 'Bearer [REDACTED]');
    out = out.replace(STRIPE_KEY_RE, REDACTED);
    out = out.replace(CARD_RE, (match) => {
        const digits = match.replace(/\D/g, '');
        if (digits.length < 13 || digits.length > 19) return match;
        return REDACTED;
    });
    out = out.replace(EMAIL_RE, (_match, first, domain) => `${first}***@${domain}`);
    return out;
}

/**
 * Recursively scrub any value (object, array, primitive). Returns a copy;
 * the original is left untouched so callers can keep using it.
 */
function scrub(value, depth = 0, seen = new WeakSet()) {
    if (value == null) return value;
    if (depth >= MAX_DEPTH) return '[Truncated: max depth]';

    if (typeof value === 'string') {
        return scrubString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return value;
    }
    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return `[Buffer ${value.length}b]`;

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return value.map((item) => scrub(item, depth + 1, seen));
    }

    if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            if (SENSITIVE_KEY_RE.test(key)) {
                out[key] = REDACTED;
            } else {
                out[key] = scrub(val, depth + 1, seen);
            }
        }
        return out;
    }

    return value;
}

/**
 * Scrub an Express-shaped request snapshot. Useful from middleware /
 * Sentry beforeSend where we have headers, body, query, params.
 */
function scrubRequestLike(req) {
    if (!req || typeof req !== 'object') return req;
    return {
        method: req.method,
        url: req.url,
        path: req.path,
        query: scrub(req.query),
        params: scrub(req.params),
        body: scrub(req.body),
        headers: scrub(req.headers),
    };
}

module.exports = {
    scrub,
    scrubString,
    scrubRequestLike,
    SENSITIVE_KEY_RE,
    REDACTED,
};
