const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  console.log("Users fetch error:", error);
  console.log("Users count:", users ? users.length : 0);
  
  if (!users || users.length === 0) return;
  
  const userIds = users.map((u) => u.id);
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("buyer_id, price")
    .in("buyer_id", userIds);
    
  console.log("Sales fetch error:", salesError);
  console.log("Sales count:", sales ? sales.length : 0);
}
test();
