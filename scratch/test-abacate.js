import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;

async function test() {
    const body = {
        frequency: "ONE_TIME",
        methods: ["PIX"],
        products: [{
            externalId: "test-1",
            name: "Foto de Teste",
            price: 1000, 
            quantity: 1
        }],
        returnUrl: "https://www.google.com",
        completionUrl: "https://www.google.com",
        customer: {
            name: "Teste Diagnostico",
            email: "teste@exemplo.com",
            taxId: "12345678909",
            cellphone: "11999999999"
        }
    };

    try {
        console.log('--- Testando com price e cellphone ---');
        const res = await fetch('https://api.abacatepay.com/v1/billing/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Resposta:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

test();
