/**
 * Tenancy & sector isolation helpers.
 *
 * Start Right operates across three education sectors that MUST stay isolated
 * from each other for partnership/compliance reasons:
 *
 *   - public   (public school districts)
 *   - private  (private/independent schools)
 *   - charter  (charter schools)
 *
 * This module is the single source of truth for the sector vocabulary and for
 * translating a request's tenant context into a Mongo filter. Controllers call
 * `buildTenantFilter(req.tenant)` so cross-tenant rows are never serialized.
 */

const SECTORS = ['public', 'private', 'charter'];

/** Scope kinds attached to req.tenant by tenantScope middleware. */
const TENANT_SCOPES = {
    GLOBAL: 'global', // admin / super_admin: no tenant restriction
    SCHOOL: 'school', // school_admin: pinned to a single schoolId
    SELF: 'self', // student/parent/tutor: own records only (controller-specific)
};

function isValidSector(value) {
    return SECTORS.includes(value);
}

/**
 * Build a Mongo filter fragment that restricts a query to the caller's tenant.
 *
 * @param {object} tenant  req.tenant produced by tenantScope middleware.
 *   { scope: 'global'|'school'|'self', schoolId?: ObjectId|string, sector?: string }
 * @param {object} [opts]
 * @param {string} [opts.schoolField='schoolId'] field name holding the school ref on the target collection.
 * @returns {object} a filter object to spread into a Mongoose query.
 *
 * - global  → {}                       (no restriction)
 * - school  → { [schoolField]: id }    (single school)
 * - self    → {}                       (caller must add their own id constraint)
 */
function buildTenantFilter(tenant, opts = {}) {
    const schoolField = opts.schoolField || 'schoolId';
    if (!tenant || tenant.scope === TENANT_SCOPES.GLOBAL) {
        return {};
    }
    if (tenant.scope === TENANT_SCOPES.SCHOOL && tenant.schoolId) {
        return { [schoolField]: tenant.schoolId };
    }
    return {};
}

/**
 * Assert two tenant identities belong to the same school/sector.
 * Throws nothing; returns a boolean so callers can choose 403 vs 404 semantics.
 *
 * @param {object} tenant      req.tenant
 * @param {object} resourceRef { schoolId?, sector? } snapshot from the target doc
 * @returns {boolean}
 */
function assertSameTenant(tenant, resourceRef) {
    if (!tenant || tenant.scope === TENANT_SCOPES.GLOBAL) {
        return true;
    }
    if (!resourceRef) return false;

    if (tenant.scope === TENANT_SCOPES.SCHOOL) {
        if (!tenant.schoolId || !resourceRef.schoolId) return false;
        return String(tenant.schoolId) === String(resourceRef.schoolId);
    }
    return false;
}

module.exports = {
    SECTORS,
    TENANT_SCOPES,
    isValidSector,
    buildTenantFilter,
    assertSameTenant,
};
