require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.ABACATEPAY_API_KEY;

if (!apiKey) {
  console.error('ABACATEPAY_API_KEY is missing');
  process.exit(1);
}

console.log('API Key (masked):', apiKey.substring(0, 10) + '...');

async function testPixSend() {
  console.log('\n--- Testing POST /v2/pix/send ---');
  
  const payload = {
    amount: 10, // R$ 0,10 em centavos (valor mínimo de teste)
    externalId: `test_payout_${Date.now()}`,
    description: 'FotoClic - Teste de Pix',
    pix: {
      key: '21992580137',
      type: 'PHONE'
    }
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch('https://api.abacatepay.com/v2/pix/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (!res.ok) {
      console.error('\n❌ ERRO! A AbacatePay retornou um erro.');
      console.error('Detalhes do erro:', data);
    } else {
      console.log('\n✅ Sucesso!');
    }
  } catch (err) {
    console.error('Erro de rede:', err.message);
  }
}

// Também testa o endpoint de saldo da conta para ver se a API Key é válida
async function testAccountBalance() {
  console.log('\n--- Testing GET /v1/billing/get (account info) ---');
  try {
    const res = await fetch('https://api.abacatepay.com/v1/billing/get', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

async function main() {
  await testAccountBalance();
  await testPixSend();
}

main();
