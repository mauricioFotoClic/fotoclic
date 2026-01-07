/**
 * cleanup_orphans.js
 * 
 * Script to identify and delete orphan files from Supabase Storage.
 * Orphan files are files in storage ('photos-original', 'photos-preview') that are NOT referenced
 * in the public.photos table.
 * 
 * Usage: node cleanup_orphans.js
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Prefer Service Role for admin ops

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing SUPABASE_URL or keys.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllFiles(bucketName) {
    let allFiles = [];
    let offset = 0;
    const limit = 1000;
    let keepFetching = true;

    console.log(`Fetching files from bucket '${bucketName}'...`);

    // Note: listing all files recursively in storage can be slow/limitations apply.
    // This is a simplified version assuming a reasonably flat or consistent structure 
    // or relying on list interactions.
    // For 'photos-original', structure is {userId}/{eventId}/{uuid}-original.jpg
    // We'll iterate users first? No, easier to list root if possible or use recursive.
    // Supabase list is per folder.

    // APPROACH: We will use a database approach if possible.
    // Since we can't easily list ALL storage objects efficiently without database access to storage.objects (which requires superuser or internal view),
    // and we are running as a client.

    // ALTERNATIVE:
    // We will assume simpler path: The script validates known paths from DB vs actual?
    // No, we want to find files NO LONGER in DB.

    // We will list the top level folders (Users) then drill down.

    try {
        const { data: userFolders, error } = await supabase.storage.from(bucketName).list();
        if (error) throw error;

        for (const userFolder of userFolders) {
            if (!userFolder.id) continue; // Skip files at root if any

            // List Events
            const { data: eventFolders, error: evErr } = await supabase.storage.from(bucketName).list(`${userFolder.name}`);
            if (evErr) continue;

            for (const eventFolder of eventFolders) {
                if (!eventFolder.id) continue; // Skip files

                // List Files
                const { data: files, error: fErr } = await supabase.storage.from(bucketName).list(`${userFolder.name}/${eventFolder.name}`, { limit: 1000 });
                if (fErr) continue;

                for (const file of files) {
                    allFiles.push({
                        path: `${userFolder.name}/${eventFolder.name}/${file.name}`,
                        bucket: bucketName
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error listing files:", e);
    }

    return allFiles;
}

async function run() {
    console.log("Starting Cleanup Routine...");

    // 1. Fetch Key Data from DB
    console.log("Fetching known photos from Database...");
    let { data: dbPhotos, error } = await supabase
        .from('photos')
        .select('file_url, preview_url, thumb_url');

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    // Extract paths/filenames from URLs
    // Database stores logic paths or full URLs.
    // file_url: "{userId}/{eventId}/{uuid}-original.ext" (Relative) OR Full URL?
    // In our code: `file_url` is often relative path for original. `preview_url` is Full URL.

    const validPaths = new Set();

    dbPhotos.forEach(p => {
        if (p.file_url) validPaths.add(p.file_url); // e.g. "uid/eid/name-orig.jpg"

        // Helper to extract path from Public URL
        const extractPath = (url) => {
            if (!url) return null;
            try {
                // .../storage/v1/object/public/photos-preview/path...
                const parts = url.split('/photos-preview/');
                if (parts.length > 1) return parts[1];
                return null;
            } catch (e) { return null; }
        };

        const previewPath = extractPath(p.preview_url);
        if (previewPath) validPaths.add(previewPath);

        const thumbPath = extractPath(p.thumb_url);
        if (thumbPath) validPaths.add(thumbPath);
    });

    console.log(`Found ${validPaths.size} referenced files in DB.`);

    // 2. Scan Buckets
    const originalFiles = await getAllFiles('photos-original');
    const previewFiles = await getAllFiles('photos-preview');

    const allStorageFiles = [...originalFiles, ...previewFiles];
    console.log(`Found ${allStorageFiles.length} files in Storage.`);

    // 3. Find Orphans
    const orphans = allStorageFiles.filter(f => !validPaths.has(f.path));
    console.log(`Found ${orphans.length} ORPHAN files (to be deleted).`);

    if (orphans.length > 0) {
        console.log("Deleting orphans...");
        // Batch delete
        // Provide limit?
        const toDeleteOriginal = orphans.filter(f => f.bucket === 'photos-original').map(f => f.path);
        const toDeletePreview = orphans.filter(f => f.bucket === 'photos-preview').map(f => f.path);

        if (toDeleteOriginal.length > 0) {
            const { error } = await supabase.storage.from('photos-original').remove(toDeleteOriginal);
            if (error) console.error("Error deleting originals:", error);
            else console.log(`Deleted ${toDeleteOriginal.length} originals.`);
        }

        if (toDeletePreview.length > 0) {
            const { error } = await supabase.storage.from('photos-preview').remove(toDeletePreview);
            if (error) console.error("Error deleting previews:", error);
            else console.log(`Deleted ${toDeletePreview.length} previews.`);
        }
    } else {
        console.log("No clean up needed.");
    }

    console.log("Done.");
}

run();
