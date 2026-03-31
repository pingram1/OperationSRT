/**
 * ParentLinkController Unit Tests
 * Security: Authorization, role enforcement.
 * Defensive: Missing request, invalid requestId.
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require because Vitest's vi.mock doesn't intercept CommonJS require().
 * Test lives next to controller so paths match controller's require() exactly.
 */

const mock = require('mock-require');

const UserMock = { findById: vi.fn(), findOne: vi.fn() };
const ParentLinkRequestMock = { findById: vi.fn(), findOne: vi.fn(), find: vi.fn() };

// Mock before controller loads - same paths as controller uses
mock('../models/User', UserMock);
mock('../models/ParentLinkRequest', ParentLinkRequestMock);

const {
  sendParentLinkRequest,
  acceptParentLinkRequest,
  rejectParentLinkRequest,
  getParentLinkRequests,
} = require('./parentLinkController');

describe('ParentLinkController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, params: {}, user: { id: 'user123', role: 'parent' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('sendParentLinkRequest - security boundaries', () => {
    it('returns 403 when non-parent tries to send link request', async () => {
      req.user = { id: 'student-id', role: 'student' };
      UserMock.findById.mockResolvedValue({ _id: 'student-id', role: 'student' });

      await sendParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only parents can send link requests',
      });
    });

    it('returns 400 when studentEmail is missing', async () => {
      req.body = {};
      UserMock.findById.mockResolvedValue({ _id: 'parent-id', role: 'parent' });

      await sendParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Student email is required',
      });
    });

    it('returns 404 when no student found with email', async () => {
      req.body = { studentEmail: 'nonexistent@example.com' };
      UserMock.findById.mockResolvedValue({ _id: 'parent-id', role: 'parent' });
      UserMock.findOne.mockResolvedValue(null);

      await sendParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No student account found with that email address',
      });
    });

    it('returns 400 when parent already linked to student', async () => {
      req.body = { studentEmail: 'student@example.com' };
      UserMock.findById.mockResolvedValue({
        _id: 'parent-id',
        role: 'parent',
        children: ['student-id'],
      });
      UserMock.findOne.mockResolvedValue({
        _id: 'student-id',
        email: 'student@example.com',
        role: 'student',
      });

      await sendParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You are already linked to this student',
      });
    });
  });

  describe('acceptParentLinkRequest - security boundaries', () => {
    it('returns 403 when non-student tries to accept', async () => {
      req.user = { id: 'parent-id', role: 'parent' };
      req.params = { requestId: '507f1f77bcf86cd799439011' };
      UserMock.findById.mockResolvedValue({ _id: 'parent-id', role: 'parent' });

      await acceptParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only students can accept link requests',
      });
    });

    it('returns 404 when request not found', async () => {
      req.user = { id: 'student-id', role: 'student' };
      req.params = { requestId: '507f1f77bcf86cd799439011' };
      UserMock.findById.mockResolvedValue({ _id: 'student-id', role: 'student' });
      ParentLinkRequestMock.findById.mockResolvedValue(null);

      await acceptParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Link request not found',
      });
    });

    it('returns 403 when student tries to accept request for another student', async () => {
      req.user = { id: 'student-a', role: 'student' };
      req.params = { requestId: '507f1f77bcf86cd799439011' };
      UserMock.findById.mockResolvedValue({ _id: 'student-a', role: 'student' });
      ParentLinkRequestMock.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        parent: 'parent-id',
        student: { _id: 'student-b' },
        status: 'pending',
      });

      await acceptParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You do not have permission to accept this request',
      });
    });

    it('returns 400 when request already processed', async () => {
      req.user = { id: 'student-id', role: 'student' };
      req.params = { requestId: '507f1f77bcf86cd799439011' };
      UserMock.findById.mockResolvedValue({ _id: 'student-id', role: 'student' });
      ParentLinkRequestMock.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        parent: 'parent-id',
        student: { _id: 'student-id' },
        status: 'accepted',
      });

      await acceptParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This request has already been processed',
      });
    });
  });

  describe('rejectParentLinkRequest - security boundaries', () => {
    it('returns 403 when non-student tries to reject', async () => {
      req.user = { id: 'parent-id', role: 'parent' };
      req.params = { requestId: '507f1f77bcf86cd799439011' };
      UserMock.findById.mockResolvedValue({ _id: 'parent-id', role: 'parent' });

      await rejectParentLinkRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only students can reject link requests',
      });
    });
  });

  describe('getParentLinkRequests - authorization', () => {
    it('returns 403 when user is neither student nor parent', async () => {
      req.user = { id: 'tutor-id', role: 'tutor' };
      UserMock.findById.mockResolvedValue({ _id: 'tutor-id', role: 'tutor' });

      await getParentLinkRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only students and parents can view link requests',
      });
    });
  });
});
