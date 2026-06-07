import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const apiKey = process.env.ABACATEPAY_API_KEY;

async function checkMarciaSales() {
    try {
        console.log('=== Diagnóstico: Vendas de Marcia M Feitosa ===');

        const { data: marcia } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'marcia@fvimagem.com')
            .single();

        if (!marcia) {
            console.log('Marcia M Feitosa não encontrada.');
            return;
        }

        const { data: photos } = await supabase
            .from('photos')
            .select('id, title, price')
            .eq('photographer_id', marcia.id);

        const photoIds = photos?.map(p => p.id) || [];
        console.log(`Total de fotos da Marcia: ${photoIds.length}`);

        // 1. Checkouts pagos da Marcia no Abacate Pay
        const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const apiData = await apiRes.json();
        
        if (!apiData.success || !apiData.data) {
            console.error('Erro na API:', apiData.error);
            return;
        }

        const paidCheckouts = apiData.data.filter(c => c.status === 'PAID');
        console.log(`Total de checkouts pagos no Abacate Pay: ${paidCheckouts.length}`);

        let orphans = 0;
        for (const checkout of paidCheckouts) {
            let metadata = checkout.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
            const cartIds = metadata.cartIds || [];
            const matching = cartIds.filter(id => photoIds.includes(id));

            if (matching.length > 0) {
                console.log(`\n[PAGO] Checkout ${checkout.id} contém fotos da Marcia:`, matching);
                orphans += matching.length;
            }
        }

        console.log(`\nVendas de fotos da Marcia pagas no Abacate Pay: ${orphans}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkMarciaSales();
