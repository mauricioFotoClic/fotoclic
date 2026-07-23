import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
  console.log("Applying RLS policy fix for photos table and storage.objects...");

  const sql = `
    -- 1. Ensure photos table allows INSERT/UPDATE/DELETE for authenticated users & service role
    ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Photos are viewable by everyone" ON public.photos;
    DROP POLICY IF EXISTS "Photographers can upload photos" ON public.photos;
    DROP POLICY IF EXISTS "Photographers can update own photos" ON public.photos;
    DROP POLICY IF EXISTS "Photographers can delete own photos" ON public.photos;
    DROP POLICY IF EXISTS "Allow all for photos" ON public.photos;

    CREATE POLICY "Allow all for photos" ON public.photos FOR ALL USING (true) WITH CHECK (true);

    -- 2. Storage objects RLS policies for photos-original and photos-preview
    DROP POLICY IF EXISTS "Photographers can upload originals" ON storage.objects;
    DROP POLICY IF EXISTS "Photographers can upload previews" ON storage.objects;
    DROP POLICY IF EXISTS "Allow all upload originals" ON storage.objects;
    DROP POLICY IF EXISTS "Allow all upload previews" ON storage.objects;
    DROP POLICY IF EXISTS "Allow all select previews" ON storage.objects;

    CREATE POLICY "Allow all upload originals" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'photos-original');
    CREATE POLICY "Allow all upload previews" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'photos-preview');
    CREATE POLICY "Allow all select previews" ON storage.objects FOR SELECT TO public USING (bucket_id = 'photos-preview');
    CREATE POLICY "Allow all update originals" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'photos-original');
    CREATE POLICY "Allow all update previews" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'photos-preview');
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error("RPC exec_sql error:", error);
    } else {
      console.log("Successfully applied RLS fix:", data);
    }
  } catch (err) {
    console.error("Failed to execute fix:", err);
  }
}

runFix();
