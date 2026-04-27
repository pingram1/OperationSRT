/**
 * Unit tests for services/paymentService.js
 *
 * Demonstrates the value of the controller / service split: services can
 * be exercised without standing up Express req/res.
 */

const mock = require('mock-require');

let saveCalls;
let savedAttrs;
const MockTransaction = function (attrs) {
    savedAttrs = attrs;
    return {
        ...attrs,
        save: vi.fn().mockImplementation(() => {
            saveCalls += 1;
            return Promise.resolve(true);
        }),
    };
};
MockTransaction.findOne = vi.fn();

mock('../models/Transaction', MockTransaction);
mock('../controllers/membershipController', {
    applyMembershipAfterPayment: vi.fn().mockResolvedValue({ applied: false }),
});

const Transaction = require('../models/Transaction');
const {
    recordPaymentTransaction,
    markBookingPaid,
    markBookingFailed,
    finalizeAfterSuccessfulCharge,
} = require('./paymentService');

describe('paymentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        saveCalls = 0;
        savedAttrs = undefined;
    });

    describe('recordPaymentTransaction', () => {
        const booking = { _id: 'bk_1', subject: 'Math', student: { _id: 'st_1' } };
        const paymentIntent = { id: 'pi_1', amount: 6500, currency: 'usd' };

        it('throws when required args are missing', async () => {
            await expect(recordPaymentTransaction({})).rejects.toThrow(
                /requires booking and paymentIntent/,
            );
        });

        it('skips creation if a Transaction already exists for the PI (idempotent)', async () => {
            Transaction.findOne.mockResolvedValueOnce({ _id: 'already_there' });
            const result = await recordPaymentTransaction({
                booking, paymentIntent, source: 'confirm',
            });
            expect(result.created).toBe(false);
            expect(saveCalls).toBe(0);
        });

        it('creates a Transaction with confirm prefix when source=confirm', async () => {
            Transaction.findOne.mockResolvedValueOnce(null);
            const result = await recordPaymentTransaction({
                booking, paymentIntent, source: 'confirm',
            });
            expect(result.created).toBe(true);
            expect(saveCalls).toBe(1);
            expect(savedAttrs.transactionId).toMatch(/^txn_\d+_bk_1$/);
            expect(savedAttrs.amount).toBe(65);
            expect(savedAttrs.currency).toBe('USD');
            expect(savedAttrs.gatewayTransactionId).toBe('pi_1');
            expect(savedAttrs.user).toBe('st_1');
        });

        it('uses webhook prefix when source=webhook', async () => {
            Transaction.findOne.mockResolvedValueOnce(null);
            await recordPaymentTransaction({
                booking, paymentIntent, source: 'webhook',
            });
            expect(savedAttrs.transactionId).toMatch(/^txn_w_\d+_bk_1$/);
        });
    });

    describe('markBookingPaid', () => {
        it('sets stripePaymentIntentId, status=paid, paidAt, and saves', async () => {
            const save = vi.fn().mockResolvedValue(true);
            const booking = { save };
            const before = Date.now();
            await markBookingPaid(booking, { id: 'pi_42' });
            expect(booking.customerPayment.status).toBe('paid');
            expect(booking.customerPayment.stripePaymentIntentId).toBe('pi_42');
            expect(booking.customerPayment.paidAt).toBeInstanceOf(Date);
            expect(booking.customerPayment.paidAt.getTime()).toBeGreaterThanOrEqual(before);
            expect(save).toHaveBeenCalledTimes(1);
        });

        it('preserves any pre-existing customerPayment fields', async () => {
            const save = vi.fn().mockResolvedValue(true);
            const booking = {
                save,
                customerPayment: { stripeCustomerId: 'cus_pre', amount: 65 },
            };
            await markBookingPaid(booking, { id: 'pi_43' });
            expect(booking.customerPayment.stripeCustomerId).toBe('cus_pre');
            expect(booking.customerPayment.amount).toBe(65);
            expect(booking.customerPayment.status).toBe('paid');
        });

        it('throws when given a non-document', async () => {
            await expect(markBookingPaid(null, { id: 'pi_x' })).rejects.toThrow();
        });
    });

    describe('markBookingFailed', () => {
        it('sets status=failed and saves', async () => {
            const save = vi.fn().mockResolvedValue(true);
            const booking = { save };
            await markBookingFailed(booking);
            expect(booking.customerPayment.status).toBe('failed');
            expect(save).toHaveBeenCalledTimes(1);
        });
    });

    describe('finalizeAfterSuccessfulCharge', () => {
        it('is a no-op for non-membership bookings', async () => {
            await expect(
                finalizeAfterSuccessfulCharge({ paymentPurpose: 'session' }, { id: 'pi' }),
            ).resolves.toBeUndefined();
        });

        it('does not propagate downstream membership errors', async () => {
            const { applyMembershipAfterPayment } = require('../controllers/membershipController');
            applyMembershipAfterPayment.mockRejectedValueOnce(new Error('membership boom'));
            await expect(
                finalizeAfterSuccessfulCharge(
                    { _id: 'bk', paymentPurpose: 'membership' },
                    { id: 'pi' },
                ),
            ).resolves.toBeUndefined();
        });
    });
});
