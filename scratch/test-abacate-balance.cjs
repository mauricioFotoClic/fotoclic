require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.ABACATEPAY_API_KEY;

if (!apiKey) {
  console.error('ABACATEPAY_API_KEY is missing');
  process.exit(1);
}

async function main() {
  console.log('--- Consultando AbacatePay Store API ---');
  try {
    const storeRes = await fetch('https://api.abacatepay.com/v2/stores/get', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await storeRes.json();
    console.log('API Status:', storeRes.status);
    console.log('API Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
