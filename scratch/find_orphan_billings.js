import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findOrphanBillings() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: billings, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PAID');

    if (bError) throw bError;

    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('billing_id');

    if (sError) throw sError;

    const saleBillingIds = new Set(sales.map(s => s.billing_id));
    
    const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));
    
    console.log('Cobranças pagas SEM registro de venda:', orphans.length);
    orphans.forEach(o => {
        console.log(`- Billing ID: ${o.billing_id}, Amount: ${o.amount}, Date: ${o.created_at}`);
    });
}

findOrphanBillings();
