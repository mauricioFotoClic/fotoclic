import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

if (!publishableKey) {
    console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set in .env");
}

export const stripePromise = loadStripe(publishableKey);
