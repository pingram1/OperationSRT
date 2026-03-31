/**
 * Sentry initialization for the API. No-ops when SENTRY_DSN is unset (non-production / local dev).
 */
const Sentry = require('@sentry/node');

let initialized = false;

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
  });
  initialized = true;
}

/**
 * Report server errors to Sentry (typically 5xx). Safe to call if Sentry was never initialized.
 */
function captureServerException(err, req) {
  if (!initialized || !process.env.SENTRY_DSN) {
    return;
  }
  Sentry.withScope((scope) => {
    if (req) {
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
