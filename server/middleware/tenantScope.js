/**
 * Tenant-scope middleware.
 *
 * Runs after authMiddleware. Computes `req.tenant`, the tenant context that
 * controllers feed into `buildTenantFilter` / `assertSameTenant` so cross-tenant
 * rows are never read or written.
 *
 *   req.tenant = {
 *     scope: 'global' | 'school' | 'self',
 *     schoolId: ObjectId|null,
 *     sector: 'public'|'private'|'charter'|null,
 *   }
 *
 * Resolution:
 *   - admin / super_admin           → global (no restriction)
 *   - school_admin                  → school (pinned to their own schoolId)
 *   - student / parent / tutor      → self (own records; controllers add id rules)
 *
 * The school_admin's schoolId/sector come from req.user when authMiddleware has
 * already attached them (Task 3); otherwise we fall back to a DB lookup so this
 * middleware is correct regardless of ordering.
 */
const User = require('../models/User');
const { TENANT_SCOPES } = require('../utils/tenancy');

const GLOBAL_ROLES = ['admin', 'super_admin'];

async function tenantScope(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const role = req.user.role;

        if (GLOBAL_ROLES.includes(role)) {
            req.tenant = { scope: TENANT_SCOPES.GLOBAL, schoolId: null, sector: null };
            return next();
        }

        if (role === 'school_admin') {
            let { schoolId, sector } = req.user;
            if (schoolId === undefined || sector === undefined) {
                const fresh = await User.findById(req.user.id).select('schoolId sector').lean();
                schoolId = fresh?.schoolId || null;
                sector = fresh?.sector || null;
            }
            if (!schoolId) {
                // A school_admin with no school binding can see nothing tenant-scoped.
                return res.status(403).json({
                    message: 'School administrator is not linked to a school cohort',
                    code: 'NO_TENANT_BINDING',
                });
            }
            req.tenant = { scope: TENANT_SCOPES.SCHOOL, schoolId, sector: sector || null };
            return next();
        }

        // Everyone else: self scope. Controllers must still constrain to the
        // caller's own id / linked children.
        req.tenant = {
            scope: TENANT_SCOPES.SELF,
            schoolId: req.user.schoolId || null,
            sector: req.user.sector || null,
        };
        return next();
    } catch (err) {
        return next(err);
    }
}

module.exports = { tenantScope };
