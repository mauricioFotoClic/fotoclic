import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe';
import { CheckoutForm } from './CheckoutForm';
import { StripeElementsOptions } from '@stripe/stripe-js';

interface StripePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number; // Amount in cents
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({ isOpen, onClose, amount }) => {
    const [clientSecret, setClientSecret] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Create PaymentIntent as soon as the modal opens
            fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret))
                .catch((err) => console.error("Error creating payment intent:", err));
        }
    }, [isOpen, amount]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe' as const,
    };
    const options: StripeElementsOptions = {
        clientSecret,
        appearance,
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    ✕
                </button>
                <h2 className="text-xl font-bold mb-6 text-gray-800">Complete Payment</h2>
                {clientSecret ? (
                    <Elements options={options} stripe={stripePromise}>
                        <CheckoutForm
                            amount={amount}
                            onSuccess={() => {
                                alert('Pagamento de teste realizado com sucesso!');
                                onClose();
                            }}
                            onClose={onClose}
                        />
                    </Elements>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500">Secure connection...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
