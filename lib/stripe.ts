import { loadStripe } from '@stripe/stripe-js';

// FALLBACK KEY ADDED FOR DEBUGGING - Vercel Env Var is persisting the variable name instead of value
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    : 'pk_test_51SXqtuBiThMfZQbAImqFS0LlQpuVvIwHwCaGSzYYNcMLaEn1bcJ37C6m4ffzNL1FiagmxXXEzH6X7cvG20413od0000Z2bUMr';

if (!publishableKey) {
    console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set in .env");
}

export const stripePromise = loadStripe(publishableKey);
