const { validationResult } = require('express-validator');

/**
 * Express middleware that consumes any preceding express-validator chains
 * and short-circuits with a 400 if validation failed.
 *
 * Usage:
 *   router.post('/login',
 *     authValidators.login,
 *     validateRequest,
 *     loginUser);
 *
 * Emits the canonical error envelope (see middleware/errorHandler.js):
 *
 *   {
 *     success: false,
 *     message: 'Invalid request',
 *     code: 'INVALID_INPUT',
 *     errors: [{ path, msg }, ...]
 *   }
 *
 * We intentionally expose only `path` (the field that failed) and `msg`
 * (a short, safe description). We do NOT echo back the offending value,
 * since some fields (passwords, tokens) are sensitive even when invalid.
 */
function validateRequest(req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = result.array({ onlyFirstError: true }).map((e) => ({
        path: e.path || e.param || 'body',
        msg: e.msg,
    }));
    return res.status(400).json({
        success: false,
        message: 'Invalid request',
        code: 'INVALID_INPUT',
        errors,
    });
}

module.exports = { validateRequest };
