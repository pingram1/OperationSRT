/**
 * Manual mock for User model - used when vi.mock('../../models/User') is called without factory.
 */
const { vi } = require('vitest');

const findById = vi.fn();
const findOne = vi.fn();
const find = vi.fn();
const updateMany = vi.fn();

function MockUser(attrs = {}) {
  return {
    ...attrs,
    _id: attrs._id || '507f1f77bcf86cd799439011',
    save: vi.fn().mockResolvedValue(true),
  };
}

MockUser.findById = findById;
MockUser.findOne = findOne;
MockUser.find = find;
MockUser.updateMany = updateMany;

module.exports = MockUser;
