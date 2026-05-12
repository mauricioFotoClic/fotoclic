
import { supabase } from '../services/supabaseClient';

async function listSales() {
    const { data, error } = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sales:', JSON.stringify(data, null, 2));
    }
}

listSales();
