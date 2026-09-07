/**
 * AuthController Unit Tests
 * Defensive: null/undefined inputs, malformed data, boundary conditions.
 * Security: role injection, credential handling, bypass validation.
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require because Vitest's vi.mock doesn't intercept CommonJS require().
 */

const mock = require('mock-require');

const bcryptMock = {
  genSalt: vi.fn().mockResolvedValue('salt'),
  hash: vi.fn().mockResolvedValue('hashedPassword'),
  compare: vi.fn(),
};
const jwtMock = {
  sign: vi.fn((payload, secret, opts, cb) => {
    if (typeof opts === 'function') {
      opts(null, 'mock-token');
    } else if (cb) {
      cb(null, 'mock-token');
    }
    return 'mock-token';
  }),
  verify: vi.fn(),
};
const mockSave = vi.fn().mockResolvedValue(true);
const MockUser = function (attrs) {
  return {
    ...attrs,
    _id: 'user123',
    id: 'user123',
    role: attrs?.role || 'student',
    refreshToken: null,
    refreshTokenExpiry: null,
    save: mockSave,
  };
};
MockUser.findOne = vi.fn();
MockUser.findById = vi.fn();

const parentLinkMock = {
  createParentLinkRequestFromSignup: vi.fn().mockResolvedValue({ success: false }),
};

// Mock the TOTP helper so the 2FA login flow is deterministic (no real codes).
const twoFactorMock = {
  verifyToken: vi.fn(),
};

mock('bcryptjs', bcryptMock);
mock('jsonwebtoken', jwtMock);
mock('../models/User', MockUser);
mock('./parentLinkController', parentLinkMock);
mock('../utils/twoFactor', twoFactorMock);
mock('../services/telemetryService', {
  // Must return a promise: controllers call trackEvent(...).catch(...).
  trackEvent: vi.fn().mockResolvedValue(undefined),
});

const User = require('../models/User');
const {
  registerUser,
  loginUser,
  registerEmployee,
  refreshToken,
  verifyTwoFactorLogin,
} = require('./authController');

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('registerUser - defensive edge cases', () => {
    it('rejects when name is missing', async () => {
      req.body = { email: 'test@example.com', password: 'Password123' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please enter all fields' });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('rejects when email is missing', async () => {
      req.body = { name: 'Test User', password: 'Password123' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please enter all fields' });
    });

    it('rejects when password is missing', async () => {
      req.body = { name: 'Test User', email: 'test@example.com' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please enter all fields' });
    });

    it('rejects password shorter than 8 characters', async () => {
      req.body = { name: 'Test', email: 'test@example.com', password: 'Short1' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password must be at least 8 characters long',
      });
    });

    it('rejects password without letters', async () => {
      req.body = { name: 'Test', email: 'test@example.com', password: '12345678' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password must contain both letters and numbers',
      });
    });

    it('rejects password without numbers', async () => {
      req.body = { name: 'Test', email: 'test@example.com', password: 'PasswordOnly' };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password must contain both letters and numbers',
      });
    });

    it('rejects role injection - blocks admin registration via public endpoint', async () => {
      req.body = {
        name: 'Hacker',
        email: 'hacker@example.com',
        password: 'Password123',
        role: 'admin',
      };
      User.findOne.mockResolvedValue(null);

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid role for public registration'),
        })
      );
    });

    it('rejects tutor role via public registration', async () => {
      req.body = {
        name: 'Tutor',
        email: 'tutor@example.com',
        password: 'Password123',
        role: 'tutor',
      };
      User.findOne.mockResolvedValue(null);

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects when email already exists', async () => {
      req.body = {
        name: 'Test',
        email: 'existing@example.com',
        password: 'Password123',
      };
      User.findOne.mockResolvedValue({ _id: 'existing' });

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An account with this email already exists',
      });
    });
  });

  describe('loginUser - defensive edge cases', () => {
    it('rejects when email is missing', async () => {
      req.body = { password: 'Password123' };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please provide email and password' });
    });

    it('rejects when password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please provide email and password' });
    });

    it('rejects when user not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'Password123' };
      User.findOne.mockResolvedValue(null);

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('rejects when password does not match', async () => {
      req.body = { email: 'user@example.com', password: 'WrongPassword' };
      User.findOne.mockResolvedValue({
        _id: 'user123',
        email: 'user@example.com',
        password: 'hashed',
        authMethod: 'password',
        role: 'student',
        save: vi.fn(),
      });
      bcryptMock.compare.mockResolvedValue(false);

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('rejects when account is suspended/disabled', async () => {
      req.body = { email: 'user@example.com', password: 'Password123' };
      User.findOne.mockResolvedValue({
        _id: 'user123',
        email: 'user@example.com',
        password: 'hashed',
        authMethod: 'password',
        role: 'student',
        accountStatus: 'suspended',
        save: vi.fn(),
      });

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('not active') })
      );
    });

    it('issues tokens directly when 2FA is not enabled', async () => {
      req.body = { email: 'user@example.com', password: 'Password123' };
      const save = vi.fn().mockResolvedValue(true);
      User.findOne.mockResolvedValue({
        _id: 'user123',
        id: 'user123',
        name: 'User',
        email: 'user@example.com',
        password: 'hashed',
        authMethod: 'password',
        role: 'student',
        save,
      });
      bcryptMock.compare.mockResolvedValue(true);

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'mock-token' })
      );
      // No 2FA challenge in the response.
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ twoFactorRequired: true })
      );
    });

    it('returns a 2FA challenge (no tokens) when 2FA is active', async () => {
      req.body = { email: 'user@example.com', password: 'Password123' };
      User.findOne.mockResolvedValue({
        _id: 'user123',
        id: 'user123',
        email: 'user@example.com',
        password: 'hashed',
        authMethod: 'password',
        role: 'student',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
        save: vi.fn(),
      });
      bcryptMock.compare.mockResolvedValue(true);

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          twoFactorRequired: true,
          challengeToken: 'mock-token',
        })
      );
      // The access token must NOT be present yet.
      const payload = res.json.mock.calls[0][0];
      expect(payload.token).toBeUndefined();
    });
  });

  describe('verifyTwoFactorLogin - 2FA challenge exchange', () => {
    it('rejects when challengeToken or token is missing', async () => {
      req.body = { challengeToken: 'abc' };

      await verifyTwoFactorLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'challengeToken and token are required',
      });
    });

    it('rejects an invalid/expired challenge token', async () => {
      req.body = { challengeToken: 'bad', token: '123456' };
      jwtMock.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await verifyTwoFactorLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects when the TOTP code is invalid', async () => {
      req.body = { challengeToken: 'good', token: '000000' };
      jwtMock.verify.mockReturnValue({ twoFactorPending: true, userId: 'user123' });
      User.findById.mockResolvedValue({
        _id: 'user123',
        id: 'user123',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
        save: vi.fn(),
      });
      twoFactorMock.verifyToken.mockReturnValue(false);

      await verifyTwoFactorLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid verification code' });
    });

    it('issues tokens when the TOTP code is valid', async () => {
      req.body = { challengeToken: 'good', token: '123456' };
      jwtMock.verify.mockReturnValue({ twoFactorPending: true, userId: 'user123' });
      User.findById.mockResolvedValue({
        _id: 'user123',
        id: 'user123',
        name: 'User',
        email: 'user@example.com',
        role: 'student',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
        save: vi.fn().mockResolvedValue(true),
      });
      twoFactorMock.verifyToken.mockReturnValue(true);

      await verifyTwoFactorLogin(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'mock-token' })
      );
    });
  });

  describe('refreshToken - defensive edge cases', () => {
    it('rejects when refreshToken is missing', async () => {
      req.body = {};

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Refresh token is required' });
    });

    it('rejects when refreshToken is invalid', async () => {
      req.body = { refreshToken: 'invalid-token' };
      jwtMock.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid or expired refresh token',
      });
    });
  });

  describe('registerEmployee - security boundaries', () => {
    it('rejects when admin exists and no token provided', async () => {
      req.body = {
        name: 'Admin',
        email: 'admin2@example.com',
        password: 'Password123',
        role: 'admin',
      };
      User.findOne
        .mockResolvedValueOnce({ role: 'admin' })
        .mockResolvedValueOnce(null);

      await registerEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('An admin already exists'),
        })
      );
    });

    it('rejects invalid role for employee registration', async () => {
      req.body = {
        name: 'User',
        email: 'user@example.com',
        password: 'Password123',
        role: 'student',
      };
      User.findOne.mockResolvedValue(null);

      await registerEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid role'),
        })
      );
    });
  });
});
