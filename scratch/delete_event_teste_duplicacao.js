import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanOrphanEvents() {
  console.log("Searching for event 'Teste duplicacao'...");
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, photographer_id')
    .ilike('name', '%Teste duplicacao%');

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log("Found events matching 'Teste duplicacao':", events);

  for (const ev of events) {
    console.log(`Deleting photos for event ${ev.name} (${ev.id})...`);
    await supabase.from('photos').delete().eq('event_id', ev.id);
    
    console.log(`Deleting event ${ev.name} (${ev.id})...`);
    const { error: delErr } = await supabase.from('events').delete().eq('id', ev.id);
    if (delErr) {
      console.error("Error deleting event:", delErr);
    } else {
      console.log(`Successfully deleted event ${ev.name}`);
    }
  }
}

cleanOrphanEvents();
