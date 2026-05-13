const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recoverSales() {
    console.log('Fetching paid billings...');
    const { data: billings } = await supabaseAdmin
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PAID');

    if (!billings || billings.length === 0) {
        console.log('No paid billings found.');
        return;
    }

    const { data: settingsRow } = await supabaseAdmin
        .from('system_settings')
        .select('*')
        .single();
    
    const settings = { 
        defaultRate: settingsRow?.commission_default_rate || 0.15, 
        customRates: settingsRow?.commission_custom_rates || {} 
    };

    for (const billing of billings) {
        const metadata = billing.metadata || {};
        const cartIds = metadata.cartIds || [];
        const userId = metadata.userId;

        if (!userId || cartIds.length === 0) continue;

        const { data: photos } = await supabaseAdmin
            .from('photos')
            .select('*')
            .in('id', cartIds);

        if (!photos || photos.length === 0) continue;

        for (const photo of photos) {
            // Check if sale already exists
            const { data: existingSales } = await supabaseAdmin
                .from('sales')
                .select('*')
                .eq('buyer_id', userId)
                .eq('photo_id', photo.id);
            
            if (existingSales && existingSales.length > 0) {
                console.log(`Sale already exists for photo ${photo.id} and user ${userId}`);
                continue;
            }

            let rate = settings.defaultRate;
            if (settings.customRates?.[photo.photographer_id] !== undefined) {
                rate = settings.customRates[photo.photographer_id];
            }

            const commissionValue = photo.price * rate;

            const { error: saleError } = await supabaseAdmin.from('sales').insert({
                photo_id: photo.id,
                buyer_id: userId,
                price: photo.price,
                commission: commissionValue,
                photographer_id: photo.photographer_id,
                commission_rate: rate,
                sale_date: billing.updated_at || new Date()
            });

            if (saleError) {
                console.error(`Error inserting sale for photo ${photo.id}:`, saleError);
            } else {
                console.log(`Recovered sale for photo ${photo.id} (buyer: ${userId})`);
            }
        }
    }
}

recoverSales().then(() => console.log('Recovery finished.'));
