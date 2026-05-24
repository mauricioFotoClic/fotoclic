import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;

async function testVideoDownload() {
    const videoUid = 'b502a7f22da4b60e07f98bc4b5cd5ae6';
    
    // POST to generate download
    const resPost = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid}/downloads`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    const postData = await resPost.json();
    console.log("POST result:", JSON.stringify(postData, null, 2));

    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    // Get downloads list again
    const resDownloads = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid}/downloads`, {
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    const downloadsData = await resDownloads.json();
    console.log("Downloads List (after POST):", JSON.stringify(downloadsData, null, 2));
}

testVideoDownload();
