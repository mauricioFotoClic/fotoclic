// native fetch is used

async function send() {
    const payload = {
        event: 'checkout.completed',
        data: {
            checkout: {
                id: 'bill_nXcsh3shmSJFSazTbwC4wwCR',
                status: 'PAID',
                amount: 11000,
                customer: {
                    email: 'felipevalgames@gmail.com',
                    name: 'Felipe Val'
                },
                metadata: {
                    userId: '00fcaeec-35e2-46ae-8d1e-6c3c12280460',
                    cartIds: [
                        'dcff56c9-c74d-4caf-a939-eaa8f0bad502',
                        'e13c44af-7370-47d7-97b7-ec6e184090d1',
                        '51233d2f-6ff5-40f7-b731-173d731cdcd4',
                        '13c3067f-4bb6-424b-9d27-0cca3c2c23c1',
                        '5060b947-2b47-4e9e-81cf-81c5c080bcef',
                        'f403b25e-4ba6-4ef9-8106-9ba63b0da4aa',
                        'c3885f3a-c62a-4e8d-9afd-e93ccccbf760',
                        '41f8dc06-684e-4824-9990-9bb6a84fcfbe',
                        'f4e8716c-3ceb-4f37-a950-71dfe795e338',
                        'ec0333d5-e9a4-4481-b85b-0f1cd7f702c6',
                        'e2b8ca30-4310-42e5-8afe-ee80d0c96520',
                        '0b0cbab1-04be-40dc-8e7e-b3370ceff817'
                    ],
                    termsAccepted: true
                }
            },
            payerInformation: {
                email: 'felipevalgames@gmail.com',
                name: 'Felipe Val'
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
