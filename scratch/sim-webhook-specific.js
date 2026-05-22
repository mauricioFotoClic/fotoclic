import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulate() {
    const { data: billings } = await supabase.from('abacate_pay_billings').select('*').eq('billing_id', 'bill_wXTUzq3fsXW2sDuJtjNYsrUW').single();
    if (!billings) {
        console.log("Billing not found");
        return;
    }
    const cartIds = billings.metadata.cartIds;
    
    console.log("Cart IDs:", cartIds);

    const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .in('id', cartIds);
    
    console.log("Photos:", photos.map(p => ({id: p.id, photographer_id: p.photographer_id})));

    const photographerIds = [...new Set(photos.map(p => p.photographer_id))];
    console.log("Photographer IDs:", photographerIds);

    const { data: photographersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', photographerIds);
    
    console.log("Photographers Data:", photographersData);

    const photographerMap = (photographersData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {});

    const photographerSalesMap = {};
    for (const photo of photos) {
        if (!photographerSalesMap[photo.photographer_id]) {
            photographerSalesMap[photo.photographer_id] = {
                photographer: photographerMap[photo.photographer_id],
                totalCommission: 0,
                photos: []
            };
        }
        photographerSalesMap[photo.photographer_id].photos.push(photo);
    }

    for (const [pId, saleData] of Object.entries(photographerSalesMap)) {
        console.log(`PId: ${pId}, Photographer:`, saleData.photographer);
    }
}

simulate();
