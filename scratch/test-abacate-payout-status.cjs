require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.ABACATEPAY_API_KEY;

if (!apiKey) {
  console.error('ABACATEPAY_API_KEY is missing');
  process.exit(1);
}

const id = 'tran_wZbFQeMWjxnMscpPu4yb3BAq';

async function testEndpoint(url) {
  try {
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json().catch(() => null);
    console.log(`[${res.status}] ${url}:`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error ${url}:`, err.message);
  }
}

async function main() {
  const urls = [
    `https://api.abacatepay.com/v2/pix/send/status?id=${id}`,
    `https://api.abacatepay.com/v2/pix/send/status/${id}`,
    `https://api.abacatepay.com/v2/withdraw/get?id=${id}`,
    `https://api.abacatepay.com/v2/withdrawals/get?id=${id}`,
    `https://api.abacatepay.com/v2/transfers/${id}`,
    `https://api.abacatepay.com/v2/payouts/${id}`,
    `https://api.abacatepay.com/v1/pix/send/status?id=${id}`,
    `https://api.abacatepay.com/v1/withdraw/get?id=${id}`
  ];

  for (const url of urls) {
    await testEndpoint(url);
  }
}

main();
