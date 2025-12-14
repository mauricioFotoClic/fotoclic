import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export const CheckoutForm = ({ amount, onSuccess, onClose }: { amount: number, onSuccess: () => void, onClose: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/payment-success',
            },
            redirect: 'if_required'
        });

        if (error) {
            setErrorMessage(error.message ?? 'An unknown error occurred');
            setLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess();
        } else {
            // Unexpected state, but not necessarily an error (e.g. requires action)
            if (paymentIntent) console.log("Payment status:", paymentIntent.status);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="min-h-[200px]">
                <PaymentElement options={{ layout: "tabs" }} />
            </div>
            <button
                disabled={!stripe || loading}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-6 text-lg"
            >
                {loading ? (
                    <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Processando...
                    </div>
                ) : `Pagar R$ ${amount.toFixed(2).replace('.', ',')}`}
            </button>
            {errorMessage && <div className="text-red-500 mt-2 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{errorMessage}</div>}
        </form>
    );
};
