/**
 * Manual mock for ParentLinkRequest model.
 */
const { vi } = require('vitest');

module.exports = {
  findById: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
};
