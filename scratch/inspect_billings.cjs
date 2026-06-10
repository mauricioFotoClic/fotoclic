const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*');

    if (error) {
        console.error('Error fetching billings:', error);
        return;
    }

    console.log('Total billings count:', billings.length);
    const paid = billings.filter(b => b.status === 'PAID');
    console.log('Paid billings count:', paid.length);
    const totalPaid = paid.reduce((sum, b) => sum + b.amount, 0);
    console.log('Total paid amount:', totalPaid / 100);
}

run();
