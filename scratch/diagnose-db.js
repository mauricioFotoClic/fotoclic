import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log("Diagnosing Supabase Database...");
    
    // Helper to execute SQL
    const execSql = async (sql) => {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error(`Error running SQL [${sql.substring(0, 50)}...]:`, error.message);
            return null;
        }
        return data;
    };

    // 1. Show indexes for users and events
    console.log("\n--- INDEXES on 'users' and 'events' tables ---");
    const indexes = await execSql(`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename IN ('users', 'events', 'photos');
    `);
    console.log(JSON.stringify(indexes, null, 2));

    // 2. EXPLAIN ANALYZE for the query
    console.log("\n--- EXPLAIN ANALYZE SELECT FROM users ---");
    const explainUser = await execSql(`
        EXPLAIN ANALYZE SELECT * FROM users WHERE id = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'::uuid;
    `);
    console.log(explainUser ? explainUser.map(r => r.query_plan).join('\n') : "No explain output");

    // 3. EXPLAIN ANALYZE for SELECT FROM events
    console.log("\n--- EXPLAIN ANALYZE SELECT FROM events ---");
    const explainEvents = await execSql(`
        EXPLAIN ANALYZE SELECT * FROM events WHERE photographer_id = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'::uuid;
    `);
    console.log(explainEvents ? explainEvents.map(r => r.query_plan).join('\n') : "No explain output");

    // 4. View active policies
    console.log("\n--- pg_policies ---");
    const policies = await execSql(`
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename IN ('users', 'events');
    `);
    console.log(JSON.stringify(policies, null, 2));
}

diagnose();
