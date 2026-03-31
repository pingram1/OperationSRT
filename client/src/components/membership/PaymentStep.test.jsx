import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PaymentStep from './PaymentStep';
import { createPaymentIntent } from '../../api/payments';

vi.mock('../../api/payments', () => ({
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@stripe/react-stripe-js', () => import('../../test/mocks/stripeReactMock.jsx'));

const plan = {
  name: 'Test Plan',
  price: 49,
  priceType: 'monthly',
};

describe('PaymentStep (payment smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders purchase heading and order summary', () => {
    render(
      <PaymentStep
        plan={plan}
        bookingId={undefined}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /complete your purchase/i })).toBeInTheDocument();
    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText('Test Plan')).toBeInTheDocument();
  });

  it('shows a clear error when booking id is missing (no API call)', async () => {
    render(
      <PaymentStep
        plan={plan}
        bookingId={undefined}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/booking id is required for payment/i)).toBeInTheDocument();
    });

    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('loads Stripe Elements after createPaymentIntent succeeds', async () => {
    createPaymentIntent.mockResolvedValue({ clientSecret: 'cs_test_secret' });

    render(
      <PaymentStep
        plan={plan}
        bookingId="booking_smoke_1"
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    });

    expect(createPaymentIntent).toHaveBeenCalledWith('booking_smoke_1', 49, 'USD');
    expect(screen.getByRole('button', { name: /complete purchase/i })).toBeInTheDocument();
  });

  it('surfaces API failure when createPaymentIntent rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    createPaymentIntent.mockRejectedValue(new Error('Network unavailable'));

    try {
      render(
        <PaymentStep
          plan={plan}
          bookingId="booking_smoke_2"
          onBack={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/network unavailable/i)).toBeInTheDocument();
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
