import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';

async function runTest() {
    console.log("Testing Supabase API connection as ANON user...");
    console.log("Supabase URL:", supabaseUrl);
    
    // Test 1: getPhotographerById
    console.time("getPhotographerById");
    try {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", photographerId)
            .single();
        console.timeEnd("getPhotographerById");
        if (error) console.error("Error getPhotographerById:", error.message);
        else console.log("Success getPhotographerById. Name:", data.name);
    } catch (e) {
        console.timeEnd("getPhotographerById");
        console.error("Failed getPhotographerById:", e);
    }

    // Test 2: getPhotographerEvents
    console.time("getPhotographerEvents");
    try {
        const { data, error } = await supabase
            .from("events")
            .select("*")
            .eq("photographer_id", photographerId)
            .order("created_at", { ascending: false });
        console.timeEnd("getPhotographerEvents");
        if (error) console.error("Error getPhotographerEvents:", error.message);
        else console.log(`Success getPhotographerEvents. Found ${data?.length} events.`);
    } catch (e) {
        console.timeEnd("getPhotographerEvents");
        console.error("Failed getPhotographerEvents:", e);
    }

    // Test 3: getEventPhotoCounts (Legacy vs Optimized)
    // Legacy style: Fetch all event_id from photos table for this photographer
    console.time("getEventPhotoCounts (Legacy style - select event_id)");
    try {
        const { data, error } = await supabase
            .from("photos")
            .select("event_id")
            .eq("photographer_id", photographerId);
        console.timeEnd("getEventPhotoCounts (Legacy style - select event_id)");
        if (error) console.error("Error Legacy Counts:", error.message);
        else console.log(`Success Legacy Counts. Fetched ${data?.length} rows.`);
    } catch (e) {
        console.timeEnd("getEventPhotoCounts (Legacy style - select event_id)");
        console.error("Failed Legacy Counts:", e);
    }
}

runTest();
