
import { supabase } from '../services/supabaseClient';

async function clearSales() {
    console.log('Iniciando limpeza de vendas...');
    const { data, error, count } = await supabase
        .from('sales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
        console.error('Erro ao deletar vendas:', error);
    } else {
        console.log('Vendas deletadas com sucesso!');
    }
}

clearSales();
