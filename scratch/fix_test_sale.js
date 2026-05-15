import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixSale() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Encontrar a venda de R$ 2,00 que está com comissão errada
    const { data: sales, error: fetchError } = await supabase
        .from('sales')
        .select('*')
        .eq('price', 2)
        .eq('commission', 0.30);

    if (fetchError) {
        console.error('Erro ao buscar venda:', fetchError);
        return;
    }

    if (!sales || sales.length === 0) {
        console.log('Nenhuma venda de R$ 2,00 com comissão de R$ 0,30 encontrada.');
        return;
    }

    console.log(`Encontrada(s) ${sales.length} venda(s) para corrigir.`);

    for (const sale of sales) {
        const { error: updateError } = await supabase
            .from('sales')
            .update({ 
                commission: 0.12, 
                commission_rate: 0.06 
            })
            .eq('id', sale.id);

        if (updateError) {
            console.error(`Erro ao atualizar venda ${sale.id}:`, updateError);
        } else {
            console.log(`Venda ${sale.id} atualizada com sucesso para 6% (R$ 0,12).`);
        }
    }
}

fixSale();
