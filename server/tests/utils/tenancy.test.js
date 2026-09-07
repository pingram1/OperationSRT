/**
 * Tenancy helper unit tests.
 * Security: cross-tenant isolation (public/private/charter) must be enforceable
 * from a single source of truth. Pattern: Arrange-Act-Assert (AAA).
 */
const {
    SECTORS,
    TENANT_SCOPES,
    isValidSector,
    buildTenantFilter,
    assertSameTenant,
} = require('../../utils/tenancy');

describe('tenancy', () => {
    describe('SECTORS', () => {
        it('includes public, private, and charter', () => {
            expect(SECTORS).toEqual(['public', 'private', 'charter']);
        });
    });

    describe('isValidSector', () => {
        it('accepts known sectors', () => {
            expect(isValidSector('public')).toBe(true);
            expect(isValidSector('private')).toBe(true);
            expect(isValidSector('charter')).toBe(true);
        });

        it('rejects unknown or empty sectors', () => {
            expect(isValidSector('district')).toBe(false);
            expect(isValidSector('')).toBe(false);
            expect(isValidSector(null)).toBe(false);
        });
    });

    describe('buildTenantFilter', () => {
        it('returns an unrestricted filter for global scope', () => {
            const filter = buildTenantFilter({ scope: TENANT_SCOPES.GLOBAL });
            expect(filter).toEqual({});
        });

        it('returns an unrestricted filter when tenant is missing', () => {
            expect(buildTenantFilter(undefined)).toEqual({});
        });

        it('restricts to the school for school scope', () => {
            const filter = buildTenantFilter({ scope: TENANT_SCOPES.SCHOOL, schoolId: 'abc123' });
            expect(filter).toEqual({ schoolId: 'abc123' });
        });

        it('honors a custom school field name', () => {
            const filter = buildTenantFilter(
                { scope: TENANT_SCOPES.SCHOOL, schoolId: 'abc123' },
                { schoolField: 'student.schoolId' },
            );
            expect(filter).toEqual({ 'student.schoolId': 'abc123' });
        });

        it('does not leak a filter for self scope (caller adds own id)', () => {
            expect(buildTenantFilter({ scope: TENANT_SCOPES.SELF })).toEqual({});
        });
    });

    describe('assertSameTenant', () => {
        it('always allows global scope', () => {
            expect(assertSameTenant({ scope: TENANT_SCOPES.GLOBAL }, { schoolId: 'x' })).toBe(true);
        });

        it('allows matching school ids', () => {
            expect(
                assertSameTenant(
                    { scope: TENANT_SCOPES.SCHOOL, schoolId: 'school-a' },
                    { schoolId: 'school-a' },
                ),
            ).toBe(true);
        });

        it('blocks cross-school access', () => {
            expect(
                assertSameTenant(
                    { scope: TENANT_SCOPES.SCHOOL, schoolId: 'school-a' },
                    { schoolId: 'school-b' },
                ),
            ).toBe(false);
        });

        it('blocks when the resource has no tenant ref', () => {
            expect(
                assertSameTenant({ scope: TENANT_SCOPES.SCHOOL, schoolId: 'school-a' }, {}),
            ).toBe(false);
            expect(
                assertSameTenant({ scope: TENANT_SCOPES.SCHOOL, schoolId: 'school-a' }, null),
            ).toBe(false);
        });
    });
});
