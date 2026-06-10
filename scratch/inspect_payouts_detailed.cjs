const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: payouts, error } = await supabase
        .from('payouts')
        .select('*');

    if (error) {
        console.error('Error fetching payouts:', error);
        return;
    }

    console.log('payouts:', JSON.stringify(payouts, null, 2));
}

run();
