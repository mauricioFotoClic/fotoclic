import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    setTimeout(() => {
        console.error("Test timed out after 15 seconds!");
        process.exit(1);
    }, 15000);

    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val

    console.log("Fetching events with embedded photos count...");
    console.time("Single Query Time");

    // We fetch events and their counts in a single select query.
    // In PostgREST, we can get the count of the relation:
    const { data, error } = await supabase
      .from("events")
      .select(`
        id,
        name,
        photos:photos(count)
      `)
      .eq("photographer_id", photographerId);
      
    console.timeEnd("Single Query Time");

    if (error) {
        console.error("Query failed:", error);
        process.exit(1);
    }

    console.log(`Fetched ${data?.length} events.`);
    console.log("Data sample:", JSON.stringify(data, null, 2));

    process.exit(0);
}

runTest();
