import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    // Set a global safety timeout of 10s
    setTimeout(() => {
        console.error("Test timed out after 10 seconds!");
        process.exit(1);
    }, 10000);

    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val

    console.log("1. Fetching photographer events...");
    console.time("getPhotographerEvents");
    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false });
    console.timeEnd("getPhotographerEvents");

    if (eventsErr) {
        console.error("Error fetching events:", eventsErr);
        process.exit(1);
    }
    
    console.log(`Fetched ${events.length} events.`);
    if (events.length === 0) {
        console.log("No events found.");
        process.exit(0);
    }

    const eventIds = events.map(e => e.id);
    console.log("Event IDs:", eventIds);

    console.log("\n2. Fetching photo counts using parallel exact count HEAD queries...");
    console.time("getEventPhotoCounts");
    
    const counts = {};
    try {
        await Promise.all(
          eventIds.map(async (eventId) => {
            console.log(`Querying count for event: ${eventId}`);
            console.time(`Query-${eventId}`);
            const { count, error } = await supabase
              .from("photos")
              .select("id", { count: "exact", head: true })
              .eq("event_id", eventId)
              .eq("moderation_status", "approved")
              .eq("is_public", true);
            console.timeEnd(`Query-${eventId}`);
            
            if (error) {
                console.error(`Error for event ${eventId}:`, error);
            } else {
                console.log(`Event ${eventId} count:`, count);
                counts[eventId] = count;
            }
          })
        );
        console.timeEnd("getEventPhotoCounts");
        console.log("Counts data:", counts);
    } catch (e) {
        console.error("Promise.all threw an exception:", e);
    }
    
    process.exit(0);
}

runTest();
