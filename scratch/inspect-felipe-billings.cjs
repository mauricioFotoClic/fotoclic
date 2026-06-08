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
    console.error('Erro: Credenciais do Supabase ausentes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const email = 'felipevalgames@gmail.com';
    console.log(`=== Buscando Cobranças no Supabase para ${email} ===`);

    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    console.log(`Encontradas ${billings.length} cobranças no banco:`);
    billings.forEach(b => {
        console.log(`- ID: ${b.billing_id} | Status: ${b.status} | Valor: ${b.amount / 100} | Criado em: ${b.created_at}`);
        console.log('  Metadata:', JSON.stringify(b.metadata));
    });

    console.log('\n=== Verificando se existem vendas registradas para o Felipe de hoje ===');
    const felipeId = '00fcaeec-35e2-46ae-8d1e-6c3c12280460';
    const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('buyer_id', felipeId)
        .order('sale_date', { ascending: false });

    console.log(`Encontradas ${sales ? sales.length : 0} vendas.`);
    sales?.forEach(s => {
        console.log(`- Venda ID: ${s.id} | Foto ID: ${s.photo_id} | Preço: ${s.price} | Data: ${s.sale_date} | Billing ID: ${s.billing_id}`);
    });
}

run();
