import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkPhoto() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('photos')
        .select('photographer_id, price')
        .eq('id', '31a5c493-6089-4080-ab86-fcab1165d336');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(data);
}

checkPhoto();
