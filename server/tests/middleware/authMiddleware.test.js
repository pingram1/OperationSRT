/**
 * AuthMiddleware Unit Tests
 * Security: JWT verification, authorization bypass, malformed token handling.
 * Pattern: Arrange-Act-Assert (AAA)
 */
const jwtVerifyMock = vi.hoisted(() => vi.fn());
vi.mock('jsonwebtoken', () => ({
  verify: jwtVerifyMock,
}));

vi.resetModules();
const jwt = require('jsonwebtoken');
const { authMiddleware, authorize } = require('../../middleware/AuthMiddleware');

describe('AuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { header: vi.fn() };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('authMiddleware - no token', () => {
    it('returns 401 when Authorization header is missing', () => {
      req.header.mockReturnValue(undefined);

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization does not start with Bearer', () => {
      req.header.mockReturnValue('Basic abc123');

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization is "Bearer " with no token', () => {
      req.header.mockReturnValue('Bearer ');
      jwtVerifyMock.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware - invalid token', () => {
    it('returns 401 when token is expired', () => {
      req.header.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      jwtVerifyMock.mockImplementation(() => {
        throw err;
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is signed with wrong secret', () => {
      req.header.mockReturnValue('Bearer invalid-token');
      jwtVerifyMock.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware - valid token', () => {
    it('attaches decoded user to req and calls next', () => {
      // Use real JWT to create valid token - avoids mock timing issues
      const realJwt = require('jsonwebtoken');
      const token = realJwt.sign(
        { user: { id: 'user123', role: 'student' } },
        process.env.JWT_SECRET
      );
      req.header.mockReturnValue(`Bearer ${token}`);

      authMiddleware(req, res, next);

      expect(req.user).toEqual({ id: 'user123', role: 'student' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
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

    it('throws when req.user is undefined (route misconfiguration - documents current behavior)', () => {
      delete req.user;
      const authorizeAdmin = authorize('admin');

      expect(() => authorizeAdmin(req, res, next)).toThrow();
    });
  });
});
