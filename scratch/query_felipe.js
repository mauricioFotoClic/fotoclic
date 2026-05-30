import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking columns of table sales...");
    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns of sales table:", Object.keys(data[0]));
    } else {
        console.log("No rows in sales table, but let's query column metadata...");
    }

    // Direct metadata query using exec_sql
    try {
        const { data: cols, error: colError } = await supabase.rpc('exec_sql', {
            sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales';"
        });
        if (colError) console.error("exec_sql error:", colError);
        else console.log("Database columns:", cols);
    } catch (e) {
        console.error("exec_sql exception:", e);
    }
}
check();
