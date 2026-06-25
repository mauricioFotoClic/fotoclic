import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need service role key to query pg_catalog/pg_policies or run raw sql
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runCheck() {
    console.log("Checking pg_policies in Supabase...");
    
    // We can query pg_policies using supabase.rpc or a raw query if pg_policies is exposed,
    // but since we are service role, we can also use SQL execution.
    // Wait, Supabase client doesn't have a direct raw SQL execution method unless we use an RPC.
    // Let's check if we can query pg_policies via standard select if we have security access?
    // Actually pg_policies is a system view, but it's not exposed in postgrest by default.
    // However, we can try to fetch policies using a helper function or check if we can run a custom check.
    // Wait, let's see if we have any RPC that lets us run SQL.
    // If not, we can write a quick query to users and test if there's any other RLS issues, 
    // or inspect supabase_schema.sql or other migration files to see if there are other policies.
    
    // Let's check if the query to users is slow for ALL users, or just for this specific ID.
    console.time("Query all users (limit 5)");
    const { data: users, error: err1 } = await supabase
        .from("users")
        .select("id, name, role")
        .limit(5);
    console.timeEnd("Query all users (limit 5)");
    if (err1) console.error("Error fetching users:", err1.message);
    else console.log(`Fetched ${users?.length} users.`);

    // Let's do a direct test: does bypassing RLS using the service_role key make it instant?
    console.time("getPhotographerById with SERVICE_ROLE (Bypassing RLS)");
    const { data: userSR, error: err2 } = await supabase
        .from("users")
        .select("*")
        .eq("id", "aa5ea2f0-3548-43f6-b4ea-8270abaeb98f")
        .single();
    console.timeEnd("getPhotographerById with SERVICE_ROLE (Bypassing RLS)");
    if (err2) console.error("Error with Service Role:", err2.message);
    else console.log("Success with Service Role. Name:", userSR.name);
}

runCheck();
