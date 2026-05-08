import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;

async function testV2Metadata() {
    try {
        console.log('1. Criando produto...');
        const pRes = await fetch('https://api.abacatepay.com/v2/products/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                externalId: "meta-" + Date.now(),
                name: "Teste Meta",
                price: 1500,
                currency: "BRL"
            })
        });
        const pData = await pRes.json();
        const productId = pData.data.id;

        console.log('2. Criando checkout com metadata...');
        const cRes = await fetch('https://api.abacatepay.com/v2/checkouts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                frequency: "ONE_TIME",
                methods: ["PIX"],
                items: [{ id: productId, quantity: 1 }],
                returnUrl: "https://www.google.com",
                completionUrl: "https://www.google.com",
                customer: {
                    name: "Teste Meta",
                    email: "meta@teste.com",
                    taxId: "12345678909",
                    cellphone: "11999999999"
                },
                metadata: {
                    testKey: "testValue",
                    cartIds: ["1", "2"]
                }
            })
        });
        const cData = await cRes.json();
        console.log('Resultado V2 com Metadata:', JSON.stringify(cData, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

testV2Metadata();
