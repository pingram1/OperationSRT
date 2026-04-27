/**
 * Standard error class for the API.
 *
 * Throw this from controllers/services and the central errorHandler will
 * turn it into the canonical error envelope:
 *
 *   { success: false, message, code?, errors? }
 *
 * Field semantics:
 *   - `statusCode` (number): HTTP status to return. Defaults to 500.
 *   - `message` (string): human-readable, safe to show to the client.
 *   - `code` (string, optional): machine-readable code for clients to
 *     branch on (e.g. 'STRIPE_NOT_CONFIGURED', 'WALLET_INSUFFICIENT_FUNDS').
 *     Stable across releases — DO NOT rename casually.
 *   - `errors` (array, optional): per-field details, shaped like
 *     `[{ path, msg }]`, matching the express-validator output produced
 *     by middleware/validate.js. Surfaces both validation failures and
 *     domain rule violations that affect specific fields.
 *
 * Use the static helpers (ApiError.badRequest, .unauthorized, etc.) for
 * common cases. Anything 5xx or unexpected should usually be a regular
 * Error so the central handler logs it as an unhandled crash.
 */
class ApiError extends Error {
    constructor(statusCode, message, options = {}) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        if (options.code) this.code = options.code;
        if (options.errors) this.errors = options.errors;
        if (options.cause) this.cause = options.cause;
    }

    static badRequest(message = 'Bad request', options) {
        return new ApiError(400, message, options);
    }

    static unauthorized(message = 'Unauthorized', options) {
        return new ApiError(401, message, options);
    }

    static forbidden(message = 'Forbidden', options) {
        return new ApiError(403, message, options);
    }

    static notFound(message = 'Not found', options) {
        return new ApiError(404, message, options);
    }

    static conflict(message = 'Conflict', options) {
        return new ApiError(409, message, options);
    }

    static unprocessable(message = 'Unprocessable entity', options) {
        return new ApiError(422, message, options);
    }
}

module.exports = ApiError;
