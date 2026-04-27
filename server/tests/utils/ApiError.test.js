/**
 * Unit tests for utils/ApiError.js
 */
const ApiError = require('../../utils/ApiError');

describe('ApiError', () => {
    it('captures statusCode + message', () => {
        const err = new ApiError(418, "I'm a teapot");
        expect(err.statusCode).toBe(418);
        expect(err.message).toBe("I'm a teapot");
        expect(err.name).toBe('ApiError');
        expect(err).toBeInstanceOf(Error);
    });

    it('attaches optional code and errors', () => {
        const err = new ApiError(400, 'Invalid', {
            code: 'INVALID_INPUT',
            errors: [{ path: 'email', msg: 'bad email' }],
        });
        expect(err.code).toBe('INVALID_INPUT');
        expect(err.errors).toEqual([{ path: 'email', msg: 'bad email' }]);
    });

    it('omits code/errors when not provided (so errorHandler fallback wins)', () => {
        const err = new ApiError(404, 'Missing');
        expect(err).not.toHaveProperty('code');
        expect(err).not.toHaveProperty('errors');
    });

    it('static helpers map to canonical statuses', () => {
        expect(ApiError.badRequest().statusCode).toBe(400);
        expect(ApiError.unauthorized().statusCode).toBe(401);
        expect(ApiError.forbidden().statusCode).toBe(403);
        expect(ApiError.notFound().statusCode).toBe(404);
        expect(ApiError.conflict().statusCode).toBe(409);
        expect(ApiError.unprocessable().statusCode).toBe(422);
    });

    it('preserves cause chain when provided', () => {
        const root = new Error('root cause');
        const err = ApiError.badRequest('Wrapped', { cause: root });
        expect(err.cause).toBe(root);
    });
});
