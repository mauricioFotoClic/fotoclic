import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;
console.log('Chave API utilizada:', apiKey);

async function testEndpoint(url, name) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json().catch(() => null);
        
        let display = '(Sem JSON)';
        if (data) {
            // Se for muito grande, mostra apenas chaves
            if (name === 'checkouts/list') {
                display = `Sucesso: ${data.success}, Itens: ${data.data?.length || 0}`;
            } else {
                display = JSON.stringify(data);
            }
        }
        console.log(`[${res.status}] ${name}:`, display);
    } catch (e) {
        console.error(`Erro em ${name}:`, e.message);
    }
}

async function run() {
    const list = [
        ['https://api.abacatepay.com/v2/store/get', 'store/get'],
        ['https://api.abacatepay.com/v2/store', 'store'],
        ['https://api.abacatepay.com/v2/stores/get', 'stores/get'],
        ['https://api.abacatepay.com/v2/stores', 'stores'],
        ['https://api.abacatepay.com/v2/account/get', 'account/get'],
        ['https://api.abacatepay.com/v2/account', 'account'],
        ['https://api.abacatepay.com/v2/merchant/get', 'merchant/get'],
        ['https://api.abacatepay.com/v2/merchant', 'merchant'],
        ['https://api.abacatepay.com/v2/balance/get', 'balance/get'],
        ['https://api.abacatepay.com/v2/balance', 'balance'],
        ['https://api.abacatepay.com/v2/me', 'me'],
        ['https://api.abacatepay.com/v2/checkouts/list', 'checkouts/list']
    ];

    for (const [url, name] of list) {
        await testEndpoint(url, name);
    }
}

run();
