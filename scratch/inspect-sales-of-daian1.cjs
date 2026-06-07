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
    const userId = 'b6d1ea29-a2ab-4bca-9336-1e735812d49d'; // daiancash1@gmail.com
    console.log(`=== Inspecionando Vendas para o Usuário daiancash1@gmail.com (ID: ${userId}) ===`);

    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('buyer_id', userId)
        .order('sale_date', { ascending: false });

    if (error) {
        console.error('Erro ao buscar vendas:', error);
        return;
    }

    console.log(`Encontradas ${sales.length} vendas para daiancash1@gmail.com:`);
    sales.forEach(s => {
        console.log(`- Venda ID: ${s.id} | Foto ID: ${s.photo_id} | Preço: ${s.price} | Data: ${s.sale_date} | Billing ID: ${s.billing_id}`);
    });
}

run();
