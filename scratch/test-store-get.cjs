require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.ABACATEPAY_API_KEY;

async function main() {
  const storeRes = await fetch('https://api.abacatepay.com/v2/stores/get', {
      headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
      }
  });
  const data = await storeRes.json();
  console.log('stores/get response:', JSON.stringify(data, null, 2));
}

main();
