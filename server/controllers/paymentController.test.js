/**
 * PaymentController Unit Tests
 * Security: Authorization bypass, amount validation, idempotency.
 * Defensive: null/undefined, malformed IDs, boundary amounts.
 * Pattern: Arrange-Act-Assert (AAA)
 *
 * Uses mock-require because Vitest's vi.mock doesn't intercept CommonJS require().
 */

const mock = require('mock-require');

const createBookingChain = (result) => {
  const p = Promise.resolve(result);
  const chain = {
    populate: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue(p),
    }),
  };
  chain.then = p.then.bind(p);
  chain.catch = p.catch.bind(p);
  return chain;
};

const stripeMock = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  customers: {
    create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

function StripeMock() {
  return stripeMock;
}

const BookingMock = {
  findById: vi.fn().mockImplementation(() => createBookingChain(null)),
};
const UserMock = { findById: vi.fn(), findOne: vi.fn() };
const MockTransaction = function (attrs) {
  return {
    ...attrs,
    save: vi.fn().mockResolvedValue(true),
  };
};
MockTransaction.findOne = vi.fn();

mock('stripe', StripeMock);
mock('../models/Booking', BookingMock);
mock('../models/User', UserMock);
mock('../models/Transaction', MockTransaction);
mock('../models/ProcessedStripeEvent', { create: vi.fn().mockResolvedValue({}) });

mock('./membershipController', {
  applyMembershipAfterPayment: vi.fn().mockResolvedValue({ applied: false }),
});

const Booking = require('../models/Booking');
const User = require('../models/User');
const {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
} = require('./paymentController');

describe('PaymentController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    Booking.findById.mockImplementation((id) => createBookingChain(null));
    req = { body: {}, params: {}, user: { id: 'user123', role: 'student' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('createPaymentIntent - defensive edge cases', () => {
    it('returns 404 when booking does not exist', async () => {
      req.body = { bookingId: '507f1f77bcf86cd799439011' };
      Booking.findById.mockImplementation(() => createBookingChain(null));

      await createPaymentIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking not found' });
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('returns 403 when user is not authorized to pay for booking', async () => {
      req.body = { bookingId: '507f1f77bcf86cd799439011' };
      req.user = { id: 'other-user', role: 'student' };
      const mockBooking = {
        _id: '507f1f77bcf86cd799439011',
        user: { _id: 'owner-id' },
        student: { _id: 'student-id' },
        customerPayment: null,
        price: 65,
        serviceType: 'solo',
      };
      Booking.findById.mockImplementation(() => createBookingChain(mockBooking));

      await createPaymentIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to pay for this booking',
      });
    });

    it('returns 400 when booking is already paid', async () => {
      req.body = { bookingId: '507f1f77bcf86cd799439011' };
      req.user.id = 'owner-id';
      const mockBooking = {
        _id: '507f1f77bcf86cd799439011',
        user: { _id: 'owner-id' },
        student: { _id: 'student-id' },
        customerPayment: { status: 'paid' },
        price: 65,
        serviceType: 'solo',
      };
      Booking.findById.mockImplementation(() => createBookingChain(mockBooking));

      await createPaymentIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This booking has already been paid',
      });
    });

    it('does not leak error details in 500 response', async () => {
      req.body = { bookingId: '507f1f77bcf86cd799439011' };
      req.user.id = 'owner-id';
      const mockBooking = {
        _id: '507f1f77bcf86cd799439011',
        user: { _id: 'owner-id', name: 'Owner', email: 'owner@test.com' },
        student: { _id: 'student-id', name: 'Student', email: 'student@test.com' },
        subject: 'Math',
        serviceType: 'solo',
        tutor: null,
        price: 65,
        customerPayment: null,
        save: vi.fn().mockResolvedValue(true),
      };
      Booking.findById.mockImplementation(() => createBookingChain(mockBooking));
      stripeMock.paymentIntents.create.mockRejectedValue(
        new Error('Stripe API key invalid: sk_live_xxx')
      );

      await createPaymentIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('message');
      // The 500 response must NOT include the underlying Stripe error message;
      // it would leak API key fragments / internal details to clients.
      expect(jsonCall).not.toHaveProperty('error');
      const serialized = JSON.stringify(jsonCall);
      expect(serialized).not.toContain('Stripe API key');
      expect(serialized).not.toContain('sk_live_');
    });
  });

  describe('confirmPayment - authorization', () => {
    it('returns 403 when parent tries to confirm for non-linked child', async () => {
      req.body = {
        paymentIntentId: 'pi_123',
        bookingId: '507f1f77bcf86cd799439011',
      };
      req.user = { id: 'parent-id', role: 'parent' };
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
        amount: 6500,
        currency: 'usd',
        metadata: { bookingId: '507f1f77bcf86cd799439011' },
      });
      Booking.findById.mockImplementation(() => createBookingChain({
        _id: '507f1f77bcf86cd799439011',
        user: { _id: 'student-id' },
        student: { _id: 'student-id' },
        customerPayment: { stripePaymentIntentId: 'pi_123' },
        save: vi.fn().mockResolvedValue(true),
      }));
      User.findById.mockResolvedValue({
        _id: 'parent-id',
        children: [],
      });

      await confirmPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to confirm payment for this booking',
      });
    });

    it('returns 400 when payment intent does not match booking', async () => {
      req.body = {
        paymentIntentId: 'pi_wrong',
        bookingId: '507f1f77bcf86cd799439011',
      };
      req.user.id = 'student-id';
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
        amount: 6500,
        currency: 'usd',
      });
      Booking.findById.mockImplementation(() => createBookingChain({
        _id: '507f1f77bcf86cd799439011',
        user: { _id: 'student-id' },
        student: { _id: 'student-id' },
        customerPayment: { stripePaymentIntentId: 'pi_different' },
      }));

      await confirmPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Payment intent does not match booking',
      });
    });
  });

  describe('getPaymentStatus - authorization', () => {
    it('returns 403 when user is not authorized to view payment status', async () => {
      req.params = { bookingId: '507f1f77bcf86cd799439011' };
      req.user = { id: 'stranger-id', role: 'student' };
      Booking.findById.mockImplementation(() => createBookingChain({
        _id: '507f1f77bcf86cd799439011',
        user: 'owner-id',
        student: 'student-id',
        customerPayment: { status: 'pending' },
      }));

      await getPaymentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authorized to view this payment status',
      });
    });

    it('returns 404 when booking does not exist', async () => {
      req.params = { bookingId: '507f1f77bcf86cd799439011' };
      Booking.findById.mockImplementation(() => createBookingChain(null));

      await getPaymentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking not found' });
    });
  });
});
