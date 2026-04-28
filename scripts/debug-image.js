import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: photos } = await supabase
    .from('photos')
    .select('id, preview_url, thumb_url')
    .limit(3);

for (const photo of photos) {
    const url = photo.preview_url || photo.thumb_url;
    console.log('\nURL:', url);

    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));

    const buf = Buffer.from(await res.arrayBuffer());
    // Show first 12 bytes as hex to identify format
    console.log('Primeiros bytes (hex):', buf.slice(0, 12).toString('hex'));
    // JPEG starts with: ffd8ff
    // PNG starts with:  89504e47
    // WebP starts with: 52494646 (RIFF) then 8 bytes then 57454250 (WEBP)
    // AVIF/HEIC starts with: 0000001c or similar
}
