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

console.log(`[Stripe Config] Loading Stripe with key: ${publishableKey ? publishableKey.substring(0, 8) + '...' : 'UNDEFINED'}`);

if (!publishableKey) {
    console.error("[Stripe Config] CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY is missing!");
}

export const stripePromise = loadStripe(publishableKey);
