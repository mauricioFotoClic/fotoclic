const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Erro ao ler .env.local', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais do Supabase ausentes no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const billingId = 'bill_xarNnNx6aHpLdTnPKTFfS5ba';
    console.log(`=== Diagnóstico Avançado para: ${billingId} ===`);

    // 1. Obter billing
    const { data: billing } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .single();

    console.log('Dados da cobrança:', {
        id: billing.billing_id,
        status: billing.status,
        email: billing.customer_email,
        payment_method: billing.payment_method,
        created_at: billing.created_at,
        updated_at: billing.updated_at,
        metadata: billing.metadata
    });

    // 2. Obter compradores e fotógrafos do banco
    const userId = billing.metadata?.userId;
    if (userId) {
        const { data: buyer } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        console.log('\nComprador no Banco:', buyer ? { id: buyer.id, name: buyer.name, email: buyer.email } : 'NÃO ENCONTRADO');
    }

    const cartIds = billing.metadata?.cartIds || [];
    if (cartIds.length > 0) {
        const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
        console.log('\nFotos no carrinho:', photos.map(p => ({ id: p.id, title: p.title, photographer_id: p.photographer_id, price: p.price })));
        
        if (photos && photos.length > 0) {
            const photogId = photos[0].photographer_id;
            const { data: photog } = await supabase.from('users').select('*').eq('id', photogId).maybeSingle();
            console.log('Fotógrafo da foto no Banco:', photog ? { id: photog.id, name: photog.name, email: photog.email } : 'NÃO ENCONTRADO');
        }
    }

    // 3. Verificar se existe algum log ou erro no Supabase
    // Buscar se a sincronização chegou a falhar em algum log na tabela de logs (se houver) ou se há outras tabelas de log
    console.log('\nVerificando se existem vendas com esse billing_id de alguma forma:');
    const { data: allSales } = await supabase.from('sales').select('*').eq('billing_id', billingId);
    console.log('Vendas encontradas com o ID de cobrança:', allSales);
}

run();
