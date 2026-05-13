const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runWebhookLogic(checkoutId) {
    console.log('[AbacatePay Webhook] Pagamento confirmado! Checkout ID:', checkoutId);

    const { data: billingRecord, error: updateError } = await supabaseAdmin
        .from('abacate_pay_billings')
        .update({ status: 'PAID', payment_method: 'PIX' })
        .eq('billing_id', checkoutId)
        .select()
        .single();

    if (updateError) {
        console.error('[AbacatePay Webhook] Erro ao atualizar billing:', updateError);
        return;
    } 
    
    if (!billingRecord) {
        console.log('No billing record found');
        return;
    }

    console.log('Billing record:', billingRecord.id);

    const metadata = billingRecord.metadata || {};
    const cartIds = metadata.cartIds || [];
    const userId = metadata.userId || 'guest-id';

    console.log('Cart IDs:', cartIds);

    if (cartIds.length > 0) {
        const { data: photos, error: photosError } = await supabaseAdmin
            .from('photos')
            .select('*')
            .in('id', cartIds);
            
        console.log('Photos count:', photos ? photos.length : 'error', photosError);

        if (photos && photos.length > 0) {
            const { data: settingsRow, error: settingsError } = await supabaseAdmin
                .from('settings')
                .select('value')
                .eq('key', 'commission_settings')
                .single();
                
            console.log('Settings row:', settingsRow, 'Error:', settingsError);

            let settings = { defaultRate: 0.15, customRates: {} };
            if (settingsRow?.value) settings = settingsRow.value;

            for (const photo of photos) {
                let rate = settings.defaultRate;
                if (settings.customRates?.[photo.photographer_id] !== undefined) {
                    rate = settings.customRates[photo.photographer_id];
                }

                const finalPrice = photo.price;
                const commissionValue = finalPrice * rate;

                console.log(`Inserting sale for photo ${photo.id}...`);

                const { error: saleError } = await supabaseAdmin.from('sales').insert({
                    photo_id: photo.id,
                    buyer_id: userId,
                    price: finalPrice,
                    commission: commissionValue,
                    photographer_id: photo.photographer_id,
                    commission_rate: rate,
                    sale_date: new Date()
                });

                if (saleError) {
                    console.error('[AbacatePay Webhook] Erro ao salvar venda:', saleError);
                } else {
                    console.log('Sale inserted successfully!');
                }
            }
            console.log('[AbacatePay Webhook] Vendas registradas com sucesso.');
        }
    }
}

runWebhookLogic('bill_gNFBbbU1UhhayTPTerc6p6Xf');
