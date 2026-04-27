/**
 * Sentry initialization for the API. No-ops when SENTRY_DSN is unset
 * (non-production / local dev).
 *
 * Hardening notes:
 *   - `beforeSend` runs every captured event/exception through our shared
 *     PII scrubber so headers, body snapshots, breadcrumbs, and request
 *     contexts can never carry passwords, tokens, JWTs, or full emails.
 *   - We tag each captured exception with the request id so a Sentry
 *     issue can be cross-referenced against a server log line.
 */
const Sentry = require('@sentry/node');
const { scrub } = require('./scrub');

let initialized = false;

function safeBeforeSend(event) {
    try {
        return scrub(event);
    } catch (_err) {
        // If scrubbing itself throws, drop the event rather than risk leaking.
        return null;
    }
}

function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn || initialized) {
        return;
    }
    const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
        sendDefaultPii: false,
        beforeSend: safeBeforeSend,
        beforeBreadcrumb: (breadcrumb) => {
            try {
                return scrub(breadcrumb);
            } catch (_err) {
                return null;
            }
        },
    });
    initialized = true;
}

function captureServerException(err, req) {
    if (!initialized || !process.env.SENTRY_DSN) {
        return;
    }
    Sentry.withScope((scope) => {
        if (req) {
            if (req.requestId) {
                scope.setTag('request_id', req.requestId);
                scope.setContext('correlation', { requestId: req.requestId });
            }
            scope.setContext('request', {
                method: req.method,
                path: req.path,
                url: req.originalUrl,
            });
            if (req.user?.id) {
                scope.setUser({ id: String(req.user.id) });
            }
        }
        Sentry.captureException(err);
    });
}

module.exports = { initSentry, captureServerException, Sentry };
