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
    console.log('=== Buscando Cobranças de Simulação Recentes no Supabase ===');
    
    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .ilike('billing_id', 'bill_sim_%')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    console.log(`Encontradas ${billings.length} cobranças de simulação:`);
    billings.forEach(b => {
        console.log(`- ID: ${b.billing_id} | Status: ${b.status} | Email: ${b.customer_email} | Atualizado em: ${b.updated_at}`);
        console.log('  Metadata:', JSON.stringify(b.metadata));
    });
}

run();
