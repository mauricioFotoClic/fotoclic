const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: p, error } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f')
        .single();

    if (error) {
        console.error('Error fetching photographer:', error);
        return;
    }

    console.log('Photographer:', p);
}

run();
