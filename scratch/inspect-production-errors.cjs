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
    console.log('=== Buscando cobranças com erros ou logs em produção ===');
    
    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    let logsEncontrados = 0;
    billings.forEach(b => {
        const metadata = b.metadata;
        if (metadata && metadata.email_logs) {
            logsEncontrados++;
            console.log(`\nCobrança ID: ${b.billing_id}`);
            console.log(`Status: ${b.status} | Email: ${b.customer_email}`);
            console.log(`Logs de Email gravados em: ${metadata.email_logs.email_dispatched_at}`);
            console.log('Logs de Envio:', JSON.stringify(metadata.email_logs, null, 2));
        }
    });

    if (logsEncontrados === 0) {
        console.log('Nenhuma cobrança com logs de e-mail no metadado foi encontrada.');
    }
}

run();
