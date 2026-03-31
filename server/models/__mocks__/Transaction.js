/**
 * Manual mock for Transaction model.
 */
const { vi } = require('vitest');

function MockTransaction(attrs = {}) {
  return {
    ...attrs,
    save: vi.fn().mockResolvedValue(true),
    populate: vi.fn().mockResolvedValue(attrs),
  };
}

MockTransaction.findById = vi.fn();
MockTransaction.find = vi.fn();
MockTransaction.findOne = vi.fn();
MockTransaction.aggregate = vi.fn();
MockTransaction.countDocuments = vi.fn();
MockTransaction.updateMany = vi.fn();

module.exports = MockTransaction;
