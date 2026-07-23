import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

export default async function handler(req, res) {
  // Only allow PATCH method
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate caller is authenticated as admin
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify user token and check if they're an admin
  const supabaseUser = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check admin role
  const { data: userRecord, error: userErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userErr || !userRecord || userRecord.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin only' });
  }

  const { eventId, updates } = req.body;

  if (!eventId || !updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Missing eventId or updates' });
  }

  // Only allow specific safe fields to be updated via this endpoint
  const allowedFields = ['is_featured', 'cover_photo_url', 'name', 'description', 'location', 'event_date', 'category_id'];
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key))
  );

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update(filteredUpdates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ data });
}
