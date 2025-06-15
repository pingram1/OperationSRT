const jwt = require('jsonwebtoken');

/**
 * This middleware function is designed to protect routes that require
 * a user to be logged in. It verifies the JSON Web Token (JWT) sent
 * with the request.
 */
const authMiddleware = (req, res, next) => {
    // 1. Get the token from the request header
    // The token is typically sent in the format: "Bearer <token>"
    const authHeader = req.header('Authorization');

    // 2. Check if there's no token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // 3. Extract the token from "Bearer <token>"
        const token = authHeader.split(' ')[1];

        // 4. Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. If the token is valid, the 'decoded' payload will contain the user
        // information we stored when we created it (e.g., user ID and role).
        // We add this user information to the request object.
        req.user = decoded.user;

        // 6. Call the next middleware or route handler in the chain.
        next();
        
    } catch (err) {
        // If the token is not valid (e.g., it's expired or malformed),
        // jwt.verify() will throw an error.
        res.status(401).json({ message: 'Token is not valid' });
    }
};

/**
 * Optional: A middleware to restrict access to certain roles (e.g., 'admin').
 * @param  {...string} roles - The roles that are allowed to access the route.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    };
};


module.exports = {
    authMiddleware,
    authorize,
};
