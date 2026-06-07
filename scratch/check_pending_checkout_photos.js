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

async function checkPending() {
    try {
        console.log('=== Análise de Checkouts Pendentes do Mauricio Val ===');

        // 1. Obter todas as fotos do Mauricio Val
        const { data: mauricio } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'mauricio@fvimagem.com')
            .single();

        const { data: photos } = await supabase
            .from('photos')
            .select('id, title, price')
            .eq('photographer_id', mauricio.id);

        const photoIds = photos?.map(p => p.id) || [];
        const photoMap = new Map(photos?.map(p => [p.id, p]) || []);

        // 2. Buscar checkouts da API do Abacate Pay
        console.log('Buscando checkouts no Abacate Pay...');
        const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const apiData = await apiRes.json();
        
        if (!apiData.success || !apiData.data) {
            console.error('Erro na API:', apiData.error);
            return;
        }

        const pendingCheckouts = apiData.data.filter(c => c.status === 'PENDING');
        console.log(`Total de checkouts PENDENTES na API: ${pendingCheckouts.length}`);

        let foundCount = 0;
        for (const checkout of pendingCheckouts) {
            let metadata = checkout.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
            const cartIds = metadata.cartIds || [];
            
            const matchingPhotos = cartIds.filter(id => photoIds.includes(id));
            if (matchingPhotos.length > 0) {
                console.log(`\n[PENDENTE] Checkout ID: ${checkout.id}`);
                console.log(`Cliente: ${checkout.customer?.name} (${checkout.customer?.email})`);
                console.log(`Valor do Checkout: R$ ${checkout.amount/100}`);
                console.log(`Fotos do Mauricio neste checkout:`);
                matchingPhotos.forEach(id => {
                    const p = photoMap.get(id);
                    console.log(`- Foto "${p?.title || id}" (Preço: R$ ${p?.price || 0})`);
                });
                foundCount++;
            }
        }

        console.log(`\nFim da varredura. Total de checkouts pendentes com fotos do Mauricio: ${foundCount}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkPending();
