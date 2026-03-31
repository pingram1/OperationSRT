/**
 * Manual mock for MembershipPlan model.
 */
const { vi } = require('vitest');

module.exports = {
  findById: vi.fn(),
  find: vi.fn(),
  insertMany: vi.fn(),
};
