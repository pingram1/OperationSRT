/**
 * MembershipController Unit Tests
 * Security: Parent-child authorization, ObjectId vs string comparison.
 * Defensive: Invalid planId, malformed sessionConfiguration.
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require because Vitest's vi.mock doesn't intercept CommonJS require().
 */

const mock = require('mock-require');

const MembershipPlanMock = { findById: vi.fn(), find: vi.fn(), insertMany: vi.fn() };
const createFindByIdChain = (result) => {
  const p = Promise.resolve(result);
  const chain = {
    populate: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    then: (fn) => p.then(fn),
    catch: (fn) => p.catch(fn),
  };
  chain.populate.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
};
const UserMock = {
  findById: vi.fn(),
  updateMany: vi.fn(),
};

mock('../models/MembershipPlan', MembershipPlanMock);
mock('../models/User', UserMock);

const {
  getPlanById,
  selectPlan,
  getCurrentMembership,
} = require('./membershipController');

describe('MembershipController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, params: {}, user: { id: 'user123', role: 'student' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getPlanById - defensive edge cases', () => {
    it('returns 404 when plan does not exist', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      MembershipPlanMock.findById.mockResolvedValue(null);

      await getPlanById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Membership plan not found',
      });
    });

    it('handles invalid ObjectId without leaking stack trace', async () => {
      req.params = { id: 'invalid-id' };
      MembershipPlanMock.findById.mockRejectedValue(
        new Error('Cast to ObjectId failed for value "invalid-id"')
      );

      await getPlanById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });
  });

  describe('selectPlan - security boundaries', () => {
    it('returns 403 when parent tries to select plan for non-linked student', async () => {
      req.body = { planId: '507f1f77bcf86cd799439011', studentId: 'other-student-id' };
      req.user = { id: 'parent-id', role: 'parent' };
      const mockPlan = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Magna Cum Laude',
        isActive: true,
        priceType: 'per_session',
      };
      MembershipPlanMock.findById.mockResolvedValue(mockPlan);
      UserMock.findById.mockResolvedValue({
        _id: 'parent-id',
        children: ['child-id-1'],
      });

      await selectPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to change membership for this student',
      });
    });

    it('returns 404 when plan does not exist', async () => {
      req.body = { planId: '507f1f77bcf86cd799439011' };
      MembershipPlanMock.findById.mockResolvedValue(null);

      await selectPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Membership plan not found or inactive',
      });
    });

    it('returns 404 when plan is inactive', async () => {
      req.body = { planId: '507f1f77bcf86cd799439011' };
      MembershipPlanMock.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Old Plan',
        isActive: false,
      });

      await selectPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Membership plan not found or inactive',
      });
    });

    it('returns 400 when Summa Cum Laude plan missing session configuration', async () => {
      req.body = {
        planId: '507f1f77bcf86cd799439011',
        sessionConfiguration: { sessionsPerWeek: 1 },
      };
      MembershipPlanMock.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Summa Cum Laude',
        isActive: true,
        sessionConfig: {
          baseSessionsPerWeek: 1,
          baseSessionDuration: 60,
          additionalSessionOptions: [],
        },
      });
      UserMock.findById.mockResolvedValue({
        _id: 'user123',
        role: 'student',
        membership: null,
        save: vi.fn().mockResolvedValue(true),
      });

      await selectPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Session configuration required for Summa Cum Laude plan',
      });
    });
  });

  describe('getCurrentMembership - defensive edge cases', () => {
    it('returns 404 when user does not exist', async () => {
      UserMock.findById.mockReturnValue(createFindByIdChain(null));

      await getCurrentMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});
