/**
 * Validators for /api/schools/* endpoints.
 */
const { body, param } = require('express-validator');

const objectIdParam = (name) => param(name)
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage(`${name} must be a valid ObjectId`);

const create = [
    body('name')
        .isString().withMessage('name must be a string')
        .bail()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('name must be 1–200 characters'),
    body('district')
        .optional({ nullable: true })
        .isString().withMessage('district must be a string')
        .isLength({ max: 200 }),
    body('primaryContactName')
        .optional({ nullable: true })
        .isString().withMessage('primaryContactName must be a string')
        .isLength({ max: 200 }),
    body('primaryContactEmail')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail().withMessage('primaryContactEmail must be a valid email')
        .isLength({ max: 254 }),
    body('status')
        .optional({ nullable: true })
        .isIn(['pending', 'active_pilot', 'completed', 'inactive'])
        .withMessage('status must be pending | active_pilot | completed | inactive'),
    body('pilotStartDate')
        .optional({ nullable: true })
        .isISO8601().withMessage('pilotStartDate must be ISO 8601'),
    body('pilotEndDate')
        .optional({ nullable: true })
        .isISO8601().withMessage('pilotEndDate must be ISO 8601'),
];

const idParam = [objectIdParam('id')];
const schoolIdParam = [objectIdParam('schoolId')];

// We deliberately do NOT use wildcard student.*.* validators here, because
// rosterUpload returns granular per-row errors from the controller (so a
// single bad email doesn't reject a 500-row batch). We just gate the array
// shape and length here; per-row email/name checks live in the controller.
const rosterUpload = [
    objectIdParam('schoolId'),
    body('students')
        .isArray({ min: 1, max: 1000 })
        .withMessage('students must be a non-empty array (max 1000 entries)'),
];

module.exports = { create, idParam, schoolIdParam, rosterUpload };
