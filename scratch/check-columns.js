import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkTableColumns() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'abacate_pay_billings' });
    
    if (error) {
        // Fallback: tentar um select limit 0 e ver o erro ou as chaves
        const { data: selectData, error: selectError } = await supabase.from('abacate_pay_billings').select('*').limit(1);
        if (selectError) {
             console.error('Erro ao listar:', selectError);
        } else {
             console.log('Colunas encontradas:', Object.keys(selectData[0] || {}));
        }
    } else {
        console.log('Colunas:', data);
    }
}

checkTableColumns();
