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
    console.log(`=== Inspecionando Vendas e Usuários para a Cobrança: ${billingId} ===`);
    
    // 1. Buscar a cobrança
    const { data: billing } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .maybeSingle();

    if (!billing) {
        console.log('Cobrança não encontrada.');
        return;
    }

    console.log('Dados da Cobrança:');
    console.log('Status:', billing.status);
    console.log('Email Cliente:', billing.customer_email);
    console.log('Metadata:', JSON.stringify(billing.metadata, null, 2));

    // 2. Buscar vendas associadas a esse billing_id
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('*')
        .eq('billing_id', billingId);

    if (sError) {
        console.error('Erro ao buscar vendas:', sError);
    } else {
        console.log(`\nQuantidade de vendas encontradas: ${sales.length}`);
        sales.forEach(s => {
            console.log(`- Venda ID: ${s.id} | Foto ID: ${s.photo_id} | Comprador ID: ${s.buyer_id} | Preço: ${s.price} | Comissão: ${s.commission} | Fotógrafo ID: ${s.photographer_id}`);
        });
    }

    // 3. Buscar se o usuário correspondente ao metadata.userId existe
    const userId = billing.metadata?.userId;
    if (userId) {
        const { data: user } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('id', userId)
            .maybeSingle();
        console.log(`\nUsuário do Metadata (ID: ${userId}):`, user ? `${user.name} (${user.email}) - Role: ${user.role}` : 'NÃO ENCONTRADO na tabela users');
    }
}

run();
