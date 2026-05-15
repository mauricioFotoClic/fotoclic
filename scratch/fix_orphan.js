import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixOrphan() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const billingId = 'bill_cauyuZSTLkChywNfGy3uPUCR';
    const photoId = '31a5c493-6089-4080-ab86-fcab1165d336';
    const userId = 'f2164062-6515-4ff1-a68f-314f3b5b8f68';
    const price = 2;
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';

    const { data, error } = await supabase.from('sales').insert({
        photo_id: photoId,
        buyer_id: userId,
        price: price,
        commission: price * 0.06,
        commission_rate: 0.06,
        photographer_id: photographerId,
        billing_id: billingId,
        status: 'completed',
        is_available: true,
        available_at: new Date().toISOString(),
        sale_date: new Date().toISOString()
    });

    if (error) {
        console.error('Erro ao fixar:', error);
        return;
    }

    console.log('Fixado com sucesso!');
}

fixOrphan();
