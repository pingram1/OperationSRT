import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createPaymentIntent, confirmPayment } from '../../api/payments';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Payment form component (must be inside Elements provider)
 */
function PaymentForm({ clientSecret, bookingId, amount, onComplete, onError }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements || !clientSecret) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Confirm payment with Stripe
            const { error: submitError } = await elements.submit();
            if (submitError) {
                setError(submitError.message);
                setIsProcessing(false);
                return;
            }

            // Confirm payment
            const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success`,
                },
                redirect: 'if_required', // Only redirect if required (3D Secure)
            });

            if (confirmError) {
                setError(confirmError.message);
                setIsProcessing(false);
                if (onError) {
                    onError(confirmError.message);
                }
                return;
            }

            // Payment succeeded
            if (paymentIntent.status === 'succeeded') {
                // Confirm payment on backend
                await confirmPayment(paymentIntent.id, bookingId);

                if (onComplete) {
                    onComplete({
                        success: true,
                        paymentId: paymentIntent.id,
                        amount: amount,
                    });
                }
            } else {
                setError('Payment was not completed. Please try again.');
                setIsProcessing(false);
            }
        } catch (err) {
            console.error('Payment processing error:', err);
            setError(err.message || 'Payment processing failed. Please try again.');
            setIsProcessing(false);
            if (onError) {
                onError(err.message);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Payment Error</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center text-sm text-gray-600 pt-2">
                <Lock className="w-4 h-4 mr-2" />
                <span>Your payment information is secure and encrypted</span>
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        <Lock className="w-5 h-5 mr-2" />
                        Complete Purchase
                    </>
                )}
            </button>
        </form>
    );
}

export default function PaymentStep({ plan, sessionConfiguration, bookingDetails, bookingId, onBack, onComplete }) {
    const [clientSecret, setClientSecret] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Calculate total price
    const basePrice = plan.price || 0;
    const additionalCost = sessionConfiguration?.additionalOption 
        ? plan.sessionConfig?.additionalSessionOptions?.find(
            opt => opt.label === sessionConfiguration.additionalOption
          )?.additionalCost || 0
        : 0;
    const totalPrice = basePrice + additionalCost;

    // Initialize payment intent when component mounts or bookingId changes
    useEffect(() => {
        const initializePayment = async () => {
            if (!bookingId) {
                setIsLoading(false);
                setError('Booking ID is required for payment');
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const paymentIntentData = await createPaymentIntent(bookingId, totalPrice, 'USD');
                setClientSecret(paymentIntentData.clientSecret);
            } catch (err) {
                console.error('Failed to initialize payment:', err);
                setError(err.message || 'Failed to initialize payment. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        initializePayment();
    }, [bookingId, totalPrice]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-2">Complete Your Purchase</h2>
            <p className="text-center text-gray-600 mb-6">
                Review your order and enter payment information
            </p>

            <div className="max-w-3xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Order Summary */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 w-32">Plan:</span>
                                <span className="font-semibold text-right flex-1">{plan.name}</span>
                            </div>
                            {sessionConfiguration && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 w-32">Sessions:</span>
                                        <span className="font-semibold text-right flex-1">
                                            {sessionConfiguration.sessionsPerWeek} per week
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 w-32">Duration:</span>
                                        <span className="font-semibold text-right flex-1">
                                            {sessionConfiguration.sessionDuration} minutes
                                        </span>
                                    </div>
                                </>
                            )}
                            {bookingDetails?.subject && (
                                <>
                                    <hr className="my-2" />
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 w-32">Subject:</span>
                                        <span className="font-semibold text-right flex-1">
                                            {bookingDetails.subject}
                                            {bookingDetails.gradeLevel ? ` - Grade ${bookingDetails.gradeLevel}` : ''}
                                        </span>
                                    </div>
                                    {bookingDetails.date && bookingDetails.time && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 w-32">Preferred Time:</span>
                                            <span className="font-semibold text-right flex-1">
                                                {bookingDetails.date?.toDateString()} at {bookingDetails.time}
                                            </span>
                                        </div>
                                    )}
                                    {bookingDetails.tutor && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 w-32">Tutor:</span>
                                            <span className="font-semibold text-right flex-1">
                                                {bookingDetails.tutor.name || 'Tutor TBD'}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            {additionalCost > 0 && (
                                <div className="flex justify-between text-blue-600">
                                    <span>Additional Sessions:</span>
                                    <span>+${additionalCost.toFixed(2)}</span>
                                </div>
                            )}
                            <hr className="my-3" />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total:</span>
                                <span className="text-blue-600">
                                    {plan.priceType === 'monthly' 
                                        ? `$${totalPrice.toFixed(2)}/mo`
                                        : plan.priceType === 'per_session'
                                        ? `$${totalPrice.toFixed(2)}/session`
                                        : 'Free'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Initializing payment...</p>
                                </div>
                            </div>
                        ) : error && !clientSecret ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Error</p>
                                        <p className="text-sm text-red-700 mt-1">{error}</p>
                                    </div>
                                </div>
                            </div>
                        ) : clientSecret ? (
                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                                <PaymentForm
                                    clientSecret={clientSecret}
                                    bookingId={bookingId}
                                    amount={totalPrice}
                                    onComplete={onComplete}
                                    onError={setError}
                                />
                            </Elements>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Unable to initialize payment. Please try again.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Back Button */}
            <div className="mt-6">
                <button
                    onClick={onBack}
                    disabled={isLoading}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center disabled:bg-gray-100"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
            </div>
        </div>
    );
}

