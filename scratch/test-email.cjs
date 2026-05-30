// Utiliza o fetch global nativo do Node.js
const fs = require('fs');
const path = require('path');

// Ler o .env.local e jogar no process.env
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

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
    console.error('RESEND_API_KEY não configurada no .env.local');
    process.exit(1);
}

async function test() {
    console.log('Testando envio de e-mail via Resend...');
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                to: 'svalmauricio@gmail.com', // e-mail do admin que é verificado ou para fins de teste
                subject: 'Teste de Envio - Resend',
                html: '<p>Este é um e-mail de teste para verificar se a API do Resend está funcionando.</p>',
            }),
        });

        const data = await res.json();
        console.log('Status HTTP:', res.status);
        console.log('Resposta da API:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
}

test();
