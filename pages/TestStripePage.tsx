import React, { useState } from 'react';
import { StripePaymentModal } from '../components/StripePaymentModal';

const TestStripePage = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4 text-purple-600">Stripe Integration Test</h1>
                <p className="mb-8 text-gray-600">
                    Click the button below to simulate a payment of <span className="font-bold">R$ 10,00</span>.
                </p>

                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    Test Payment Modal
                </button>

                <div className="mt-8 text-left text-xs text-gray-400 bg-gray-50 p-4 rounded border border-gray-100">
                    <p className="font-bold mb-2">Debug Info:</p>
                    <p>Environment: {import.meta.env.MODE}</p>
                    <p>Stripe Key Present: {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <StripePaymentModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                amount={1000} // 1000 cents = R$ 10.00
            />
        </div>
    );
};

export default TestStripePage;
