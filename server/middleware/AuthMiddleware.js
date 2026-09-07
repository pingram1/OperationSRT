const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes that require an authenticated user.
 *
 * Hardened (P0 remediation Task 3): instead of trusting the role baked into the
 * JWT for the life of the token (up to 8h), we reload the user on every request
 * and attach the CURRENT role + tenant context. This means a revoked,
 * downgraded, suspended, or deleted account loses access on its very next
 * request rather than waiting for token expiry.
 *
 * `req.user` shape (consumed across controllers):
 *   { id, role, schoolId, sector }
 * `req.authClaims` holds the raw decoded token for debugging/forensics.
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    let decoded;
    try {
        const token = authHeader.split(' ')[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid' });
    }

    const claimedId = decoded?.user?.id;
    if (!claimedId) {
        return res.status(401).json({ message: 'Token is not valid' });
    }

    try {
        // Reload the live account so role/tenant/status are never stale.
        const user = await User.findById(claimedId).select('role accountStatus schoolId sector');

        if (!user) {
            return res.status(401).json({ message: 'Account no longer exists', code: 'ACCOUNT_NOT_FOUND' });
        }

        if (user.accountStatus && user.accountStatus !== 'active') {
            return res.status(403).json({ message: 'Account is not active', code: 'ACCOUNT_INACTIVE' });
        }

        req.authClaims = decoded.user;
        req.user = {
            id: String(user._id),
            role: user.role,
            schoolId: user.schoolId || null,
            sector: user.sector || null,
        };

        return next();
    } catch (err) {
        // DB hiccup while authenticating — fail closed.
        return res.status(503).json({ message: 'Authentication temporarily unavailable' });
    }
};

/**
 * Restrict access to certain roles. Super admins bypass all role checks.
 * Reads the FRESH role attached by authMiddleware (not the token payload).
 * @param  {...string} roles - The roles that are allowed to access the route.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user.role;

        if (userRole === 'super_admin') {
            return next();
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: `User role ${userRole} is not authorized to access this route` });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    authorize,
};
