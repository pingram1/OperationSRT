/**
 * Helper to emit the canonical error envelope WITHOUT throwing.
 *
 * Prefer throwing `ApiError` (or `new Error(...)`) and letting the central
 * errorHandler shape the response. Use `sendError` only when you need to
 * short-circuit response logic in middleware (e.g. file-magic verification)
 * where wiring next(err) is awkward.
 *
 * Envelope:
 *   { success: false, message, code?, errors? }
 */
function sendError(res, statusCode, message, options = {}) {
    const body = { success: false, message };
    if (options.code) body.code = options.code;
    if (options.errors) body.errors = options.errors;
    return res.status(statusCode).json(body);
}

module.exports = sendError;
