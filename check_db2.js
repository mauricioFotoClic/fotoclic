import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: cols } = await supabase.rpc('exec_sql', { sql_query: "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'face_encodings';" });
    console.log(cols);
    const { data: first } = await supabase.from('face_encodings').select('descriptor').limit(1);

    if (first && first.length > 0) {
        console.log("Vector string representation length:", first[0].descriptor.length);
        console.log("Dimension count approx:", first[0].descriptor.split(',').length);
    }
}
check();
