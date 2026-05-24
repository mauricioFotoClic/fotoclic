import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;

async function testCloudflare() {
    console.log("Account ID:", CLOUDFLARE_ACCOUNT_ID);
    console.log("Token:", CLOUDFLARE_API_TOKEN?.substring(0, 10) + "...");
    
    // Test 1: Bearer Token
    const res1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`, {
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log("Test 1 (Bearer Token) Status:", res1.status);
    console.log("Test 1 Body:", await res1.json());
}

testCloudflare();
