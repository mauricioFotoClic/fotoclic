import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.ABACATEPAY_API_KEY;

async function testWithdrawals() {
  try {
    // Testar com v1 e v2
    const res = await fetch('https://api.abacatepay.com/v2/withdraw/list', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    console.log("Status v2:", res.status);
    console.log("Dados v2:", JSON.stringify(data, null, 2));

    const resV1 = await fetch('https://api.abacatepay.com/v1/withdraw/list', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const dataV1 = await resV1.json();
    console.log("\nStatus v1:", resV1.status);
    console.log("Dados v1:", JSON.stringify(dataV1, null, 2));
  } catch (err) {
    console.error("Erro na chamada:", err);
  }
}

testWithdrawals();
