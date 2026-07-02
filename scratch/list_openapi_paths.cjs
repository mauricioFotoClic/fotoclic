const dotenv = require('dotenv');
const path = require('path');

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
        console.log("All tables and RPCs in Postgrest:");
        Object.keys(paths).forEach(p => {
            console.log(" - ", p);
        });
    } catch (e) {
        console.error("Error fetching OpenAPI:", e);
    }
}

checkOpenApi();
