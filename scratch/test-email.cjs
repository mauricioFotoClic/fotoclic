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

const locawebToken = process.env.LOCAWEB_SMTP_TOKEN;

if (!locawebToken) {
    console.error('LOCAWEB_SMTP_TOKEN não configurada no .env.local');
    process.exit(1);
}

async function test() {
    console.log('Testando envio de e-mail via SMTP Locaweb REST API...');
    try {
        const res = await fetch('https://api.smtplw.com.br/v1/messages', {
            method: 'POST',
            headers: {
                'x-auth-token': locawebToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'nao-responda@email.fotoclic.com.br', // Subdomínio autenticado SPF/DKIM/DMARC
                to: ['svalmauricio@gmail.com'], // E-mail de teste
                subject: 'Teste de Envio - SMTP Locaweb REST API',
                body: '<p>Este é um e-mail de teste para verificar se o token e as credenciais do SMTP Locaweb estão funcionando perfeitamente no FotoClic.</p>',
            }),
        });

        const textResponse = await res.text();
        console.log('Status HTTP:', res.status);
        console.log('Resposta da API:', textResponse);
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
}

test();
