import handler from '../api/sync-purchases.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// We want to test the sync-purchases handler but mock the auth check.
// Let's create a proxy for supabase client in the handler, or we can just mock `supabase.auth.getUser`
// Since handler imports createClient and creates a supabase client inside it, we can temporarily mock it
// or we can just mock the headers to bypass or override supabase.auth.getUser.
// Actually, let's look at api/sync-purchases.js:
// const { data: { user }, error: authError } = await supabase.auth.getUser(token);
// If we intercept that, or we can just run the sync logic in our own test script with Felipe's user object!

async function testSyncLogic() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const user = {
        id: '00fcaeec-35e2-46ae-8d1e-6c3c12280460',
        email: 'felipevalgames@gmail.com'
    };

    console.log("Running simulated sync-purchases for user felipevalgames...");

    // 1. Pending billings
    const { data: pendingBillings } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PENDING')
        .or(`metadata->>userId.eq.${user.id},customer_email.eq.${user.email}`);

    console.log("Pending billings matched:", pendingBillings?.length);

    // 2. Paid billings
    const { data: billings, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PAID')
        .or(`metadata->>userId.eq.${user.id},customer_email.eq.${user.email}`);

    if (bError) {
        console.error("bError:", bError);
        return;
    }
    console.log("Paid billings matched:", billings?.length);

    // 3. Existing sales
    const { data: existingSales, error: sError } = await supabase
        .from('sales')
        .select('billing_id')
        .eq('buyer_id', user.id);

    if (sError) {
        console.error("sError:", sError);
        return;
    }
    console.log("Existing sales count:", existingSales?.length);

    const saleBillingIds = new Set(existingSales.map(s => s.billing_id));
    const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));
    console.log("Orphans count:", orphans.length);
}

testSyncLogic();
