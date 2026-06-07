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

async function checkMarcia() {
    try {
        console.log('=== Análise de Fotos da Marcia M Feitosa ===');

        const { data: marcia } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'marcia@fvimagem.com')
            .single();

        if (!marcia) {
            console.log('Marcia M Feitosa não encontrada.');
            return;
        }

        console.log('Dados da Marcia:', {
            id: marcia.id,
            name: marcia.name,
            email: marcia.email
        });

        // 1. Fotos cadastradas dela
        const { data: photos, error: pError } = await supabase
            .from('photos')
            .select('id, title, price, moderation_status')
            .eq('photographer_id', marcia.id);

        if (pError) throw pError;
        console.log(`Total de fotos da Marcia no banco: ${photos?.length || 0}`);

        // 2. Vendas da Marcia
        const { data: sales, error: sError } = await supabase
            .from('sales')
            .select('*')
            .eq('photographer_id', marcia.id);

        if (sError) throw sError;
        console.log(`Total de vendas da Marcia no banco: ${sales?.length || 0}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkMarcia();
