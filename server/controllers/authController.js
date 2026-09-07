const User = require('../models/User');
const School = require('../models/School');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createParentLinkRequestFromSignup } = require('./parentLinkController');
const logger = require('../utils/logger');
const { trackEvent } = require('../services/telemetryService');
const { verifyToken: verifyTotp } = require('../utils/twoFactor');

/**
 * Secret for the short-lived 2FA login-challenge token. Derived from JWT_SECRET
 * so it rotates with it, but namespaced so a challenge token can never be used
 * as an access token (different signing key + different claims).
 */
function getTwoFactorChallengeSecret() {
    return `${process.env.JWT_SECRET}_2fa_challenge`;
}

/**
 * Issue the access + refresh token pair for a fully authenticated user and
 * persist the refresh token. Returns the tokens; callers shape the response.
 */
async function issueAuthTokens(user) {
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    const refreshToken = jwt.sign({ userId: user.id }, getRefreshSecret(), { expiresIn: '7d' });
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return { token, refreshToken };
}

/**
 * Returns the refresh-token signing secret. Prefers the dedicated
 * JWT_REFRESH_SECRET env var when set; otherwise falls back to the legacy
 * derivation (`JWT_SECRET + '_refresh'`) so existing refresh tokens issued
 * before the migration continue to verify. New deployments should set
 * JWT_REFRESH_SECRET independently of JWT_SECRET.
 */
function getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;
}

/**
 * @desc    Register a new user (CLIENT PORTAL - Students and Parents only)
 * @route   POST /api/auth/register
 * @access  Public
 * @note    This endpoint only allows registration for 'student' and 'parent' roles.
 *          Tutors and admins must be created through the admin panel or employee onboarding.
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, studentEmail } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ message: 'Password must contain both letters and numbers' });
    }

    // Restrict registration to client roles only (students and parents)
    // Employees (tutors/admins) must be onboarded through admin panel
    const allowedRoles = ['student', 'parent'];
    const userRole = role || 'student'; // Default to student if not specified
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Invalid role for public registration. Tutors and administrators must use the employee portal.' 
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    user = new User({ 
      name: name.trim(), 
      email: normalizedEmail, 
      password, 
      role: userRole 
    });

    // If creating a tutor, set up tutorInfo with pending status
    if (userRole === 'tutor') {
      user.tutorInfo = {
        status: 'pending', // New tutors need admin approval
        subjects: [],
      };
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // If parent is signing up and provided a student email, create a link request
    let linkRequestResult = null;
    if (userRole === 'parent' && studentEmail) {
      try {
        linkRequestResult = await createParentLinkRequestFromSignup(user._id, studentEmail, '');
        if (!linkRequestResult.success) {
          console.log(`[registerUser] Failed to create link request: ${linkRequestResult.message}`);
          // Don't fail registration if link request fails, just log it
        }
      } catch (linkErr) {
        console.error('[registerUser] Error creating link request:', linkErr.message);
        // Don't fail registration if link request fails
      }
    }

    const payload = {
      user: { id: user.id, role: user.role },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        // Return both token and user data for immediate login
        const response = {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };

        // Include link request info if it was created
        if (linkRequestResult && linkRequestResult.success) {
          response.linkRequest = {
            message: 'Link request sent successfully. The student will need to accept it.',
            sent: true,
          };
        } else if (linkRequestResult && !linkRequestResult.success) {
          response.linkRequest = {
            message: linkRequestResult.message || 'Failed to send link request',
            sent: false,
          };
        }

        res.status(201).json(response);
      }
    );
  } catch (err) {
    console.error('Registration error:', err.message);
    console.error('Error name:', err.name);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    
    // Check for MongoDB connection errors
    if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError' || 
        err.name === 'MongooseError' || err.message.includes('Mongo') ||
        err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND') ||
        err.message.includes('connect')) {
      return res.status(503).json({ 
        message: 'Database connection error. Please check if MongoDB is running and try again.' 
      });
    }
    
    if (err.code === 11000) {
      // Duplicate key error (email already exists)
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    
    // Send more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Server error during registration' 
      : err.message || 'Server error during registration';
    
    res.status(500).json({ message: errorMessage });
  }
};

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Normalize email: trim whitespace and convert to lowercase
        // This must match how emails are stored during registration
        const normalizedEmail = email.trim().toLowerCase();
        
        logger.debug('Login attempt', { email: normalizedEmail });

        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            logger.warn('Login failed - user not found', { email: normalizedEmail });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        logger.debug('User found for login', { userId: user.id, role: user.role });
        
        // Check if user is using Google auth
        if (user.authMethod === 'google') {
            logger.warn('Login failed - Google auth required', { email: user.email });
            return res.status(400).json({ 
                message: 'This account uses Google authentication. Please sign in with Google.' 
            });
        }

        // Check if user has a password
        if (!user.password) {
            logger.warn('Login failed - no password set', { email: user.email });
            return res.status(400).json({ 
                message: 'This account uses Google authentication. Please sign in with Google.' 
            });
        }

        // Block suspended/disabled accounts at the door.
        if (user.accountStatus && user.accountStatus !== 'active') {
            logger.warn('Login failed - account not active', { email: user.email, status: user.accountStatus });
            return res.status(403).json({ message: 'Account is not active. Contact an administrator.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login failed - password mismatch', { email: user.email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Second factor gate: if 2FA is genuinely active (enabled AND a secret
        // exists), do NOT issue tokens yet. Return a short-lived challenge that
        // must be exchanged via /api/auth/2fa/verify with a valid TOTP code.
        // The `&& twoFactorSecret` guard protects legacy "fake 2FA" accounts
        // (enabled flag set but no secret) from being locked out.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const challengeToken = jwt.sign(
                { userId: user.id, twoFactorPending: true },
                getTwoFactorChallengeSecret(),
                { expiresIn: '5m' },
            );
            logger.info('Login requires 2FA', { userId: user.id });
            return res.status(200).json({
                twoFactorRequired: true,
                challengeToken,
                message: 'Enter the code from your authenticator app to complete sign-in.',
            });
        }

        logger.info('Login successful', { userId: user.id, email: user.email });

        trackEvent(
            'auth_login_success',
            { authMethod: 'password' },
            { actorUserId: user._id },
        ).catch(() => {});

        const { token, refreshToken } = await issueAuthTokens(user);
        return res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        logger.error('Login error', { error: err.message, stack: err.stack });
        
        // Check for MongoDB connection errors
        if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError' || 
            err.name === 'MongooseError' || err.message.includes('Mongo') ||
            err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND') ||
            err.message.includes('connect')) {
            return res.status(503).json({ 
                message: 'Database connection error. Please check if MongoDB is running and try again.' 
            });
        }
        
        res.status(500).json({ message: 'Server error during login' });
    }
};


/**
 * @desc    Register a new employee (EMPLOYEE PORTAL - Tutors and Admins)
 * @route   POST /api/auth/register-employee
 * @access  Public (but restricted - see logic below)
 * @note    This endpoint allows registration for 'tutor' and 'admin' roles.
 *          - If no admin exists: Anyone can create an admin (for initial setup)
 *          - If admin exists: Only admins can create new employees (via admin panel)
 */
const registerEmployee = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Only allow 'tutor', 'admin', and 'super_admin' roles
    const allowedRoles = ['tutor', 'admin', 'super_admin'];
    const userRole = role || 'tutor'; // Default to tutor if not specified
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({ 
        message: 'Invalid role. Employee registration only allows tutor, admin, or super_admin roles.' 
      });
    }

    // Check if any admin or super_admin exists
    const adminExists = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });

    // If trying to create an admin or super_admin and one already exists, require authentication
    if ((userRole === 'admin' || userRole === 'super_admin') && adminExists) {
      // Check if the request is authenticated and user is an admin or super_admin
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(403).json({ 
          message: 'An admin already exists. Only existing admins or super admins can create new admin accounts.' 
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const requester = await User.findById(decoded.user.id);
        
        if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
          return res.status(403).json({ 
            message: 'Only existing admins or super admins can create new admin accounts.' 
          });
        }
      } catch (err) {
        return res.status(403).json({ 
          message: 'Invalid or expired token. Only existing admins can create new admin accounts.' 
        });
      }
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    user = new User({ 
      name: name.trim(), 
      email: normalizedEmail, 
      password, 
      role: userRole 
    });

    // If creating a tutor, set up tutorInfo with pending status
    if (userRole === 'tutor') {
      user.tutorInfo = {
        status: 'pending', // New tutors need admin approval
        subjects: [],
      };
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: { id: user.id, role: user.role },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        // Return both token and user data for immediate login
        res.status(201).json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        });
      }
    );
  } catch (err) {
    console.error('Employee registration error:', err.message);
    console.error('Error name:', err.name);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    
    // Check for MongoDB connection errors
    if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError' || 
        err.name === 'MongooseError' || err.message.includes('Mongo') ||
        err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND') ||
        err.message.includes('connect')) {
      return res.status(503).json({ 
        message: 'Database connection error. Please check if MongoDB is running and try again.' 
      });
    }
    
    if (err.code === 11000) {
      // Duplicate key error (email already exists)
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    
    // Send more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Server error during registration' 
      : err.message || 'Server error during registration';
    
    res.status(500).json({ message: errorMessage });
  }
};

/**
 * @desc    Get logged in user's data
 * @route   GET /api/auth/user
 * @access  Private
 */
const getLoggedInUser = async (req, res) => {
    try {
        // req.user is attached by the authMiddleware
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        logger.error('Error fetching logged in user', { error: err.message, userId: req.user?.id });
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Invalidate refresh token (logout)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        trackEvent(
            'auth_logout',
            { logoutReason: 'user_initiated' },
            { actorUserId: user._id },
        ).catch(() => {});

        user.refreshToken = null;
        user.refreshTokenExpiry = null;
        await user.save();

        return res.json({ message: 'Logged out successfully' });
    } catch (err) {
        logger.error('Logout error', { error: err.message });
        return res.status(500).json({ message: 'Server error during logout' });
    }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, getRefreshSecret());
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        // Find user and verify refresh token matches
        const user = await User.findById(decoded.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Check if refresh token has expired
        if (user.refreshTokenExpiry && new Date() > user.refreshTokenExpiry) {
            return res.status(401).json({ message: 'Refresh token has expired' });
        }

        // Generate new access token
        const payload = {
            user: { id: user.id, role: user.role },
        };

        const newAccessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token: newAccessToken,
        });
    } catch (error) {
        console.error('[refreshToken] Error:', error);
        res.status(500).json({ message: 'Server error while refreshing token' });
    }
};

/**
 * @desc    Register a student via a school pilot registration code
 * @route   POST /api/auth/register-with-code
 * @access  Public
 */
const registerWithCode = async (req, res) => {
    const { name, email, password, registrationCode } = req.body;

    try {
        if (!name || !email || !password || !registrationCode) {
            return res.status(400).json({
                message: 'name, email, password, and registrationCode are required',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasLetter || !hasNumber) {
            return res.status(400).json({ message: 'Password must contain both letters and numbers' });
        }

        const normalizedCode = String(registrationCode).trim().toUpperCase();
        const school = await School.findOne({ registrationCode: normalizedCode });
        if (!school) {
            return res.status(400).json({ message: 'Invalid school registration code' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashed,
            role: 'student',
            schoolId: school._id,
            // Snapshot the sector so tenant filters work without a join.
            sector: school.sector || null,
        });

        trackEvent(
            'cohort_student_school_linked',
            { linkReason: 'invite_flow' },
            {
                actorUserId: user._id,
                subjectStudentId: user._id,
                schoolId: school._id,
            },
        ).catch(() => {});

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) {
                logger.error('register-with-code token signing error', { error: err.message });
                return res.status(500).json({ message: 'Server error during registration' });
            }
            return res.status(201).json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: user.schoolId,
                },
                school: {
                    id: school._id,
                    name: school.name,
                    status: school.status,
                },
            });
        });
    } catch (err) {
        logger.error('registerWithCode error', { error: err.message });
        if (err.code === 11000) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'Server error during registration'
            : err.message || 'Server error during registration';
        return res.status(500).json({ message: errorMessage });
    }
};

/**
 * @desc    Complete login by verifying a TOTP code against a 2FA challenge.
 * @route   POST /api/auth/2fa/verify
 * @access  Public (requires a valid, unexpired challenge token from /login)
 */
const verifyTwoFactorLogin = async (req, res) => {
    try {
        const { challengeToken, token } = req.body;
        if (!challengeToken || !token) {
            return res.status(400).json({ message: 'challengeToken and token are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(challengeToken, getTwoFactorChallengeSecret());
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired 2FA challenge. Please log in again.' });
        }

        if (!decoded.twoFactorPending || !decoded.userId) {
            return res.status(401).json({ message: 'Invalid 2FA challenge' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(401).json({ message: 'Invalid 2FA challenge' });
        }

        if (user.accountStatus && user.accountStatus !== 'active') {
            return res.status(403).json({ message: 'Account is not active. Contact an administrator.' });
        }

        if (!verifyTotp(token, user.twoFactorSecret)) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        trackEvent(
            'auth_login_success',
            { authMethod: 'password_2fa' },
            { actorUserId: user._id },
        ).catch(() => {});

        const { token: accessToken, refreshToken: newRefreshToken } = await issueAuthTokens(user);
        return res.json({
            token: accessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        logger.error('verifyTwoFactorLogin error', { error: err.message });
        return res.status(500).json({ message: 'Server error during 2FA verification' });
    }
};

module.exports = {
    refreshToken,
    registerUser,
    registerEmployee,
    registerWithCode,
    loginUser,
    logoutUser,
    getLoggedInUser,
    verifyTwoFactorLogin,
};
