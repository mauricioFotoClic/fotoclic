import { loadStripe } from '@stripe/stripe-js';

const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log(`[Stripe Config] Raw Key Type: ${typeof rawKey}`);
console.log(`[Stripe Config] Key Length: ${rawKey ? rawKey.length : 0}`);
if (rawKey && typeof rawKey === 'string') {
    console.log(`[Stripe Config] Key Start: ${rawKey.substring(0, 5)}...`);
}

const publishableKey = (rawKey && rawKey.startsWith('pk_'))
    ? rawKey
    : '';

if (!publishableKey) {
    console.error(`[Stripe Config] CRITICAL: Invalid Publishable Key. Value received: "${rawKey}"`);
}

export const stripePromise = loadStripe(publishableKey);
