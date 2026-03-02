import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
    // Fetch a photographer user id
    const { data: users } = await supabase.from('users').select('id, name, role').eq('role', 'photographer');
    console.log("Photographers:", users);

    if (users && users.length > 0) {
        const pId = users[0].id;
        // 1. Fetch carts
        const { data: carts, error } = await supabase
            .from('carts')
            .select('user_id, items, updated_at, created_at')
            .not('items', 'is', null);

        console.log("CARTS found:", carts ? carts.length : "None", carts);
        if (error) console.error("Error fetching carts:", error);

        // Check if carts have array correctly parsing
        if (carts) {
            carts.forEach(cart => {
                console.log("Cart user:", cart.user_id, "items:", JSON.stringify(cart.items), "isArray:", Array.isArray(cart.items));
            });
        }
    }
}

testQuery();
