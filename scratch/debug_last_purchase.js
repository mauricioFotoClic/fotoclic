import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugPurchase() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Buscando Usuário ---');
    const { data: user } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', 'daiancash@gmail.com')
        .single();
    
    if (!user) {
        console.error('Usuário não encontrado');
        return;
    }
    console.log(`ID do Usuário: ${user.id}`);

    console.log('\n--- Últimas Cobranças (Abacate Pay) ---');
    const { data: billings } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    billings?.forEach(b => {
        console.log(`ID: ${b.billing_id} | Status: ${b.status} | Email: ${b.customer_email} | Metadados: ${JSON.stringify(b.metadata)}`);
    });

    console.log('\n--- Últimas Vendas Registradas ---');
    const { data: sales } = await supabase
        .from('sales')
        .select('*, photo:photos(title)')
        .eq('buyer_id', user.id)
        .order('sale_date', { ascending: false })
        .limit(5);
    
    sales?.forEach(s => {
        console.log(`Data: ${s.sale_date} | Foto: ${s.photo?.title} | Preço: ${s.price}`);
    });
}

debugPurchase();
