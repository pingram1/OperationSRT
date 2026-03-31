const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createParentLinkRequestFromSignup } = require('./parentLinkController');
const logger = require('../utils/logger');

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
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login failed - password mismatch', { email: user.email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        logger.info('Login successful', { userId: user.id, email: user.email });

        const payload = {
            user: { id: user.id, role: user.role },
        };

        // Generate access token (short-lived)
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' },
            async (err, token) => {
                if (err) throw err;
                
                // Generate refresh token (long-lived, 7 days)
                const refreshTokenPayload = { userId: user.id };
                const refreshToken = jwt.sign(
                    refreshTokenPayload,
                    process.env.JWT_SECRET + '_refresh', // Different secret for refresh tokens
                    { expiresIn: '7d' }
                );
                
                // Store refresh token in database
                user.refreshToken = refreshToken;
                user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                await user.save();
                
                // Send back the tokens and user info (excluding password)
                res.json({
                    token,
                    refreshToken,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                });
            }
        );
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
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + '_refresh');
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

// Make sure all functions are exported
module.exports = {
    refreshToken,
    registerUser,
    registerEmployee,
    loginUser,
    getLoggedInUser,
};
