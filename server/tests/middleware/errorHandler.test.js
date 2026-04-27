/**
 * ErrorHandler Unit Tests
 * Security: Verify error messages do not leak sensitive system information in production.
 * Pattern: Arrange-Act-Assert (AAA)
 */
const errorHandler = require('../../middleware/errorHandler');

describe('errorHandler', () => {
  let req, res, next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { path: '/api/test', method: 'GET', ip: '127.0.0.1' };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('production mode - sanitize 5xx errors', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('returns generic message for 500 errors to prevent info leakage', () => {
      const err = new Error('MongoDB connection failed: ECONNREFUSED');
      err.statusCode = 500;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'An error occurred',
        })
      );
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('error');
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    });

    it('returns generic message for unhandled errors', () => {
      const err = new Error('Internal server error with stack trace');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An error occurred',
        })
      );
    });
  });

  describe('development mode - expose details for debugging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('exposes error message and stack in development', () => {
      const err = new Error('Test error message');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
          error: 'Test error message',
        })
      );
      expect(res.json.mock.calls[0][0]).toHaveProperty('stack');
    });
  });

  describe('client errors (4xx) - expose regardless of env', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('exposes message for 400 ValidationError', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.statusCode = 400;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation Error',
        })
      );
    });

    it('exposes message for 400 CastError', () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid ID format',
        })
      );
    });

    it('exposes message for 401 JsonWebTokenError', () => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
        })
      );
    });

    it('exposes message for 401 TokenExpiredError', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
        })
      );
    });

    it('returns 409 for duplicate key (MongoServerError 11000)', () => {
      const err = new Error('E11000 duplicate key error');
      err.name = 'MongoServerError';
      err.code = 11000;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate entry',
        })
      );
    });
  });

  describe('validation errors object', () => {
    it('includes err.errors in response when present', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = { email: { message: 'Invalid email' } };

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: { email: { message: 'Invalid email' } },
        })
      );
    });
  });

  describe('requestId propagation', () => {
    it('echoes req.requestId in the canonical envelope', () => {
      process.env.NODE_ENV = 'production';
      req.requestId = 'abc-123-def';
      const err = new Error('boom');
      err.statusCode = 500;

      errorHandler(err, req, res, next);

      expect(res.json.mock.calls[0][0]).toMatchObject({
        success: false,
        requestId: 'abc-123-def',
      });
    });

    it('omits requestId when none is set on the request', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';

      errorHandler(err, req, res, next);

      expect(res.json.mock.calls[0][0]).not.toHaveProperty('requestId');
    });
  });
});
