import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicates() {
    console.log("Fetching all sales...");
    const { data: sales, error } = await supabase.from('sales').select('id, buyer_id, photo_id').order('created_at', { ascending: true });
    
    if (error) {
        console.error("Error fetching sales", error);
        return;
    }

    const seen = new Set();
    const duplicates = [];

    for (const sale of sales) {
        const key = `${sale.buyer_id}_${sale.photo_id}`;
        if (seen.has(key)) {
            duplicates.push(sale.id);
        } else {
            seen.add(key);
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates. Deleting...`);
        for (const id of duplicates) {
            await supabase.from('sales').delete().eq('id', id);
            console.log(`Deleted duplicate sale ${id}`);
        }
    } else {
        console.log("No duplicates found.");
    }
}

fixDuplicates();
