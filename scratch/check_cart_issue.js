const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log("Supabase URL:", SUPABASE_URL);
    
    // Find user by name "Daian"
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .ilike('name', '%Daian%');
        
    if (userError) {
        console.error("Error finding user:", userError);
        return;
    }
    
    console.log("Found users matching Daian:", users);
    
    if (!users || users.length === 0) {
        console.log("No user named Daian found in the database.");
        return;
    }
    
    for (const user of users) {
        console.log(`\n=== Analyzing User: ${user.name} (${user.id}) ===`);
        
        // Check cart in the DB
        const { data: carts, error: cartError } = await supabase
            .from('carts')
            .select('*')
            .eq('user_id', user.id);
            
        if (cartError) {
            console.error("Error fetching carts:", cartError);
        } else {
            console.log("User's carts in DB:", carts);
        }
        
        // Check purchases / sales
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .eq('customer_id', user.id);
            
        if (salesError) {
            console.error("Error fetching sales:", salesError);
        } else {
            console.log(`User's sales/purchases in DB (${sales ? sales.length : 0}):`, sales);
            if (sales) {
                sales.forEach(sale => {
                    console.log(`  - Sale ID: ${sale.id}, Photo ID: ${sale.photo_id}, Price: ${sale.price}, Status: ${sale.status}`);
                });
            }
        }
    }
}

check();
