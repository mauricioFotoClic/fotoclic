import { supabase } from './supabaseClient';

const API_BASE = '';

// Converts any image URL or data URL to JPEG via browser Canvas (handles WebP natively and resizes to 1024px maximum dimension)
async function toJpegDataUrl(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const MAX_DIMENSION = 1024;
            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('Failed to load image for conversion'));
        img.src = source;
    });
}

export const faceRecognitionService = {
    // Compatibility stubs — no local models needed with Rekognition
    async loadEssentialModels() { return true; },
    async loadPreciseModel() { return true; },

    async indexPhoto(photoId: string, imageUrl: string): Promise<{ facesIndexed: number }> {
        // Convert WebP → JPEG in browser before sending to server
        const jpegBase64 = await toJpegDataUrl(imageUrl);

        const response = await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'indexFaces', photoId, imageBase64: jpegBase64 }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.status }));
            throw new Error(`Rekognition indexing failed: ${err.error || err.name || response.status}`);
        }

        return response.json();
    },

    async searchByImage(imageDataUrl: string, eventId?: string): Promise<{ id: string; similarity: number }[]> {
        // Convert to JPEG in browser in case user uploaded WebP/HEIC
        const jpegBase64 = await toJpegDataUrl(imageDataUrl);

        const response = await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchFaces', imageBase64: jpegBase64 }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.status }));
            throw new Error(`Rekognition search failed: ${err.error || err.name || response.status}`);
        }

        const data = await response.json();

        let photoIds: string[] = data.photoIds ?? [];

        if (eventId && photoIds.length > 0) {
            const { data: photos } = await supabase
                .from('photos')
                .select('id')
                .in('id', photoIds)
                .eq('event_id', eventId);
            photoIds = (photos ?? []).map((p: any) => p.id);
        }

        return (data.matches as any[])
            .filter((m: any) => photoIds.includes(m.photoId))
            .map((m: any) => ({ id: m.photoId, similarity: m.similarity }));
    },

    async deleteFaces(faceIds: string[]): Promise<void> {
        await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteFaces', faceIds }),
        });
    },

    async createCollection(): Promise<void> {
        const response = await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createCollection' }),
        });
        const data = await response.json();
        console.log('[Rekognition]', data.message);
    },
};
