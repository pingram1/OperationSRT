import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Get Stripe publishable key from environment variable
// In Vite, environment variables must be prefixed with VITE_
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Stripe Elements Provider wrapper
 * Wrap components that need Stripe functionality with this provider
 */
export default function StripeProvider({ children }) {
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        console.warn('[StripeProvider] VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
    }

    return (
        <Elements stripe={stripePromise}>
            {children}
        </Elements>
    );
}





