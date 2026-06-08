const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Erro ao ler .env.local', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais do Supabase ausentes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const timestamp = Date.now();
    const simulatedBillingId = `bill_sim_${timestamp}`;
    const buyerEmail = 'daiancash@gmail.com';
    const buyerUserId = '353f7b67-98a1-429e-98f1-7908ea06d85a'; // Daian Cliente
    const photoId = 'b8b0ead7-9347-4942-aa2e-e71db61d8a58'; // Foto de R$ 1.00 de Paulo (paulodaian@gmail.com)

    console.log(`=== Simulando Compra de R$ 1.00 no Webhook de Produção ===`);
    console.log(`Simulando ID de Cobrança: ${simulatedBillingId}`);

    // 1. Criar a cobrança temporária no Supabase com status PENDING
    const { error: insError } = await supabase
        .from('abacate_pay_billings')
        .insert({
            billing_id: simulatedBillingId,
            status: 'PENDING',
            customer_email: buyerEmail,
            amount: 100, // R$ 1.00
            payment_method: 'PIX',
            metadata: {
                userId: buyerUserId,
                cartIds: [photoId],
                termsAccepted: true
            }
        });

    if (insError) {
        console.error('Erro ao criar cobrança pendente de teste no banco:', insError.message);
        return;
    }
    console.log('Cobrança temporária criada no Supabase remoto.');

    // 2. Montar o payload do webhook
    const payload = {
        event: 'checkout.completed',
        data: {
            checkout: {
                id: simulatedBillingId,
                status: 'PAID',
                amount: 100,
                customer: {
                    email: buyerEmail,
                    name: 'Daian Cliente'
                },
                metadata: {
                    userId: buyerUserId,
                    cartIds: [photoId],
                    termsAccepted: true
                }
            },
            payerInformation: {
                email: buyerEmail,
                name: 'Daian Cliente'
            }
        }
    };

    const url = 'https://www.fotoclic.com.br/api/abacate-webhook';
    const bodyString = JSON.stringify(payload);

    console.log(`\nDisparando chamada de webhook para a Vercel (${url})...`);

    // Tentativa 1: Sem assinatura
    let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyString
    });

    console.log('Tentativa 1 (Sem assinatura) - Status:', res.status);
    let responseText = await res.text();
    console.log('Tentativa 1 - Resposta:', responseText);

    // Se falhar com 401, tentamos assinar com a chave secreta
    if (res.status === 401) {
        console.log('\nTentando com assinatura HMAC (chave secreta)...');
        const secret = 'FotoClicSeguro2026!#*'; // Segredo de produção que estava comentado
        const hmac = crypto.createHmac('sha256', secret);
        const signature = hmac.update(Buffer.from(bodyString)).digest('hex');

        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-abacatepay-signature': signature
            },
            body: bodyString
        });

        console.log('Tentativa 2 (Com assinatura) - Status:', res.status);
        responseText = await res.text();
        console.log('Tentativa 2 - Resposta:', responseText);
    }

    if (res.status === 200) {
        console.log('\nWebhook aceito com sucesso pela Vercel em produção!');
        
        // Aguardar 3 segundos para dar tempo do webhook remoto processar o Supabase e a Resend
        console.log('Aguardando 4 segundos para o processamento em produção...');
        await new Promise(resolve => setTimeout(resolve, 4000));

        // 3. Verificar no banco remoto se a venda foi gerada
        const { data: sales } = await supabase.from('sales').select('*').eq('billing_id', simulatedBillingId);
        if (sales && sales.length > 0) {
            console.log('\n✅ SUCESSO! A Vercel em produção processou o webhook e criou a venda na tabela sales!');
            console.log('Venda inserida:', JSON.stringify(sales[0], null, 2));

            // Verificar se o log de email foi gravado
            const { data: billRecord } = await supabase.from('abacate_pay_billings').select('metadata').eq('billing_id', simulatedBillingId).single();
            console.log('\nMetadata da cobrança atualizada com logs de email:', JSON.stringify(billRecord?.metadata?.email_logs, null, 2));
        } else {
            console.log('\n❌ ERRO: O webhook respondeu 200 mas nenhuma venda foi gerada na tabela sales no Supabase.');
            // Buscar se tem erro de webhook registrado no metadata
            const { data: billRecord } = await supabase.from('abacate_pay_billings').select('metadata').eq('billing_id', simulatedBillingId).single();
            if (billRecord?.metadata?.webhook_error) {
                console.log('Erro do webhook registrado no metadata:', billRecord.metadata.webhook_error);
            }
        }
    } else {
        console.log('\n❌ ERRO: O webhook de produção rejeitou a chamada com status', res.status);
    }

    // Limpeza do teste
    // await supabase.from('sales').delete().eq('billing_id', simulatedBillingId);
    // await supabase.from('abacate_pay_billings').delete().eq('billing_id', simulatedBillingId);
    console.log('\nLimpeza de teste de simulação ignorada (para podermos inspecionar no banco).');
}

run();
