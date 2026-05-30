import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const billingId = 'bill_FpSZNmKdRJLyqSrwuTWFGDj4';
    const userId = '00fcaeec-35e2-46ae-8d1e-6c3c12280460';

    const { data: billing } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .single();

    const metadata = billing.metadata || {};
    const cartIds = metadata.cartIds || [];

    console.log("Cart IDs in billing:", cartIds);

    const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .in('id', cartIds);

    if (photosError) {
        console.error("Photos error:", photosError);
        return;
    }
    console.log("Matched photos count:", photos?.length);

    const { data: settingsRow } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    const defaultRate = settingsRow?.commission_default_rate || 0.06;
    const customRates = settingsRow?.commission_custom_rates || {};

    for (const photo of photos) {
        const rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
        const commissionValue = photo.price * rate;

        console.log(`Attempting insert for photo ${photo.id}...`);
        const { data, error } = await supabase.from('sales').upsert({
            photo_id: photo.id,
            buyer_id: userId,
            price: photo.price,
            commission: commissionValue,
            commission_rate: rate,
            photographer_id: photo.photographer_id,
            billing_id: billingId,
            status: 'completed',
            is_available: true,
            available_at: new Date().toISOString(),
            sale_date: billing.updated_at || new Date().toISOString()
        }, { onConflict: 'photo_id, buyer_id', ignoreDuplicates: true });

        if (error) {
            console.error(`Error inserting sale for photo ${photo.id}:`, error);
        } else {
            console.log(`Success inserting sale for photo ${photo.id}:`, data);
        }
    }
}
check();
