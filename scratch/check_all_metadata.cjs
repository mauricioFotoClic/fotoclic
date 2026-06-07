const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== Verificando Todos os Registros de Cobrança ===');
    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('billing_id, status, metadata');

    if (error) {
        console.error('Erro ao buscar cobranças:', error);
        return;
    }

    console.log(`Total de cobranças no banco: ${billings.length}`);
    let withEmailLogs = 0;
    let withError = 0;
    let totalPaid = 0;

    billings.forEach(b => {
        let metadata = b.metadata;
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (b.status === 'PAID') totalPaid++;

        if (metadata) {
            if (metadata.email_logs) {
                withEmailLogs++;
                console.log(`- Cobrança ${b.billing_id} tem email_logs.`);
            }
            if (metadata.webhook_error) {
                withError++;
                console.log(`- Cobrança ${b.billing_id} tem webhook_error: ${metadata.webhook_error}`);
            }
        }
    });

    console.log(`\nResumo:`);
    console.log(`- Total de cobranças pagas (PAID): ${totalPaid}`);
    console.log(`- Cobranças com email_logs: ${withEmailLogs}`);
    console.log(`- Cobranças com webhook_error: ${withError}`);
}

run();
