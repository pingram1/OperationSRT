/**
 * AuthMiddleware Unit Tests
 * Security: JWT verification, authorization bypass, malformed token handling,
 * and hardened live-account reload (revoked/disabled users rejected immediately).
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require to mock the User model (the repo-wide convention, since
 * Vitest's vi.mock does not reliably intercept these CommonJS requires) and
 * REAL jsonwebtoken (signing with the test JWT_SECRET from tests/setup.js) so
 * token verification is exercised for real.
 */
const mock = require('mock-require');

const findByIdMock = vi.fn();
const MockUser = { findById: findByIdMock };
mock('../../models/User', MockUser);

const jwt = require('jsonwebtoken');
const { authMiddleware, authorize } = require('../../middleware/AuthMiddleware');

/** Sign a real access token shaped like the app's tokens. */
const signToken = (payload, opts) => jwt.sign(payload, process.env.JWT_SECRET, opts);

/** Emulate Mongoose's `User.findById(...).select(...)` resolving to `value`. */
const mockFindByIdResolving = (value) =>
  findByIdMock.mockReturnValue({ select: vi.fn().mockResolvedValue(value) });

describe('AuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.resetAllMocks();
    req = { header: vi.fn() };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('authMiddleware - no token', () => {
    it('returns 401 when Authorization header is missing', async () => {
      req.header.mockReturnValue(undefined);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization does not start with Bearer', async () => {
      req.header.mockReturnValue('Basic abc123');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware - invalid token', () => {
    it('returns 401 when the token is malformed', async () => {
      req.header.mockReturnValue('Bearer not-a-real-jwt');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is signed with the wrong secret', async () => {
      const token = jwt.sign({ user: { id: 'user123', role: 'student' } }, 'a-different-secret');
      req.header.mockReturnValue(`Bearer ${token}`);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is expired', async () => {
      const token = signToken({ user: { id: 'user123', role: 'student' } }, { expiresIn: '-1s' });
      req.header.mockReturnValue(`Bearer ${token}`);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token payload has no user id', async () => {
      const token = signToken({ user: {} });
      req.header.mockReturnValue(`Bearer ${token}`);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware - live account reload', () => {
    it('attaches the FRESH role + tenant context from the DB and calls next', async () => {
      // Token says student, but the DB says the user is now a school_admin.
      const token = signToken({ user: { id: 'user123', role: 'student' } });
      req.header.mockReturnValue(`Bearer ${token}`);
      mockFindByIdResolving({
        _id: 'user123',
        role: 'school_admin',
        accountStatus: 'active',
        schoolId: 'school-a',
        sector: 'charter',
      });

      await authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        role: 'school_admin',
        schoolId: 'school-a',
        sector: 'charter',
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when the account no longer exists', async () => {
      const token = signToken({ user: { id: 'ghost', role: 'admin' } });
      req.header.mockReturnValue(`Bearer ${token}`);
      mockFindByIdResolving(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND' }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the account is suspended/disabled', async () => {
      const token = signToken({ user: { id: 'user123', role: 'tutor' } });
      req.header.mockReturnValue(`Bearer ${token}`);
      mockFindByIdResolving({ _id: 'user123', role: 'tutor', accountStatus: 'suspended' });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ACCOUNT_INACTIVE' }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize - role-based access', () => {
    beforeEach(() => {
      req.user = { id: 'user123', role: 'student' };
    });

    it('allows super_admin to bypass all role checks', () => {
      req.user.role = 'super_admin';
      const authorizeAdmin = authorize('admin');

      authorizeAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user role is not in allowed roles', () => {
      const authorizeAdmin = authorize('admin');

      authorizeAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('student') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('allows access when user role is in allowed roles', () => {
      const authorizeStudent = authorize('student', 'parent');

      authorizeStudent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
