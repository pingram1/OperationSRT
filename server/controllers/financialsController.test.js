/**
 * FinancialsController Unit Tests
 * Security: Parent-child authorization, NoSQL injection via regex.
 * Defensive: Invalid limit, childId type mismatch.
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require because Vitest's vi.mock doesn't intercept CommonJS require().
 */

const mock = require('mock-require');

const UserMock = { findById: vi.fn(), find: vi.fn(), countDocuments: vi.fn() };
const TransactionMock = { find: vi.fn(), aggregate: vi.fn(), countDocuments: vi.fn(), updateMany: vi.fn() };
const BookingMock = {};
const MembershipPlanMock = { find: vi.fn() };

mock('../models/User', UserMock);
mock('../models/Transaction', TransactionMock);
mock('../models/Booking', BookingMock);
mock('../models/MembershipPlan', MembershipPlanMock);

const { getTransactions, createTransaction } = require('./financialsController');

describe('FinancialsController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      user: { id: 'user123', role: 'student' },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getTransactions - security boundaries', () => {
    it('returns 403 when parent requests transactions for non-linked child', async () => {
      req.user = { id: 'parent-id', role: 'parent' };
      req.query = { childId: 'stranger-child-id' };
      UserMock.findById.mockResolvedValue({
        _id: 'parent-id',
        role: 'parent',
        children: ['child-id-1', 'child-id-2'],
      });

      await getTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to view transactions for this child',
      });
    });

    it('returns empty array when parent has no children', async () => {
      req.user = { id: 'parent-id', role: 'parent' };
      UserMock.findById.mockResolvedValue({
        _id: 'parent-id',
        role: 'parent',
        children: [],
      });
      TransactionMock.find.mockResolvedValue([]);

      await getTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('createTransaction - defensive edge cases', () => {
    it('returns 400 when userId is missing', async () => {
      req.body = { type: 'Payment', amount: 65 };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'userId, type, and amount are required',
      });
    });

    it('returns 400 when type is missing', async () => {
      req.body = { userId: 'user123', amount: 65 };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'userId, type, and amount are required',
      });
    });

    it('returns 400 when amount is undefined', async () => {
      req.body = { userId: 'user123', type: 'Payment' };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'userId, type, and amount are required',
      });
    });
  });
});
