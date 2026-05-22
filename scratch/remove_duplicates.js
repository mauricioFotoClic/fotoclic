import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sales, error } = await supabase.from('sales').select('*');
    if (error) {
        console.error(error);
        return;
    }

    const seen = new Set();
    const toDelete = [];

    for (const sale of sales) {
        const key = `${sale.buyer_id}_${sale.photo_id}`;
        if (seen.has(key)) {
            console.log(`Duplicate found: Sale ID ${sale.id} for Photo ${sale.photo_id} and Buyer ${sale.buyer_id}`);
            toDelete.push(sale.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicates...`);
        const { error: delError } = await supabase.from('sales').delete().in('id', toDelete);
        if (delError) {
            console.error('Delete error:', delError);
        } else {
            console.log('Duplicates deleted successfully.');
        }
    } else {
        console.log('No duplicates found.');
    }
}

run();
