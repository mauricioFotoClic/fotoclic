
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePhotographers() {
    console.log('Starting photographer avatar migration...');

    // 1. Fetch all photographers
    const { data: photographers, error } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('role', 'photographer');

    if (error) {
        console.error('Error fetching photographers:', error);
        return;
    }

    if (!photographers || photographers.length === 0) {
        console.log('No photographers found.');
        return;
    }

    console.log(`Found ${photographers.length} photographers.`);

    for (const photographer of photographers) {
        const { id, name, avatar_url } = photographer;

        if (avatar_url && avatar_url.startsWith('data:image')) {
            console.log(`Migrating avatar for: ${name} (${id})`);

            try {
                const parts = avatar_url.split(';base64,');
                if (parts.length < 2) {
                    console.warn(`Invalid avatar for ${name}, skip.`);
                    continue;
                }
                const base64Data = parts[1];
                const contentType = parts[0].split(':')[1];
                const fileExt = contentType.split('/')[1] || 'jpg';
                const buffer = Buffer.from(base64Data, 'base64');

                const fileName = `avatars/${id}-${Date.now()}.${fileExt}`;

                // 2. Upload to 'photos-preview' bucket
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('photos-preview')
                    .upload(fileName, buffer, {
                        contentType: contentType,
                        upsert: true
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // 3. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('photos-preview')
                    .getPublicUrl(fileName);

                // 4. Update Database
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ avatar_url: publicUrl })
                    .eq('id', id);

                if (updateError) throw updateError;

                console.log(`Successfully migrated ${name}. Public URL: ${publicUrl}`);
            } catch (err) {
                console.error(`Failed to migrate ${name}:`, err.message);
            }
        } else {
            console.log(`Skipping ${name} - already migrated or no avatar.`);
        }
    }

    console.log('Migration finished.');
}

migratePhotographers();
