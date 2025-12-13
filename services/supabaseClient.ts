import { createClient } from '@supabase/supabase-js';

// Robust environment detection to prevent "Cannot read properties of undefined"
let env: any = {};
try {
    // Check for Vite's import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        env = (import.meta as any).env;
    }
} catch (e) {
    console.warn("Environment variables not accessible, using fallbacks.");
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

// Fallback strings for development if .env is missing or env vars are not loaded
const finalUrl = supabaseUrl || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const finalKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cnJ3aHVsZXRza251ampmZHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTA4NTcsImV4cCI6MjA3OTc4Njg1N30.jh_zTKIgoJRzaNb-JD2aPVL7Sa9Cv2wygmXsJgD7Gug';

if (!finalUrl || !finalKey) {
    console.error('Supabase URL e Key não encontradas. O cliente pode falhar.');
}

export const supabase = createClient(finalUrl, finalKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    // Prevent throwing on network errors during client init
    global: {
        headers: { 'x-application-name': 'fotoclic' }
    }
});