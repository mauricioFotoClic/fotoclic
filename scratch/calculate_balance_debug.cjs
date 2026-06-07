const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val

    console.log(`=== DETALHAMENTO DE VENDAS DO SUPABASE PARA MAURICIO ===`);
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('id, price, commission, status, sale_date, billing_id')
        .eq('photographer_id', photographerId);

    if (sError) {
        console.error('Erro ao buscar vendas:', sError);
        return;
    }

    console.log(`Total de registros de vendas: ${sales.length}`);
    
    let sumCompletedGross = 0;
    let sumCompletedCommission = 0;
    let sumCompletedNet = 0;
    
    let sumRefundedGross = 0;
    let sumRefundedCommission = 0;
    let sumRefundedNet = 0;

    sales.forEach(s => {
        const net = s.price - s.commission;
        if (s.status === 'completed') {
            sumCompletedGross += s.price;
            sumCompletedCommission += s.commission;
            sumCompletedNet += net;
        } else if (s.status === 'refunded') {
            sumRefundedGross += s.price;
            sumRefundedCommission += s.commission;
            sumRefundedNet += net;
        }
    });

    console.log(`Vendas com status 'completed':`);
    console.log(`  - Total Bruto (s.price): R$ ${sumCompletedGross.toFixed(2)}`);
    console.log(`  - Total Comissão: R$ ${sumCompletedCommission.toFixed(2)}`);
    console.log(`  - Total Líquido (s.price - s.commission): R$ ${sumCompletedNet.toFixed(2)}`);

    console.log(`Vendas com status 'refunded':`);
    console.log(`  - Total Bruto (s.price): R$ ${sumRefundedGross.toFixed(2)}`);
    console.log(`  - Total Comissão: R$ ${sumRefundedCommission.toFixed(2)}`);
    console.log(`  - Total Líquido (s.price - s.commission): R$ ${sumRefundedNet.toFixed(2)}`);

    console.log(`\n=== DETALHAMENTO DE SAQUES (PAYOUTS) PARA MAURICIO ===`);
    const { data: payouts, error: pError } = await supabase
        .from('payouts')
        .select('*')
        .eq('photographer_id', photographerId);

    if (pError) {
        console.error('Erro ao buscar saques:', pError);
        return;
    }

    console.log(`Total de registros de saques: ${payouts.length}`);
    if (payouts.length > 0) {
        console.log('Colunas de payouts:', Object.keys(payouts[0]));
    }
    
    let sumPaidPayouts = 0;
    payouts.forEach(p => {
        console.log(`- Saque ID: ${p.id} | Valor: R$ ${p.amount.toFixed(2)} | Status: ${p.status} | Data: ${p.created_date || p.date || 'N/A'}`);
        if (p.status === 'paid') {
            sumPaidPayouts += p.amount;
        }
    });

    console.log(`Total sacado (status = 'paid'): R$ ${sumPaidPayouts.toFixed(2)}`);

    console.log(`\n=== CÁLCULO DO SALDO DISPONÍVEL ===`);
    const calculatedAvailable = sumCompletedNet - sumRefundedNet - sumPaidPayouts;
    console.log(`Fórmula: (Vendas Completas Líquidas) - (Reembolsos Líquidos) - (Saques pagos)`);
    console.log(`Cálculo: R$ ${sumCompletedNet.toFixed(2)} - R$ ${sumRefundedNet.toFixed(2)} - R$ ${sumPaidPayouts.toFixed(2)}`);
    console.log(`Resultado calculado: R$ ${calculatedAvailable.toFixed(2)}`);
}

run();
