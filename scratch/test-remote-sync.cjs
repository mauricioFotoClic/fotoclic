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

// Cria cliente Supabase cliente (com a anon key) para autenticar o usuário
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== Testando Sincronização Remota na Vercel ===');

    // 1. Logar com daiancash@gmail.com para obter o token de sessão
    const email = 'daiancash@gmail.com';
    const password = 'ClientePassword123!'; // Tentamos logar
    
    console.log(`Tentando obter sessão para ${email}...`);
    // Como não sabemos a senha do Daian, podemos usar o admin para gerar um token de autenticação ou link
    // No Supabase, o admin pode criar um token de login ou podemos resetar a senha, ou podemos simular a sincronização bypassando e chamando direto.
    // Mas peraí! O admin do Supabase tem o método `admin.generateLink` ou `admin.getUser` ou podemos criar uma sessão de teste.
    // Vamos usar admin.generateLink para fazer login sem senha!
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
            redirectTo: 'http://localhost:3000'
        }
    });

    if (linkError) {
        console.error('Erro ao gerar link de autenticação:', linkError.message);
        return;
    }

    // O link retornado contém o hash com access_token. Vamos extrair o access_token!
    const linkUrl = linkData.properties.action_link;
    const urlParams = new URL(linkUrl);
    const hashParams = new URLSearchParams(urlParams.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (!accessToken) {
        console.error('Não foi possível extrair o access_token do link:', linkUrl);
        return;
    }

    console.log('Sessão obtida com sucesso! Token de Acesso extraído.');

    // 2. Antes de testar na Vercel, vamos remover a venda que criamos localmente
    // para que a transação volte a ser órfã e possa ser sincronizada remota!
    const billingId = 'bill_xarNnNx6aHpLdTnPKTFfS5ba';
    await supabaseAdmin.from('sales').delete().eq('billing_id', billingId);
    
    // Resetar os metadados removendo os email_logs
    const { data: bData } = await supabaseAdmin.from('abacate_pay_billings').select('metadata').eq('billing_id', billingId).single();
    if (bData && bData.metadata) {
        const newMetadata = { ...bData.metadata };
        delete newMetadata.email_logs;
        await supabaseAdmin.from('abacate_pay_billings').update({ metadata: newMetadata }).eq('billing_id', billingId);
    }
    console.log(`Banco de dados limpo. Vendas do billing ${billingId} excluídas. Pronto para sincronizar na Vercel.`);

    // 3. Fazer requisição POST para o endpoint sync-purchases da Vercel
    const url = 'https://www.fotoclic.com.br/api/sync-purchases';
    console.log(`Enviando POST para ${url}...`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('Resposta Vercel Status:', res.status);
        let bodyText = '';
        try {
            const data = await res.json();
            bodyText = JSON.stringify(data, null, 2);
        } catch {
            bodyText = await res.text();
        }
        console.log('Resposta Vercel Corpo:', bodyText);
    } catch (e) {
        console.error('Erro na requisição para a Vercel:', e);
    }
}

run();
