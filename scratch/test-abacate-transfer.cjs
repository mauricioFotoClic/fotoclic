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

const abacateKey = process.env.ABACATEPAY_API_KEY;

async function test() {
    console.log('Testando transferência Pix via AbacatePay...');
    console.log('Chave API utilizada (começo):', abacateKey ? abacateKey.substring(0, 15) + '...' : 'nula');
    
    const grossAmount = 101.61;
    const PAYOUT_FEE = 0.80;
    const netAmount = Math.max(0, grossAmount - PAYOUT_FEE);
    const amountInCents = Math.round(netAmount * 100);

    const payload = {
        amount: amountInCents,
        externalId: `payout_test_${Date.now()}`,
        description: `FotoClic - Teste de Saque`,
        pix: {
            key: '21992580137',
            type: 'PHONE'
        }
    };

    console.log('Payload enviado:', JSON.stringify(payload, null, 2));

    try {
        const res = await fetch('https://api.abacatepay.com/v2/pix/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${abacateKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log('Status HTTP:', res.status);
        console.log('Resposta Bruta:', text);
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
}

test();
