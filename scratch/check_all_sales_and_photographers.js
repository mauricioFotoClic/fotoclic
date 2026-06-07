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

async function checkAllSales() {
    try {
        console.log('=== Relatório de Vendas Globais da Plataforma ===');

        // 1. Obter todos os usuários fotógrafos para termos nomes e e-mails
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email, role');
        
        const photogs = users?.filter(u => u.role === 'photographer') || [];
        const photogMap = new Map(photogs.map(p => [p.id, p]));

        // 2. Contar todas as vendas registradas por fotógrafo na tabela 'sales'
        const { data: sales, error: sErr } = await supabase
            .from('sales')
            .select('id, photo_id, photographer_id, price, status, billing_id');

        if (sErr) throw sErr;

        console.log(`\nTotal de vendas na tabela 'sales': ${sales?.length || 0}`);
        const salesByPhotog = {};
        sales?.forEach(s => {
            salesByPhotog[s.photographer_id] = salesByPhotog[s.photographer_id] || [];
            salesByPhotog[s.photographer_id].push(s);
        });

        console.log('\nDistribuição de vendas na tabela "sales":');
        for (const [pId, pSales] of Object.entries(salesByPhotog)) {
            const user = photogMap.get(pId);
            const totalAmount = pSales.reduce((sum, s) => sum + s.price, 0);
            console.log(`- ${user ? user.name : 'Desconhecido'} (${user ? user.email : pId}): ${pSales.length} vendas (Total: R$ ${totalAmount})`);
        }

        // 3. Buscar todas as cobranças do Abacate Pay (PAID)
        const { data: dbBillings } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID');

        console.log(`\nTotal de cobranças pagas no Abacate Pay: ${dbBillings?.length || 0}`);

        const { data: photos } = await supabase
            .from('photos')
            .select('id, title, photographer_id');
        const photoMap = new Map(photos?.map(p => [p.id, p]) || []);

        console.log('\nCruzamento detalhado de Cobranças Pagas do Abacate Pay:');
        let unmappedCount = 0;
        for (const billing of dbBillings || []) {
            let metadata = billing.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
            const cartIds = metadata.cartIds || [];
            console.log(`- Cobrança ${billing.billing_id} (Valor: R$ ${billing.amount/100}):`);
            
            for (const photoId of cartIds) {
                const photo = photoMap.get(photoId);
                const owner = photo ? photogMap.get(photo.photographer_id) : null;
                
                // Buscar a venda dessa foto nesse billing_id
                const saleRecord = sales?.find(s => s.billing_id === billing.billing_id && s.photo_id === photoId);
                
                if (!saleRecord) {
                    console.log(`  * 🔴 Foto ID: ${photoId} ("${photo ? photo.title : 'Deletada'}"), Dono: ${owner ? owner.name : 'Desconhecido'} (${owner ? owner.email : 'N/A'}), Venda no Supabase: FALTANDO`);
                    unmappedCount++;
                } else {
                    console.log(`  * ✅ Foto ID: ${photoId} ("${photo ? photo.title : 'Deletada'}"), Dono: ${owner ? owner.name : 'Desconhecido'} (${owner ? owner.email : 'N/A'}), Venda no Supabase: Venda ID ${saleRecord.id} (Status: ${saleRecord.status}, Fotógrafo na Venda: ${photogMap.get(saleRecord.photographer_id)?.name})`);
                }
            }
        }

        console.log(`\nTotal de itens em cobranças pagas sem correspondência em sales: ${unmappedCount}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkAllSales();
