const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== Buscando Erros de Webhook Registrados no Banco ===');
    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('billing_id, status, metadata')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    billings.forEach(b => {
        let metadata = b.metadata;
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        console.log(`Billing ID: ${b.billing_id} | Status: ${b.status}`);
        if (metadata && metadata.webhook_error) {
            console.log(`  🔴 Webhook Error: ${metadata.webhook_error}`);
            console.log(`  - Ocorrido em: ${metadata.error_at}`);
        } else if (metadata && metadata.email_logs) {
            console.log(`  ✅ Email Logs:`, JSON.stringify(metadata.email_logs, null, 2));
        } else {
            console.log(`  - Sem logs de erro ou de email no metadata.`);
        }
        console.log('--------------------------------------------------');
    });
}

run();
