import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const eventIds = [
    '52cc32ca-fdb9-467c-a49f-b9840af74fa2', // IDs de eventos típicos (podemos testar com qualquer ID)
    'bf740356-9b16-43d9-a720-333e6807eb29'
];

async function runTest() {
    console.log("Testing photos counts query as ANON user...");
    
    // First, let's fetch some events to get real event IDs
    const { data: events, error: evErr } = await supabase
        .from('events')
        .select('id, name')
        .limit(5);
        
    if (evErr) {
        console.error("Error fetching events:", evErr.message);
        return;
    }

    console.log(`Found ${events.length} events:`, events.map(e => `${e.name} (${e.id})`).join(', '));
    const ids = events.map(e => e.id);

    // Test query head for each event ID in parallel
    console.log("\nStarting parallel HEAD queries...");
    console.time("Parallel HEAD queries");
    try {
        await Promise.all(
            ids.map(async (eventId) => {
                console.time(`Query-event-${eventId}`);
                const { count, error } = await supabase
                    .from("photos")
                    .select("id", { count: "exact", head: true })
                    .eq("event_id", eventId)
                    .eq("moderation_status", "approved")
                    .eq("is_public", true);
                console.timeEnd(`Query-event-${eventId}`);
                if (error) {
                    console.error(`Error for event ${eventId}:`, error.message);
                } else {
                    console.log(`Event ${eventId} count:`, count);
                }
            })
        );
        console.timeEnd("Parallel HEAD queries");
    } catch (e) {
        console.timeEnd("Parallel HEAD queries");
        console.error("Failed parallel queries:", e);
    }
}

runTest();
