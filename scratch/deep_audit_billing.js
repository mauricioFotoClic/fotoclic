import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function deepAudit() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const billingId = 'bill_dQPwMsc2qZKzD6dSMjZ0jCu4';

    console.log(`--- Auditoria da Cobrança: ${billingId} ---`);
    
    // 1. Verificar Billing
    const { data: billing, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .maybeSingle();
    
    if (bError) console.error('Erro ao buscar billing:', bError);
    if (!billing) {
        console.error('Registro de cobrança NÃO encontrado no banco!');
    } else {
        console.log('Status no Banco:', billing.status);
        console.log('Email do Cliente:', billing.customer_email);
        console.log('Metadados:', JSON.stringify(billing.metadata, null, 2));
        
        const userId = billing.metadata?.userId;
        const cartIds = billing.metadata?.cartIds || [];

        // 2. Verificar se o usuário existe
        if (userId) {
            const { data: user } = await supabase.from('users').select('email, name').eq('id', userId).maybeSingle();
            console.log(`Usuário vinculado: ${user?.name} (${user?.email})`);
        }

        // 3. Verificar Vendas
        console.log('\n--- Verificando Vendas para esta transação ---');
        for (const photoId of cartIds) {
            const { data: sale } = await supabase
                .from('sales')
                .select('id, sale_date, buyer_id')
                .eq('photo_id', photoId)
                .eq('buyer_id', userId)
                .maybeSingle();
            
            if (sale) {
                console.log(`✅ Venda encontrada para Foto ID ${photoId}: Sale ID ${sale.id} em ${sale.sale_date}`);
            } else {
                console.log(`❌ Venda NÃO encontrada para Foto ID ${photoId} e Usuário ${userId}`);
            }
        }
    }
}

deepAudit();
