const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const userId = '00fcaeec-35e2-46ae-8d1e-6c3c12280460';
    console.log(`--- Buscando Usuário ${userId} ---`);
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar usuário:', error);
    } else if (user) {
        console.log('Usuário encontrado:', JSON.stringify(user, null, 2));
    } else {
        console.log('Usuário não encontrado na tabela users.');
    }
}

run();
