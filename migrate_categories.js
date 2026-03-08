import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCategories() {
    const { data: categories, error } = await supabase.from('categories').select('*');
    if (error || !categories) {
        console.error("Error fetching categories:", error);
        return;
    }

    for (const cat of categories) {
        if (cat.image_url && cat.image_url.startsWith('data:image')) {
            console.log(`Migrating Category: ${cat.name}...`);
            const base64Data = cat.image_url.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const fileExt = cat.image_url.split(';')[0].split('/')[1];
            const fileName = `categories/${cat.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('photos-preview')
                .upload(fileName, buffer, { contentType: `image/${fileExt}`, upsert: true });

            if (uploadError) {
                console.error("Upload error for", cat.name, uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage.from('photos-preview').getPublicUrl(fileName);

            await supabase.from('categories').update({ image_url: publicUrl }).eq('id', cat.id);
            console.log(`Migrated ${cat.name} successfully -> ${publicUrl}`);
        } else {
            console.log(`Category ${cat.name} is already a URL or empty.`);
        }
    }
    console.log("Migration complete.");
}

migrateCategories();
