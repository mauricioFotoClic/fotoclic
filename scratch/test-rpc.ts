
import { createClient } from '@supabase/supabase-client-helpers'; // Wait, I don't know the helper package
// Let's use the standard supabase client
import { supabase } from '../services/supabaseClient';

async function testStats() {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Stats:', JSON.stringify(data, null, 2));
    }
}

testStats();
