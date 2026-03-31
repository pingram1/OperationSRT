# Stripe Payment Integration Setup

## Environment Variables

### Backend (server/.env)
Add the following variables:
```env
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Your Stripe webhook signing secret (for production)
```

### Frontend (client/.env or client/.env.local)
Add the following variable:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

## What's Been Implemented

### Backend
1. **Payment Controller** (`server/controllers/paymentController.js`)
   - `createPaymentIntent`: Creates a Stripe payment intent for a booking
   - `confirmPayment`: Confirms payment after successful Stripe payment
   - `handleWebhook`: Handles Stripe webhook events (payment success/failure)
   - `getPaymentStatus`: Gets payment status for a booking

2. **Payment Routes** (`server/routes/paymentRoutes.js`)
   - `POST /api/payments/create-intent`: Create payment intent
   - `POST /api/payments/confirm`: Confirm payment
   - `POST /api/payments/webhook`: Stripe webhook endpoint
   - `GET /api/payments/status/:bookingId`: Get payment status

3. **Booking Model Updates**
   - Added `customerPayment` field to track:
     - Payment status (pending, paid, failed, refunded)
     - Stripe payment intent ID
     - Stripe customer ID
     - Amount and currency
     - Payment date

### Frontend
1. **Payment API** (`client/src/api/payments.js`)
   - `createPaymentIntent(bookingId, amount, currency)`
   - `confirmPayment(paymentIntentId, bookingId)`
   - `getPaymentStatus(bookingId)`

2. **PaymentStep Component** (`client/src/components/membership/PaymentStep.jsx`)
   - Integrated Stripe Payment Element
   - Handles payment processing flow
   - Shows loading states and error messages

## Usage

### In Booking Flow

The `PaymentStep` component requires a `bookingId` prop. Here's how to integrate it:

1. **Create booking first** (before showing payment):
```javascript
const booking = await createBooking(bookingData);
const bookingId = booking._id;
```

2. **Pass bookingId to PaymentStep**:
```jsx
<PaymentStep
    bookingId={bookingId}
    plan={plan}
    sessionConfiguration={sessionConfiguration}
    bookingDetails={bookingDetails}
    onBack={handleBack}
    onComplete={handlePaymentComplete}
/>
```

3. **Handle payment completion**:
```javascript
const handlePaymentComplete = async (paymentResult) => {
    if (paymentResult.success) {
        // Payment successful, redirect or show success message
        navigate('/dashboard');
    }
};
```

## Webhook Setup (Production)

For production, you need to set up Stripe webhooks:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret and add it to `STRIPE_WEBHOOK_SECRET` in your `.env`

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Next Steps

1. Add environment variables to your `.env` files
2. Restart servers to load new environment variables
3. Test payment flow with test cards
4. Set up webhooks for production
5. Integrate payment step into your booking flow (ensure booking is created before showing payment)

## Notes

- The payment flow currently requires a booking to be created first
- For membership/subscription payments, you may need to adjust the flow
- The webhook handler automatically updates booking payment status when Stripe sends events
- Payment status is stored in `booking.customerPayment.status`





