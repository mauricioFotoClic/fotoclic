import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkWebhookErrors() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .select('*');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    const errors = data.filter(b => b.metadata?.webhookError);
    console.log('Cobranças com erro de webhook:', errors.length);
    errors.forEach(e => {
        console.log(`Billing ID: ${e.billing_id}, Error: ${e.metadata.webhookError}`);
    });
}

checkWebhookErrors();
