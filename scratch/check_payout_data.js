import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPayoutData() {
  console.log('--- Buscando fotógrafos elegíveis para payout ---');
  try {
    // 1. Busca saldos elegíveis
    const { data: eligibleBalances, error: balanceError } = await supabase
      .from('photographer_wallet_summary')
      .select('*')
      .gte('balance_available', 100);

    if (balanceError) {
      console.error('Erro ao buscar saldos:', balanceError);
      return;
    }

    if (!eligibleBalances || eligibleBalances.length === 0) {
      console.log('Nenhum fotógrafo com saldo >= 100.');
      return;
    }

    const photographerIds = eligibleBalances.map(p => p.photographer_id);

    // 2. Busca dados de usuário/Pix
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, pix_key, pix_key_type, payout_frequency, payout_blocked, email')
      .in('id', photographerIds);

    if (usersError) {
      console.error('Erro ao buscar dados dos usuários:', usersError);
      return;
    }

    // Associa em memória
    const userMap = {};
    usersData.forEach(u => { userMap[u.id] = u; });

    const eligiblePhotographers = eligibleBalances.map(p => ({
      ...p,
      users: userMap[p.photographer_id] || null
    }));

    console.log('Número de fotógrafos elegíveis:', eligiblePhotographers.length);
    console.log('Dados detalhados:');
    console.log(JSON.stringify(eligiblePhotographers, null, 2));

    eligiblePhotographers.forEach(p => {
      console.log(`\nAnálise para fotógrafo: ${p.photographer_name}`);
      console.log(`- balance_available: ${p.balance_available}`);
      console.log(`- p.users:`, p.users);
      if (p.users) {
        const user = p.users;
        console.log(`- user.pix_key:`, user.pix_key);
        console.log(`- user.payout_blocked:`, user.payout_blocked);
        console.log(`- user.payout_frequency:`, user.payout_frequency);
      }
    });

  } catch (err) {
    console.error('Erro geral:', err);
  }
}

checkPayoutData();
