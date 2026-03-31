import React from 'react';
import { vi } from 'vitest';

export function Elements({ children }) {
  return <div data-testid="stripe-elements">{children}</div>;
}

export function PaymentElement() {
  return <div data-testid="payment-element" />;
}

export function useStripe() {
  return {
    confirmPayment: vi.fn().mockResolvedValue({
      error: null,
      paymentIntent: { status: 'succeeded', id: 'pi_test' },
    }),
  };
}

export function useElements() {
  return {
    submit: vi.fn().mockResolvedValue({ error: null }),
  };
}
