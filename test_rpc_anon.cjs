const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.rpc('get_photographers_with_stats').then(res => console.log('RPC result:', res.data ? res.data.length : res.error)).catch(console.error);
