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

async function diagnose() {
    try {
        console.log('=== Diagnóstico Profundo: Vendas do Mauricio Val ===');

        // 1. Obter os dados do Mauricio Val
        const { data: mauricio } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'mauricio@fvimagem.com')
            .single();

        if (!mauricio) {
            console.error('Fotógrafo Mauricio Val não encontrado.');
            return;
        }
        console.log(`Mauricio Val ID: ${mauricio.id}`);

        // 2. Buscar checkouts diretamente da API do Abacate Pay
        console.log('\nBuscando checkouts no Abacate Pay...');
        const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const apiData = await apiRes.json();
        
        if (!apiData.success || !apiData.data) {
            console.error('Erro ao chamar API do Abacate Pay:', apiData.error);
            return;
        }

        console.log(`Total de checkouts no Abacate Pay: ${apiData.data.length}`);
        const paidCheckouts = apiData.data.filter(c => c.status === 'PAID');
        console.log(`Checkouts pagos no Abacate Pay: ${paidCheckouts.length}`);

        // 3. Buscar todas as vendas da tabela 'sales' no Supabase
        const { data: sales, error: sErr } = await supabase
            .from('sales')
            .select('*');

        if (sErr) throw sErr;
        console.log(`Total de vendas registradas no Supabase ('sales'): ${sales.length}`);

        // 4. Buscar todas as fotos dele para referência
        const { data: mauricioPhotos } = await supabase
            .from('photos')
            .select('id, title, price')
            .eq('photographer_id', mauricio.id);

        const mauricioPhotoIds = new Set(mauricioPhotos?.map(p => p.id) || []);
        console.log(`Total de fotos cadastradas do Mauricio Val: ${mauricioPhotoIds.size}`);

        // 5. Cruzar checkouts pagos com fotos e vendas
        console.log('\nCruzando dados dos checkouts pagos com as fotos do Mauricio...');
        let totalProblems = 0;

        for (const checkout of paidCheckouts) {
            let metadata = checkout.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }

            const cartIds = metadata.cartIds || [];
            
            // Verificar se há alguma foto do Mauricio nesse checkout
            const mauricioPhotosInCheckout = cartIds.filter(id => mauricioPhotoIds.has(id));
            
            if (mauricioPhotosInCheckout.length > 0) {
                console.log(`\n[PAGO] Checkout ${checkout.id} (Valor: R$ ${checkout.amount/100}) contém ${mauricioPhotosInCheckout.length} fotos do Mauricio.`);
                console.log(`Cliente: ${checkout.customer?.name} (${checkout.customer?.email})`);
                console.log(`Itens detectados:`, mauricioPhotosInCheckout);

                for (const photoId of mauricioPhotosInCheckout) {
                    const photoObj = mauricioPhotos?.find(p => p.id === photoId);
                    
                    // Verificar se existe a venda correspondente na tabela 'sales'
                    const saleRecord = sales.find(s => s.billing_id === checkout.id && s.photo_id === photoId);
                    
                    if (!saleRecord) {
                        console.log(`❌ ALERTA: Venda FALTANDO! A foto "${photoObj?.title || photoId}" foi paga no checkout ${checkout.id} mas não tem registro na tabela 'sales' do Supabase.`);
                        totalProblems++;
                    } else {
                        console.log(`✅ Venda OK: Foto "${photoObj?.title || photoId}" registrada na venda ID ${saleRecord.id} (Status: ${saleRecord.status}, Fotógrafo ID: ${saleRecord.photographer_id})`);
                        if (saleRecord.photographer_id !== mauricio.id) {
                            console.log(`   🚨 ATENÇÃO: O photographer_id na tabela sales (${saleRecord.photographer_id}) é diferente do ID do Mauricio (${mauricio.id})!`);
                            totalProblems++;
                        }
                    }
                }
            } else {
                // E se o checkout tiver fotos que NÃO estão no mauricioPhotoIds, mas pertencem a ele de verdade no Supabase (por exemplo, a foto mudou de ID ou o photographer_id na tabela photos está incorreto)?
                // Vamos inspecionar todas as fotos do checkout no Supabase para ver o fotógrafo delas
                for (const photoId of cartIds) {
                    const { data: photoData } = await supabase
                        .from('photos')
                        .select('id, title, photographer_id, price')
                        .eq('id', photoId)
                        .single();
                    
                    if (photoData && photoData.photographer_id === mauricio.id && !mauricioPhotoIds.has(photoId)) {
                        console.log(`\n⚠️ DISCREPÂNCIA: Foto "${photoData.title}" (${photoId}) no checkout pago ${checkout.id} pertence ao Mauricio, mas não estava no set inicial de fotos dele!`);
                        
                        const saleRecord = sales.find(s => s.billing_id === checkout.id && s.photo_id === photoId);
                        if (!saleRecord) {
                            console.log(`   ❌ E esta venda está FALTANDO na tabela sales!`);
                            totalProblems++;
                        } else {
                            console.log(`   ✅ Venda OK na tabela sales (Venda ID: ${saleRecord.id})`);
                        }
                    }
                }
            }
        }

        console.log(`\nDiagnóstico concluído. Total de inconsistências críticas encontradas: ${totalProblems}`);

    } catch (e) {
        console.error('Erro no diagnóstico:', e.message);
    }
}

diagnose();
