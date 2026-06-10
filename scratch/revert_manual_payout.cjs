const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_PAYOUT_ID = 'd9ece8db-8d04-49b8-8215-b4e1ced21d3d';
const PHOTOGRAPHER_ID = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val

async function main() {
  console.log(`=== Desfazendo Payout Manual ID: ${TARGET_PAYOUT_ID} ===`);

  // 1. Desvincular vendas
  console.log('1. Desvinculando vendas associadas a este payout...');
  const { data: updatedSales, error: salesError } = await supabase
    .from('sales')
    .update({ payout_id: null })
    .eq('payout_id', TARGET_PAYOUT_ID)
    .select();

  if (salesError) {
    console.error('Erro ao atualizar vendas:', salesError);
    return;
  }

  console.log(`Vendas desvinculadas com sucesso: ${updatedSales.length} registro(s).`);

  // 2. Excluir o registro de payout
  console.log('2. Excluindo o registro de payout da tabela payouts...');
  const { data: deletedPayout, error: payoutError } = await supabase
    .from('payouts')
    .delete()
    .eq('id', TARGET_PAYOUT_ID)
    .select();

  if (payoutError) {
    console.error('Erro ao excluir payout:', payoutError);
    return;
  }

  console.log('Payout excluído com sucesso:', deletedPayout);

  // 3. Verificar o novo saldo do fotógrafo
  console.log('\n3. Verificando o novo saldo disponível de Mauricio Val...');
  const { data: wallet, error: walletError } = await supabase
    .from('photographer_wallet_summary')
    .select('*')
    .eq('photographer_id', PHOTOGRAPHER_ID)
    .single();

  if (walletError) {
    console.error('Erro ao buscar resumo da carteira:', walletError);
    return;
  }

  console.log('Resumo da Carteira Atualizado:');
  console.log(`- Nome: ${wallet.photographer_name}`);
  console.log(`- Saldo Disponível para Saque: R$ ${wallet.balance_available}`);
  console.log(`- Total já Sacado: R$ ${wallet.total_withdrawn}`);
}

main();
