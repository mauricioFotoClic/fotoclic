const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const billingId = 'bill_nXcsh3shmSJFSazTbwC4wwCR';
    
    console.log(`--- Buscando email_logs da cobrança ${billingId} ---`);
    const { data: billing, error } = await supabase
        .from('abacate_pay_billings')
        .select('metadata')
        .eq('billing_id', billingId)
        .maybeSingle();

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (billing && billing.metadata) {
        let metadata = billing.metadata;
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        console.log('Metadata Completo:', JSON.stringify(metadata, null, 2));
    } else {
        console.log('Cobrança não encontrada ou metadata vazio.');
    }
}

run();
