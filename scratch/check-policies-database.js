import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const query = `
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('photos', 'events')
            ORDER BY tablename, policyname;
        `;
        
        console.log("Fetching database policies for 'photos' and 'events'...");
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: query
        });
        
        if (error) {
            console.error("RPC Error:", error);
        } else {
            console.log("\nActive Database Policies:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
    process.exit(0);
}

run();
