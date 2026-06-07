const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: "SELECT pg_get_viewdef('photographer_wallet_summary'::regclass, true) as view_definition;"
        });
        if (error) {
            console.error("rpc error:", error);
        } else {
            console.log("View Definition:\n", data);
        }
    } catch (e) {
        console.error("rpc exception:", e);
    }
}

run();
