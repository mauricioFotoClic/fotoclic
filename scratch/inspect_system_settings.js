const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('commission_custom_rates:', JSON.stringify(data.commission_custom_rates, null, 2));
}

run();
