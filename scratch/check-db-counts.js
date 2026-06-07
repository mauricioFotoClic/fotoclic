import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCounts() {
    try {
        console.log('=== Contagem de Linhas por Tabela ===');
        const tables = [
            'users', 
            'sales', 
            'photos', 
            'payouts', 
            'abacate_pay_billings', 
            'customers', 
            'system_settings',
            'face_encodings'
        ];

        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`Tabela "${table}": ERRO - ${error.message}`);
            } else {
                console.log(`Tabela "${table}": ${count} registros`);
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkCounts();
