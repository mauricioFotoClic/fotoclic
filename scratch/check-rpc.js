import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkOpenApi() {
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        
        console.log("Response Status:", res.status);
        const data = await res.json();
        const paths = data.paths || {};
        const rpcPaths = Object.keys(paths).filter(p => p.includes('upload_photo'));
        
        console.log("Matching RPC Paths:", rpcPaths);
        
        for (const p of rpcPaths) {
            console.log(`Path: ${p}`);
            const postObj = paths[p].post;
            if (postObj && postObj.parameters) {
                console.log("Parameters:", JSON.stringify(postObj.parameters, null, 2));
            } else {
                console.log("No parameters listed directly in path.");
            }
        }
    } catch (e) {
        console.error("Error fetching OpenAPI:", e);
    }
}

checkOpenApi();
