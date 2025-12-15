import { loadStripe } from '@stripe/stripe-js';

const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const publishableKey = rawKey ? rawKey.trim() : '';

console.log(`[Stripe Config] Loading Stripe with key: ${publishableKey ? publishableKey.substring(0, 8) + '...' : 'UNDEFINED'}`);

if (!publishableKey) {
    console.error("[Stripe Config] CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY is missing!");
}

export const stripePromise = loadStripe(publishableKey);
