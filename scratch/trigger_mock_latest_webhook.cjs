async function send() {
    const payload = {
        event: 'checkout.completed',
        data: {
            checkout: {
                id: 'bill_xarNnNx6aHpLdTnPKTFfS5ba',
                status: 'PAID',
                amount: 100, // R$ 1.00
                customer: {
                    email: 'daiancash@gmail.com',
                    name: 'Daian Cliente'
                },
                metadata: {
                    userId: '353f7b67-98a1-429e-98f1-7908ea06d85a',
                    cartIds: [
                        'b8b0ead7-9347-4942-aa2e-e71db61d8a58'
                    ],
                    termsAccepted: true
                }
            },
            payerInformation: {
                email: 'daiancash@gmail.com',
                name: 'Daian Cliente'
            }
        }
    };

    console.log('Sending mock webhook payload to local server...');
    try {
        const res = await fetch('http://localhost:4242/api/abacate-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Response Status:', res.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error sending request:', e);
    }
}

send();
