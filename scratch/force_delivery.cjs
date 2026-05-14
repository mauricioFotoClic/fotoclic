const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cnJ3aHVsZXRza251ampmZHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIxMDg1NywiZXhwIjoyMDc5Nzg2ODU3fQ.viUIfwjlwRY6w4bth8ocT2CP_fmBEP9UqywbrNeJsnk';
const supabase = createClient(supabaseUrl, supabaseKey);

const BILLING_ID = 'bill_0j2cujyqHUZzcCXWBsgbDHJA'; // Sua cobrança de R$ 2,00

async function forceDelivery() {
    console.log(`Iniciando liberação manual para a cobrança: ${BILLING_ID}`);
    
    // 1. Buscar a cobrança e o usuário
    const { data: billing, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', BILLING_ID)
        .single();
    
    if (bError || !billing) {
        console.error('Cobrança não encontrada:', bError);
        return;
    }

    const { data: user, error: uError } = await supabase
        .from('users')
        .select('id')
        .eq('email', billing.customer_email)
        .single();

    if (uError || !user) {
        console.error('Usuário comprador não encontrado no banco. Tentando criar...');
        // Omitido criação por segurança, mas o usuário deveria existir se ele logou
        return;
    }

    console.log(`Usuário encontrado: ${user.id} (${billing.customer_email})`);

    // 2. Atualizar status da cobrança
    await supabase
        .from('abacate_pay_billings')
        .update({ status: 'PAID' })
        .eq('billing_id', BILLING_ID);

    // 3. Criar as vendas (liberar fotos)
    const cartIds = billing.metadata.cartIds || [];
    if (cartIds.length === 0) {
        console.error('Nenhuma foto encontrada no carrinho desta cobrança.');
        return;
    }

    for (const photoId of cartIds) {
        const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).single();
        if (photo) {
            const commission = photo.price * 0.15; // Taxa padrão
            await supabase.from('sales').insert({
                photo_id: photo.id,
                buyer_id: user.id,
                buyer_name: billing.customer_name,
                price: photo.price,
                commission: commission,
                photographer_id: photo.photographer_id,
                commission_rate: 0.15,
                sale_date: new Date().toISOString(),
                billing_id: BILLING_ID
            });
            console.log(`Foto "${photo.title}" liberada com sucesso!`);
        }
    }

    console.log('\n--- PROCESSO CONCLUÍDO ---');
    console.log('Peça para o cliente atualizar a página "Minhas Compras".');
}

forceDelivery();
