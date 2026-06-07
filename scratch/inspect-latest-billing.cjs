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
    console.log('=== Buscando as 3 Cobranças mais recentes no Supabase ===');
    
    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    if (!billings || billings.length === 0) {
        console.log('Nenhuma cobrança encontrada.');
        return;
    }

    billings.forEach((b, index) => {
        console.log(`\n--- [${index + 1}] Cobrança ID: ${b.billing_id} ---`);
        console.log('Status:', b.status);
        console.log('Email Cliente:', b.customer_email);
        console.log('Método Pagamento:', b.payment_method);
        console.log('Criado em:', b.created_at);
        console.log('Atualizado em:', b.updated_at);
        console.log('Metadata completo:', JSON.stringify(b.metadata, null, 2));
    });
}

run();
