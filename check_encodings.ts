```
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEncodings() {
    console.log('Checking face_encodings table...');

    try {
        // Get total count
        const { count, error: countError } = await supabase
            .from('face_encodings')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching count:', countError);
            return;
        }

        console.log(`Total encodings in DB: ${count}`);

        // Get a sample to check structure
        const { data, error } = await supabase
            .from('face_encodings')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching sample:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Sample encoding:', {
                id: data[0].id,
                photo_id: data[0].photo_id,
                descriptor_length: data[0].descriptor ? JSON.parse(JSON.stringify(data[0].descriptor)).length : 'null/invalid',
                model_version: data[0].model_version
            });
        } else {
            console.log('No encodings found in table.');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkEncodings();
```
