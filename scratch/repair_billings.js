import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function repairBillings() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('--- Iniciando reparo de cobranças sem método ---');

    // 1. Buscar cobranças PAGAS que estão sem método
    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PAID')
        .or('payment_method.is.null,payment_method.eq.""');

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Nenhuma cobrança pendente de correção encontrada.');
        return;
    }

    console.log(`Encontradas ${data.length} cobranças para corrigir.`);

    for (const b of data) {
        console.log(`Corrigindo cobrança ${b.billing_id} (${b.customer_name}) -> Setando como PIX`);
        
        const { error: updateError } = await supabase
            .from('abacate_pay_billings')
            .update({ payment_method: 'PIX' })
            .eq('id', b.id);

        if (updateError) {
            console.error(`Erro ao atualizar ${b.id}:`, updateError);
        }
    }

    console.log('--- Reparo concluído ---');
}

repairBillings();
