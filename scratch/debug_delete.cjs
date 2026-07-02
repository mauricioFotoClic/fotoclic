const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function debugDelete() {
    console.log("Searching for photographer 'Teste' (mau@gmail.com)...");
    const { data: users, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'mau@gmail.com');
        
    if (userErr) {
        console.error("Error finding user:", userErr);
        return;
    }
    
    if (users.length === 0) {
        console.log("User mau@gmail.com not found!");
        return;
    }
    
    const user = users[0];
    console.log(`Found User: ID=${user.id}, Name=${user.name}, Email=${user.email}`);
    
    // Now let's try to delete them using the admin_delete_user RPC first, to see what it returns
    console.log("\nCalling admin_delete_user RPC...");
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_user_id: user.id
    });
    
    console.log("RPC Result:", rpcData);
    console.log("RPC Error:", rpcErr);
    
    // Let's check if the user still exists in 'users' table
    const { data: checkUser } = await supabase.from('users').select('id').eq('id', user.id);
    console.log("User check in 'users' table after RPC:", checkUser);
    
    // Let's try direct delete from public.users
    if (checkUser && checkUser.length > 0) {
        console.log("\nTrying direct delete from public.users...");
        const { error: delErr } = await supabase.from('users').delete().eq('id', user.id);
        console.log("Direct delete error:", delErr);
    }
}

debugDelete();
