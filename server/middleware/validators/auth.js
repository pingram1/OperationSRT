/**
 * Validators for /api/auth/* endpoints.
 *
 * These run BEFORE the controllers so the controllers can assume their
 * required body fields exist and have plausible shapes. Anything more
 * complex than shape (e.g. uniqueness, password match) stays in the
 * controller.
 */
const { body } = require('express-validator');

const emailField = () => body('email')
    .isString().withMessage('email must be a string')
    .bail()
    .trim()
    .isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 254 }).withMessage('email is too long')
    .normalizeEmail({ all_lowercase: true });

const passwordField = (label = 'password') => body(label)
    .isString().withMessage(`${label} must be a string`)
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage(`${label} must be between 8 and 128 characters`);

const nameField = () => body('name')
    .isString().withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('name must be 1–120 characters');

const allowedClientRoles = ['student', 'parent'];
const allowedEmployeeRoles = ['tutor', 'admin', 'super_admin'];

const register = [
    nameField(),
    emailField(),
    passwordField(),
    body('role')
        .optional()
        .isIn(allowedClientRoles)
        .withMessage(`role must be one of ${allowedClientRoles.join(', ')}`),
];

const registerEmployee = [
    nameField(),
    emailField(),
    passwordField(),
    body('role')
        .isIn(allowedEmployeeRoles)
        .withMessage(`role must be one of ${allowedEmployeeRoles.join(', ')}`),
];

const registerWithCode = [
    nameField(),
    emailField(),
    passwordField(),
    body('registrationCode')
        .isString().withMessage('registrationCode must be a string')
        .bail()
        .trim()
        .isLength({ min: 4, max: 64 })
        .withMessage('registrationCode must be 4–64 characters'),
];

const login = [
    emailField(),
    body('password')
        .isString().withMessage('password must be a string')
        .bail()
        .isLength({ min: 1, max: 128 })
        .withMessage('password is required'),
];

const refresh = [
    body('refreshToken')
        .isString().withMessage('refreshToken must be a string')
        .bail()
        .isLength({ min: 16, max: 4096 })
        .withMessage('refreshToken has invalid length'),
];

module.exports = {
    register,
    registerEmployee,
    registerWithCode,
    login,
    refresh,
};
