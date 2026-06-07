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

async function checkConflict() {
    try {
        console.log('=== Análise de Conflito de Contas e Fotos (fvimagem.com) ===');

        // 1. Obter todos os usuários com o domínio fvimagem.com
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email, role');

        const fvUsers = users?.filter(u => u.email?.endsWith('fvimagem.com')) || [];
        console.log('Usuários fvimagem.com encontrados:');
        fvUsers.forEach(u => {
            console.log(`- ${u.name} (ID: ${u.id}, Email: ${u.email}, Role: ${u.role})`);
        });

        const fvUserIds = fvUsers.map(u => u.id);

        // 2. Buscar vendas dos usuários do domínio fvimagem.com
        console.log('\nVendas registradas na tabela sales para esses usuários:');
        for (const user of fvUsers) {
            const { data: sales } = await supabase
                .from('sales')
                .select('id, photo_id, price, status, sale_date')
                .eq('photographer_id', user.id);
            
            console.log(`- ${user.name} tem ${sales?.length || 0} vendas na tabela 'sales'.`);
            if (sales && sales.length > 0) {
                // Listar as 3 mais recentes
                sales.slice(0, 3).forEach(s => {
                    console.log(`  * Venda ID: ${s.id}, Foto ID: ${s.photo_id}, Preço: R$ ${s.price}, Data: ${s.sale_date}`);
                });
            }
        }

        // 3. Vamos olhar todas as vendas da tabela 'sales' e ver se alguma foto de um usuário do fvimagem.com
        // foi vendida com outro fotógrafo atribuído na tabela sales.
        console.log('\nAnalisando todas as vendas de fotos cujo dono no cadastro "photos" seja da fvimagem.com...');
        const { data: allSales } = await supabase
            .from('sales')
            .select('*');

        const { data: allPhotos } = await supabase
            .from('photos')
            .select('id, title, photographer_id');

        const fvPhotoIds = allPhotos?.filter(p => fvUserIds.includes(p.photographer_id)).map(p => p.id) || [];
        const fvPhotoMap = new Map(allPhotos?.map(p => [p.id, p]) || []);

        let discrepancies = 0;
        for (const sale of allSales || []) {
            const photo = fvPhotoMap.get(sale.photo_id);
            if (photo) {
                if (sale.photographer_id !== photo.photographer_id) {
                    const salePhotog = users?.find(u => u.id === sale.photographer_id);
                    const photoPhotog = users?.find(u => u.id === photo.photographer_id);
                    console.log(`⚠️ DISCREPÂNCIA NA VENDA!`);
                    console.log(`- Venda ID: ${sale.id}`);
                    console.log(`- Foto: "${photo.title}" (ID: ${photo.id})`);
                    console.log(`- Fotógrafo na Foto: ${photoPhotog?.name} (${photoPhotog?.email})`);
                    console.log(`- Fotógrafo na Venda: ${salePhotog?.name} (${salePhotog?.email})`);
                    discrepancies++;
                }
            }
        }

        console.log(`\nDiscrepâncias de fotógrafo na venda vs foto: ${discrepancies}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkConflict();
