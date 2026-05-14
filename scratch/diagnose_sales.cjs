const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cnJ3aHVsZXRza251ampmZHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIxMDg1NywiZXhwIjoyMDc5Nzg2ODU3fQ.viUIfwjlwRY6w4bth8ocT2CP_fmBEP9UqywbrNeJsnk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE VENDAS ---');
    
    // 1. Verificar últimas cobranças
    const { data: billings, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
    
    if (bError) console.error('Erro ao buscar billings:', bError);
    else {
        console.log('\nÚltimas Cobranças (AbacatePay):');
        billings.forEach(b => {
            console.log(`- ID: ${b.billing_id} | Status: ${b.status} | Email: ${b.customer_email} | Data: ${b.created_at}`);
        });
    }

    // 2. Verificar últimas vendas
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('*, photos(title)')
        .order('sale_date', { ascending: false })
        .limit(3);
    
    if (sError) console.error('Erro ao buscar vendas:', sError);
    else {
        console.log('\nÚltimas Vendas (Sales):');
        sales.forEach(s => {
            console.log(`- ID: ${s.id} | Comprador ID: ${s.buyer_id} | Foto: ${s.photos?.title} | Status: ${s.status}`);
        });
    }

    // 3. Verificar usuários recentes (para ver se criou conta nova)
    const { data: users, error: uError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
    if (uError) console.error('Erro ao buscar usuários:', uError);
    else {
        console.log('\nUsuários Criados Recentemente:');
        users.forEach(u => {
            console.log(`- ID: ${u.id} | Email: ${u.email} | Nome: ${u.name}`);
        });
    }
}

diagnose();
