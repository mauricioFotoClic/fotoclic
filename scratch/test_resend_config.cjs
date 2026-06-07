require('dotenv').config({ path: '.env.local' });

async function test() {
    const apiKey = process.env.RESEND_API_KEY;
    const siteUrl = process.env.VITE_SITE_URL;
    
    console.log('=== Verificando Configuração do Resend ===');
    console.log('RESEND_API_KEY configurada?', apiKey ? 'SIM (Começa com: ' + apiKey.substring(0, 7) + '...)' : 'NÃO');
    console.log('VITE_SITE_URL:', siteUrl);

    if (!apiKey) {
        console.error('Erro: RESEND_API_KEY não está definida no .env.local');
        return;
    }

    try {
        console.log('\nTestando chamada direta de envio de email para a API do Resend...');
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                to: 'daian.cliente@gmail.com', // Email temporário de teste
                subject: 'Teste de Envio FotoClic',
                html: '<p>Este é um email de teste para verificar se as credenciais do Resend estão funcionando.</p>'
            }),
        });

        const data = await res.json();
        console.log('Resposta do Resend status:', res.status);
        console.log('Resposta do Resend corpo:', JSON.stringify(data, null, 2));

        if (!res.ok) {
            console.error('O Resend retornou um erro!');
        } else {
            console.log('Sucesso! O email foi aceito pelo Resend (ID: ' + data.id + ')');
        }
    } catch (err) {
        console.error('Erro na requisição ao Resend:', err);
    }
}

test();
