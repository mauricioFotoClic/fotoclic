import { loadStripe } from '@stripe/stripe-js';

const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Sanitize the key to handle cases where the user pasted "VAR_NAME=value"
let publishableKey = '';
if (rawKey) {
    publishableKey = rawKey;
    // Remove "VITE_STRIPE_PUBLISHABLE_KEY=" if present
    if (publishableKey.includes('=')) {
        publishableKey = publishableKey.split('=').pop() || '';
    }
    // Remove quotes if present
    publishableKey = publishableKey.replace(/['"]/g, '').trim();
}

if (!publishableKey) {
    console.error("VITE_STRIPE_PUBLISHABLE_KEY is missing!");
}

export const stripePromise = loadStripe(publishableKey);
