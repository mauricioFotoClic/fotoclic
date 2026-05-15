import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkCommissionSettings() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('system_settings')
        .select('commission_default_rate, commission_custom_rates')
        .limit(1);

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Commission Settings:', JSON.stringify(data, null, 2));
}

checkCommissionSettings();
