import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testFetch() {
    console.log("Supabase URL:", supabaseUrl);
    console.log("Supabase Key length:", supabaseKey ? supabaseKey.length : 0);

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
        console.log("\n1. Fetching httpbin.org/get to test general internet access...");
        const eventsUrl = `https://httpbin.org/get`;
        const res1 = await fetch(eventsUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        console.log("Httpbin response status:", res1.status, res1.statusText);
        if (res1.ok) {
            const data1 = await res1.json();
            console.log("Response JSON origin:", data1.origin);
        }
    } catch (err) {
        console.error("Test failed with error:", err.message);
    } finally {
        process.exit(0);
    }
}

testFetch();
