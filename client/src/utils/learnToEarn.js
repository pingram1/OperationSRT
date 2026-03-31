const TYPES = ['high_school', 'college', 'technical_trade'];
const SECTORS = ['public', 'private'];

/** Mirrors server `isStudentLearnToEarnEligible` for UI (student profile from auth). */
export function isLearnToEarnEligibleFromUser(user) {
  if (!user || user.role !== 'student') return false;
  const si = user.studentInstitution;
  if (!si) return false;
  if (!(si.name && String(si.name).trim())) return false;
  if (!TYPES.includes(si.type)) return false;
  if (!SECTORS.includes(si.sector)) return false;
  return true;
}
