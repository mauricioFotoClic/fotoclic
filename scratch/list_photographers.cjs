const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function listUsers() {
    console.log("Listing all photographers in public.users table:");
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'photographer');
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    users.forEach(u => {
        console.log(` - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`);
    });
}

listUsers();
