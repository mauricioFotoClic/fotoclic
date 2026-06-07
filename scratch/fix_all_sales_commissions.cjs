const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        console.log('=== Iniciando Correção de Comissões e Taxas no Banco de Dados ===');

        // 1. Obter configurações globais e taxas customizadas
        const { data: settingsRow, error: settingsError } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw settingsError;

        const defaultRate = settingsRow?.commission_default_rate || 0.06;
        const customRates = settingsRow?.commission_custom_rates || {};
        const defaultVideoRate = settingsRow?.commission_video_default_rate !== undefined && settingsRow?.commission_video_default_rate !== null ? settingsRow.commission_video_default_rate : 0.10;

        console.log('Configurações carregadas:');
        console.log(`- Taxa padrão: ${defaultRate * 100}%`);
        console.log(`- Taxa de vídeo padrão: ${defaultVideoRate * 100}%`);
        console.log(`- Taxas customizadas:`, JSON.stringify(customRates));

        // 2. Buscar todas as cobranças pagas (PAID)
        const { data: billings, error: billingsError } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID');

        if (billingsError) throw billingsError;
        console.log(`\nTotal de cobranças pagas encontradas: ${billings.length}`);

        // 3. Buscar todas as fotos para saber o tipo de mídia (video/foto)
        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('id, media_type, photographer_id');
        
        if (photosError) throw photosError;
        const photoMap = new Map(photos.map(p => [p.id, p]));

        let totalUpdatedSales = 0;

        // 4. Processar cada cobrança e suas respectivas vendas
        for (const billing of billings) {
            const billingId = billing.billing_id;
            
            // Buscar vendas vinculadas a esta cobrança
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('billing_id', billingId);

            if (salesError) {
                console.error(`Erro ao buscar vendas da cobrança ${billingId}:`, salesError);
                continue;
            }

            if (!sales || sales.length === 0) {
                // Se não tiver vendas vinculadas por billing_id, pode ser uma venda legada sem esse vínculo. Pula.
                continue;
            }

            const totalPhotos = sales.length;
            const flatFeePerPhoto = 0.50 / totalPhotos; // Rateia a taxa de R$ 0,50 entre as fotos da transação

            console.log(`\nCobrança: ${billingId} | Valor: R$ ${billing.amount/100} | Total de Fotos: ${totalPhotos} | Taxa Rateada por Foto: R$ ${flatFeePerPhoto.toFixed(4)}`);

            for (const sale of sales) {
                const photo = photoMap.get(sale.photo_id);
                const isVideo = photo?.media_type === 'video';
                
                let rate;
                if (isVideo) {
                    rate = defaultVideoRate;
                } else {
                    const photogId = sale.photographer_id || photo?.photographer_id;
                    rate = customRates[photogId] !== undefined ? customRates[photogId] : defaultRate;
                }

                // Calcula o valor correto da comissão
                const newCommission = Math.min(sale.price, (sale.price * rate) + flatFeePerPhoto);
                
                // Arredonda para 4 casas decimais para evitar problemas de arredondamento no postgres
                const newCommissionRounded = Math.round(newCommission * 10000) / 10000;

                if (Math.abs(sale.commission - newCommissionRounded) > 0.001) {
                    console.log(`  * Corrigindo Venda ID ${sale.id}:`);
                    console.log(`    - Foto ID: ${sale.photo_id}`);
                    console.log(`    - Preço: R$ ${sale.price}`);
                    console.log(`    - Comissão Antiga: R$ ${sale.commission} | Nova: R$ ${newCommissionRounded}`);
                    console.log(`    - Taxa Aplicada: ${rate * 100}%`);

                    const { error: updateError } = await supabase
                        .from('sales')
                        .update({
                            commission: newCommissionRounded,
                            commission_rate: rate
                        })
                        .eq('id', sale.id);

                    if (updateError) {
                        console.error(`    ❌ Erro ao atualizar venda ${sale.id}:`, updateError);
                    } else {
                        totalUpdatedSales++;
                    }
                } else {
                    console.log(`  * Venda ID ${sale.id} já está correta (Comissão: R$ ${sale.commission}).`);
                }
            }
        }

        console.log(`\n=== Correção concluída! Total de vendas corrigidas no banco de dados: ${totalUpdatedSales} ===`);

    } catch (e) {
        console.error('Erro geral durante a execução:', e);
    }
}

run();
