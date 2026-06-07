import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;
console.log('Chave API utilizada:', apiKey);

async function testEndpoint(url, name) {
    try {
        console.log(`\nTestando ${name} (${url})...`);
        const res = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Resposta:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro na requisição:', e.message);
    }
}

async function run() {
    await testEndpoint('https://api.abacatepay.com/v2/withdraw/list', 'v2 Withdraw List');
    await testEndpoint('https://api.abacatepay.com/v2/withdrawals/list', 'v2 Withdrawals List');
    await testEndpoint('https://api.abacatepay.com/v2/withdrawals', 'v2 Withdrawals (sem list)');
}

run();
