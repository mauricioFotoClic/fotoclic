import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkConstraints() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'sales' });
    
    if (error) {
        console.error('Erro (RPC might not exist):', error);
        // Fallback: try to see if we can just insert a duplicate to test
        return;
    }

    console.log(data);
}

checkConstraints();
