const { createClient } = require('@supabase/supabase-js');
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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: Credenciais do Supabase ausentes');
    process.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== Teste de Fluxo Completo de Sincronização Remota ===');
    const testEmail = 'daian_teste_email@fotoclic.com.br';
    const password = 'TestPassword123!';

    // 1. Criar ou Obter Usuário temporário no Supabase Auth
    console.log(`Verificando se o usuário ${testEmail} existe...`);
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    let user = usersList?.users?.find(u => u.email === testEmail);

    if (!user) {
        console.log('Criando usuário no Supabase Auth...');
        const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: password,
            email_confirm: true
        });
        if (createAuthError) {
            console.error('Erro ao criar usuário no Auth:', createAuthError.message);
            return;
        }
        user = newUser.user;
        console.log('Usuário criado no Auth com ID:', user.id);
    } else {
        console.log('Usuário existente encontrado no Auth com ID:', user.id);
    }

    // Garantir que o usuário existe na tabela public.users
    const { data: dbUser } = await supabaseAdmin.from('users').select('id').eq('id', user.id).maybeSingle();
    if (!dbUser) {
        console.log('Inserindo usuário na tabela public.users...');
        const { error: insError } = await supabaseAdmin.from('users').insert({
            id: user.id,
            name: 'Daian Teste Sincronizacao',
            email: testEmail,
            role: 'customer',
            is_active: true
        });
        if (insError) {
            console.error('Erro ao inserir na tabela public.users:', insError.message);
            return;
        }
    }

    // 2. Fazer login com o usuário para obter o token JWT
    console.log('Realizando login para obter token...');
    const { data: authData, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email: testEmail,
        password: password
    });

    if (loginError) {
        console.error('Erro ao fazer login:', loginError.message);
        return;
    }

    const accessToken = authData.session.access_token;
    console.log('Token JWT obtido.');

    // 3. Criar uma cobrança de teste PAID (ou PENDING que será curada se simulamos, mas para testar a sincronização
    // de órfãs, criamos como PAID direto no banco)
    const testBillingId = 'bill_test_remote_sync_daian';
    
    // Limpar dados anteriores de teste
    await supabaseAdmin.from('sales').delete().eq('billing_id', testBillingId);
    await supabaseAdmin.from('abacate_pay_billings').delete().eq('billing_id', testBillingId);

    console.log('Criando cobrança de teste na tabela abacate_pay_billings...');
    const { error: billError } = await supabaseAdmin.from('abacate_pay_billings').insert({
        billing_id: testBillingId,
        status: 'PAID',
        customer_email: testEmail,
        amount: 100, // R$ 1.00
        payment_method: 'PIX',
        metadata: {
            userId: user.id,
            cartIds: [
                'b8b0ead7-9347-4942-aa2e-e71db61d8a58' // Foto válida
            ],
            termsAccepted: true
        }
    });

    if (billError) {
        console.error('Erro ao criar cobrança de teste:', billError.message);
        return;
    }
    console.log('Cobrança de teste criada com status PAID.');

    // 4. Chamar o endpoint sync-purchases remoto na Vercel
    const url = 'https://www.fotoclic.com.br/api/sync-purchases';
    console.log(`Fazendo POST remoto para ${url}...`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('Resposta Status:', res.status);
        let bodyText = '';
        try {
            const data = await res.json();
            bodyText = JSON.stringify(data, null, 2);
        } catch {
            bodyText = await res.text();
        }
        console.log('Resposta Corpo:', bodyText);
    } catch (e) {
        console.error('Erro na requisição para a Vercel:', e);
    }

    // 5. Verificar se a venda foi criada no banco de dados remoto pela Vercel!
    console.log('\nVerificando se a venda foi gerada na tabela sales no Supabase...');
    const { data: sales } = await supabaseAdmin.from('sales').select('*').eq('billing_id', testBillingId);
    if (sales && sales.length > 0) {
        console.log('SUCESSO! A venda foi criada na tabela sales pela Vercel em produção!');
        console.log('Venda:', JSON.stringify(sales[0], null, 2));
    } else {
        console.log('FALHA. Nenhuma venda foi criada na tabela sales.');
    }

    // 6. Verificar se os logs de email foram gravados no metadado da cobrança pela Vercel!
    const { data: billRecord } = await supabaseAdmin.from('abacate_pay_billings').select('metadata').eq('billing_id', testBillingId).single();
    console.log('Metadata final da cobrança:', JSON.stringify(billRecord?.metadata, null, 2));

    // Limpeza de teste
    await supabaseAdmin.from('sales').delete().eq('billing_id', testBillingId);
    await supabaseAdmin.from('abacate_pay_billings').delete().eq('billing_id', testBillingId);
    console.log('\nLimpeza de teste concluída.');
}

run();
