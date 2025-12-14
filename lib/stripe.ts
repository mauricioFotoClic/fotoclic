import { loadStripe } from '@stripe/stripe-js';

// FALLBACK KEY ADDED FOR DEBUGGING - Vercel Env Var is persisting the variable name instead of value
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
        ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
        : '';

if (!publishableKey) {
    console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set in .env");
}

export const stripePromise = loadStripe(publishableKey);
