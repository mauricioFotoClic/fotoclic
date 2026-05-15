import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createMissingSale() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const billingId = 'bill_0j2u2m0v93V6Yf8jA9mZ6X8Y';
    const photoId = '31a5c493-6089-4080-ab86-fcab1165d336';
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';
    const buyerId = 'f2164062-6515-4ff1-a68f-314f3b5b8f68';
    const price = 2;
    const commissionRate = 0.06;
    const commission = 0.12;

    const { data, error } = await supabase
        .from('sales')
        .insert({
            photo_id: photoId,
            photographer_id: photographerId,
            buyer_id: buyerId,
            price: price,
            commission: commission,
            commission_rate: commissionRate,
            billing_id: billingId,
            status: 'completed',
            is_available: true,
            available_at: new Date().toISOString(),
            sale_date: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Erro ao criar venda:', error);
        return;
    }

    console.log('Venda criada com sucesso:', data);
}

createMissingSale();
