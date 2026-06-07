const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler o .env.local e jogar no process.env
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
    const billingId = 'bill_nXcsh3shmSJFSazTbwC4wwCR';
    console.log(`=== Inspecionando Cobrança: ${billingId} ===`);
    
    const { data: billing, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar cobrança:', error);
        return;
    }

    if (!billing) {
        console.log('Cobrança não encontrada.');
        return;
    }

    console.log('ID:', billing.billing_id);
    console.log('Status:', billing.status);
    console.log('Método Pagamento:', billing.payment_method);
    console.log('Cliente Email:', billing.customer_email);
    console.log('Criado em:', billing.created_at);
    console.log('Atualizado em:', billing.updated_at);
    console.log('Metadata Completo:', JSON.stringify(billing.metadata, null, 2));

    console.log('\n=== Vendas Relacionadas ===');
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, photo_id, buyer_name, price, commission, photographer_id, sale_date')
        .eq('billing_id', billingId);

    if (salesError) {
        console.error('Erro ao buscar vendas:', salesError);
        return;
    }

    console.log(`Encontradas ${sales.length} vendas.`);
    sales.forEach(s => {
        console.log(`- Venda ID: ${s.id} | Foto: ${s.photo_id} | Preço: ${s.price} | Comissão: ${s.commission} | Fotógrafo ID: ${s.photographer_id}`);
    });
}

run();
