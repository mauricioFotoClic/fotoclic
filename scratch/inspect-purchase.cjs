const { createClient } = require('@supabase/supabase-js');
// Carrega as variáveis de ambiente manualmente já que dotenv não é estritamente necessário se passarmos a config ou lermos de process.env
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
                // remove quotes if present
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
    console.log('--- Buscando Billings Recentes ---');
    const { data: billings, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (bError) {
        console.error('Erro ao buscar billings:', bError);
        return;
    }

    billings.forEach(b => {
        console.log(`ID: ${b.billing_id} | Status: ${b.status} | Email: ${b.customer_email} | Criado em: ${b.created_at}`);
        console.log('Metadata:', JSON.stringify(b.metadata));
        console.log('--------------------------------------------------');
    });

    console.log('--- Buscando Vendas Recentes ---');
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false })
        .limit(5);

    if (sError) {
        console.error('Erro ao buscar vendas:', sError);
        return;
    }

    sales.forEach(s => {
        console.log(`Venda ID: ${s.id} | Foto ID: ${s.photo_id} | Comprador: ${s.buyer_name} (${s.buyer_id}) | Data: ${s.sale_date} | Billing ID: ${s.billing_id}`);
    });
}

run();
