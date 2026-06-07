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

const apiKey = process.env.ABACATEPAY_API_KEY;

async function checkDesync() {
    try {
        console.log('=== Verificação de Dessincronização de Webhook / API ===');

        // 1. Buscar checkouts na API do Abacate Pay
        console.log('Buscando checkouts no Abacate Pay...');
        const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const apiData = await apiRes.json();
        
        if (!apiData.success || !apiData.data) {
            console.error('Erro na API da Abacate Pay:', apiData.error);
            return;
        }

        const apiPaidCheckouts = apiData.data.filter(c => c.status === 'PAID');
        console.log(`API Abacate Pay: ${apiPaidCheckouts.length} checkouts pagos.`);

        // 2. Buscar cobranças no Supabase
        const { data: dbBillings, error: bErr } = await supabase
            .from('abacate_pay_billings')
            .select('*');

        if (bErr) throw bErr;
        console.log(`Supabase local: ${dbBillings?.length || 0} cobranças registradas.`);

        // 3. Comparar status e detectar divergências
        let desyncCount = 0;
        for (const remote of apiPaidCheckouts) {
            const local = dbBillings?.find(b => b.billing_id === remote.id);

            if (!local) {
                console.log(`\n🚨 DIVERGÊNCIA: Cobrança paga no Abacate Pay mas NÃO existe no Supabase!`);
                console.log(`- Checkout ID: ${remote.id}`);
                console.log(`- Cliente: ${remote.customer?.name} (${remote.customer?.email})`);
                console.log(`- Valor: R$ ${remote.amount/100}`);
                console.log(`- Data de Criação: ${remote.createdAt}`);
                console.log(`- Metadata:`, JSON.stringify(remote.metadata));
                desyncCount++;
            } else if (local.status !== 'PAID') {
                console.log(`\n🚨 DIVERGÊNCIA: Cobrança paga no Abacate Pay, mas no Supabase está como "${local.status}"!`);
                console.log(`- Checkout ID: ${remote.id}`);
                console.log(`- Cliente: ${remote.customer?.name} (${remote.customer?.email})`);
                console.log(`- Valor: R$ ${remote.amount/100}`);
                console.log(`- Data local: ${local.created_at}`);
                console.log(`- Metadata:`, JSON.stringify(remote.metadata));
                desyncCount++;
            }
        }

        console.log(`\nTotal de cobranças dessincronizadas encontradas: ${desyncCount}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkDesync();
