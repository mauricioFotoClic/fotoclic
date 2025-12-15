import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe';
import { CheckoutForm } from './CheckoutForm';
import { loadStripe } from '@stripe/stripe-js';
import Spinner from './Spinner';

interface StripeContainerProps {
    clientSecret: string;
    amount: number;
    onSuccess: () => void;
}

export const StripeContainer: React.FC<StripeContainerProps> = ({ clientSecret, amount, onSuccess }) => {
    // 1. Validate Keys immediately
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    console.log("[StripeContainer] Rendered. Key available:", !!publishableKey);

    if (!publishableKey) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-bold mb-2">Configuração Incompleta</p>
                <p className="text-red-500 text-sm">Chave pública do Stripe não encontrada.</p>
            </div>
        );
    }

    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#2563eb',
                borderRadius: '12px',
            },
        },
    };

    return (
        <Elements options={options} stripe={stripePromise}>
            <CheckoutForm
                amount={amount}
                onSuccess={onSuccess}
                onClose={() => { }}
            />
        </Elements>
    );
};
