const { isStudentLearnToEarnEligible } = require('../services/scholarshipService');

describe('isStudentLearnToEarnEligible', () => {
    it('returns false for non-student', () => {
        expect(isStudentLearnToEarnEligible({ role: 'parent', studentInstitution: { name: 'X', type: 'high_school', sector: 'public' } })).toBe(false);
    });

    it('returns false without institution block', () => {
        expect(isStudentLearnToEarnEligible({ role: 'student' })).toBe(false);
    });

    it('returns false without name', () => {
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: '  ', type: 'high_school', sector: 'public' },
            })
        ).toBe(false);
    });

    it('returns false without type or sector', () => {
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: 'Lincoln HS', type: null, sector: 'public' },
            })
        ).toBe(false);
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: 'Lincoln HS', type: 'high_school', sector: null },
            })
        ).toBe(false);
    });

    it('returns true for complete high_school public', () => {
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: 'Lincoln High School', type: 'high_school', sector: 'public' },
            })
        ).toBe(true);
    });

    it('returns true for college private and technical_trade', () => {
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: 'State University', type: 'college', sector: 'private' },
            })
        ).toBe(true);
        expect(
            isStudentLearnToEarnEligible({
                role: 'student',
                studentInstitution: { name: 'Metro Tech', type: 'technical_trade', sector: 'public' },
            })
        ).toBe(true);
    });
});
