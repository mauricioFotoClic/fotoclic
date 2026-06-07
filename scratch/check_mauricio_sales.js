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

async function checkMauricio() {
    try {
        console.log('=== Diagnóstico Mauricio Val ===');
        
        // 1. Buscar fotógrafo na tabela 'users'
        const { data: photographer, error: pError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'mauricio@fvimagem.com')
            .single();

        if (pError) {
            console.error('Erro ao buscar fotógrafo:', pError.message);
            return;
        }

        console.log('Fotógrafo encontrado:', {
            id: photographer.id,
            name: photographer.name,
            email: photographer.email,
            role: photographer.role
        });

        const pId = photographer.id;

        // 2. Buscar fotos dele
        const { data: photos, error: phError } = await supabase
            .from('photos')
            .select('id, title, price, moderation_status')
            .eq('photographer_id', pId);

        if (phError) {
            console.error('Erro ao buscar fotos do fotógrafo:', phError.message);
            return;
        }

        console.log(`\nTotal de fotos dele cadastradas: ${photos?.length || 0}`);
        const photoIds = photos?.map(p => p.id) || [];

        // 3. Buscar vendas associadas a ele na tabela 'sales'
        const { data: sales, error: sError } = await supabase
            .from('sales')
            .select('id, photo_id, price, commission, status, billing_id, sale_date')
            .eq('photographer_id', pId);

        if (sError) {
            console.error('Erro ao buscar vendas:', sError.message);
            return;
        }

        console.log(`\nTotal de vendas registradas no FotoClic para ele: ${sales?.length || 0}`);

        // 4. Buscar cobranças no Abacate Pay que contêm fotos dele
        console.log('\nAnalisando cobranças pagas do Abacate Pay...');
        const { data: billings, error: bError } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID');

        if (bError) {
            console.error('Erro ao buscar cobranças:', bError.message);
            return;
        }

        console.log(`Total de cobranças pagas no Abacate Pay: ${billings?.length || 0}`);
        
        let foundOrphans = 0;
        for (const billing of billings || []) {
            let metadata = billing.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
            const cartIds = metadata.cartIds || [];
            
            // Verificar se algum cartId pertence às fotos do Mauricio
            const matchingPhotosInBilling = cartIds.filter(id => photoIds.includes(id));
            if (matchingPhotosInBilling.length > 0) {
                console.log(`\nCobrança ${billing.billing_id} (Paga) contém fotos do Mauricio:`, matchingPhotosInBilling);
                console.log(`Metadata da cobrança:`, JSON.stringify(metadata));
                
                // Verificar se essa cobrança tem vendas registradas na tabela sales para essas fotos
                for (const photoId of matchingPhotosInBilling) {
                    const hasSale = sales?.some(s => s.billing_id === billing.billing_id && s.photo_id === photoId);
                    if (!hasSale) {
                        const photoDetails = photos?.find(p => p.id === photoId);
                        console.log(`⚠️ ALERTA: Foto "${photoDetails?.title || photoId}" (Preço: R$ ${photoDetails?.price}) está paga na cobrança ${billing.billing_id} mas NÃO tem registro na tabela 'sales'!`);
                        foundOrphans++;
                    } else {
                        const photoDetails = photos?.find(p => p.id === photoId);
                        console.log(`✅ Foto "${photoDetails?.title || photoId}" possui venda correspondente na tabela 'sales'.`);
                    }
                }
            }
        }

        console.log(`\nVarredura concluída. Vendas órfãs encontradas: ${foundOrphans}`);

    } catch (e) {
        console.error('Erro no diagnóstico:', e.message);
    }
}

checkMauricio();
