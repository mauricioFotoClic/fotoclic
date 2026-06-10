const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Buscando fotógrafo Maurício ---');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, email, pix_key, pix_key_type')
    .ilike('name', '%Mauricio%');

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
    return;
  }

  console.log('Usuários encontrados:', users);

  if (users.length === 0) {
    console.log('Nenhum fotógrafo com o nome Mauricio encontrado.');
    return;
  }

  const photographerId = users[0].id;

  console.log(`\n--- Buscando saques recentes do fotógrafo ID: ${photographerId} ---`);
  const { data: payouts, error: payoutError } = await supabase
    .from('payouts')
    .select('*')
    .eq('photographer_id', photographerId)
    .order('request_date', { ascending: false });

  if (payoutError) {
    console.error('Erro ao buscar saques:', payoutError);
    return;
  }

  console.log('Saques encontrados:', payouts);
}

main();
