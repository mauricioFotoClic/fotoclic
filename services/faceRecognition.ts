import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.DEV ? 'http://localhost:4242' : '';

export const faceRecognitionService = {
    // Compatibility stubs — no longer needed with server-side Rekognition
    async loadEssentialModels() { return true; },
    async loadPreciseModel() { return true; },

    async indexPhoto(photoId: string, imageUrl: string): Promise<{ facesIndexed: number }> {
        const response = await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'indexFaces', photoId, imageUrl }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Rekognition indexing failed: ${err.error}`);
        }

        return response.json();
    },

    async searchByImage(imageDataUrl: string, eventId?: string): Promise<{ id: string; similarity: number }[]> {
        const response = await fetch(`${API_BASE}/api/rekognition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchFaces', imageBase64: imageDataUrl }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Rekognition search failed: ${err.error || err.name || response.status}`);
        }

        const data = await response.json();

        let photoIds: string[] = data.photoIds ?? [];

        // If scoped to an event, filter photo IDs that belong to it
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
