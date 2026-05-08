import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;

async function testV2Dynamic() {
    try {
        console.log('1. Criando produto...');
        const productRes = await fetch('https://api.abacatepay.com/v2/products/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                externalId: "pedido-" + Date.now(),
                name: "Pedido FotoClic Teste",
                description: "Compra de fotos digitais",
                price: 1500,
                currency: "BRL"
            })
        });
        
        const productData = await productRes.json();
        console.log('Produto:', JSON.stringify(productData));

        if (productData.success && productData.data) {
            const productId = productData.data.id;
            console.log('Produto criado! ID:', productId);

            console.log('2. Criando checkout...');
            const checkoutRes = await fetch('https://api.abacatepay.com/v2/checkouts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    frequency: "ONE_TIME",
                    methods: ["PIX"],
                    items: [{
                        id: productId,
                        quantity: 1
                    }],
                    returnUrl: "https://www.google.com",
                    completionUrl: "https://www.google.com",
                    customer: {
                        name: "Teste",
                        email: "a@a.com",
                        taxId: "12345678909",
                        cellphone: "11999999999"
                    }
                })
            });
            const checkoutData = await checkoutRes.json();
            console.log('Checkout:', JSON.stringify(checkoutData, null, 2));
        }

    } catch (e) {
        console.error('Erro:', e.message);
    }
}

testV2Dynamic();
