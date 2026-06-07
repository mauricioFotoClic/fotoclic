const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val
    
    console.log(`--- Buscando photographer_wallet_summary para ${photographerId} ---`);
    const { data, error } = await supabase
        .from('photographer_wallet_summary')
        .select('*')
        .eq('photographer_id', photographerId)
        .maybeSingle();

    if (error) {
        console.error('Erro:', error);
    } else if (data) {
        console.log('Wallet Summary:', JSON.stringify(data, null, 2));
    } else {
        console.log('Nenhum registro encontrado na view photographer_wallet_summary.');
    }

    console.log(`\n--- Buscando dados brutos na tabela photographer_wallets (se existir) ---`);
    const { data: rawWallet, error: rwError } = await supabase
        .from('photographer_wallets')
        .select('*')
        .eq('photographer_id', photographerId)
        .maybeSingle();

    if (rwError) {
        console.error('Erro ao buscar photographer_wallets:', rwError);
    } else if (rawWallet) {
        console.log('Raw Wallet:', JSON.stringify(rawWallet, null, 2));
    } else {
        console.log('Nenhum registro encontrado em photographer_wallets.');
    }
}

run();
