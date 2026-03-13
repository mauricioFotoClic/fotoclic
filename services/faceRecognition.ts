import { supabase } from './supabaseClient';
import { Human, Config } from '@vladmandic/human';

let humanObj: Human | null = null;
let modelsLoaded = false;

// Basic configuration for face detection and recognition only
const humanConfig: Partial<Config> = {
    modelBasePath: 'https://vladmandic.github.io/human/models', // Fallback to CDN for instant access
    filter: { enabled: false, equalization: false },
    backend: 'webgl', // fast GPU
    face: {
        enabled: true,
        detector: { return: true, rotation: true },
        mesh: { enabled: false }, // we don't need 3D mesh for basic distance
        attention: { enabled: false },
        iris: { enabled: false },
        description: { enabled: true }, // this generates the embeddings
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false }
};

export const faceRecognitionService = {
    async loadEssentialModels() {
        if (modelsLoaded && humanObj) return true;
        try {
            console.time('Load Human Models');
            humanObj = new Human(humanConfig);

            // Explicitly load the models to trigger downloads
            await humanObj.load();

            // Warmup
            await humanObj.warmup();

            modelsLoaded = true;
            console.timeEnd('Load Human Models');
            return true;
        } catch (error) {
            console.error("Error loading Human models:", error);
            throw error;
        }
    },

    // Kept to not break API components that might call this explicitly 
    async loadPreciseModel() {
        return this.loadEssentialModels();
    },

    resizeImage(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, maxSize: number = 800): HTMLCanvasElement {
        let width = ('naturalWidth' in input) ? input.naturalWidth : ('videoWidth' in input) ? input.videoWidth : input.width;
        let height = ('naturalHeight' in input) ? input.naturalHeight : ('videoHeight' in input) ? input.videoHeight : input.height;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = width * ratio;
            height = height * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(input, 0, 0, width, height);
        }

        return canvas;
    },

    async getFaceDescriptor(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<Float32Array | null> {
        console.time('Total Face Process');
        await this.loadEssentialModels();

        if (!humanObj) throw new Error("Human AI not initialized.");

        console.time('Face Detection');

        // Performance Optimization: Resize search input (smaller size for faster search latency)
        const inputToProcess = this.resizeImage(input, 640);

        // Detect faces
        const result = await humanObj.detect(inputToProcess);

        console.timeEnd('Face Detection');
        console.timeEnd('Total Face Process');

        if (!result || !result.face || result.face.length === 0) {
            console.log('No face detected.');
            return null;
        }

        // Return the descriptor (embedding) of the most prominent face
        return new Float32Array(result.face[0].embedding!);
    },

    async indexPhoto(photoId: string, imageElement: HTMLImageElement) {
        await this.loadEssentialModels();
        if (!humanObj) throw new Error("Human AI not initialized.");

        // Performance Optimization: Resize for detection
        const inputToProcess = this.resizeImage(imageElement, 1280);

        // Detect all faces
        const result = await humanObj.detect(inputToProcess);

        const faces = result.face;

        if (!faces || faces.length === 0) {
            console.log('No faces detected in photo', photoId);
            throw new Error("Nenhum rosto foi identificado na foto. Verifique a iluminação e qualidade.");
        }

        // Adicionando um filtro para evitar rostos muito pequenos no fundo e rostos com baixa confiança
        const validFaces = faces.filter(f => {
            if (!f.embedding) return false;
            
            // Largura e altura do rosto na imagem processada
            const width = f.box[2];
            const height = f.box[3];
            
            // Ignorar rostos minúsculos de figurantes (menor que 35x35 pixels)
            if (width < 35 || height < 35) return false;
            
            // Ignorar detecções com muito baixa confiança (menos de 30%)
            if (f.score < 0.3) return false;
            
            return true;
        });

        // Se o filtro removeu todos, pegamos pelo menos o maior rosto (Pode ser uma foto real muito de longe)
        let facesToSave = validFaces;
        if (validFaces.length === 0 && faces.length > 0) {
           facesToSave = [faces.reduce((prev, current) => (prev.box[2] * prev.box[3] > current.box[2] * current.box[3]) ? prev : current)];
        }

        const encodings = facesToSave
            .filter(f => f.embedding) // Segurança adicional
            .map(f => ({
                photo_id: photoId,
                descriptor: `[${Array.from(f.embedding!).join(',')}]`
            }));

        if (encodings.length === 0) {
             throw new Error("Rostos detectados são muito pequenos ou de baixa qualidade para indexação.");
        }

        const { error } = await supabase
            .from('face_encodings')
            .insert(encodings);

        if (error) {
            console.error('Error saving face encodings:', error);
            throw error;
        }

        // Update photo status
        await supabase
            .from('photos')
            .update({ is_face_indexed: true })
            .eq('id', photoId);
    },

    async searchMatches(descriptor: Float32Array, threshold = 0.38): Promise<{ id: string, distance: number }[]> {
        const { data: matches, error } = await supabase
            .rpc('match_faces', {
                query_embedding: Array.from(descriptor),
                match_threshold: threshold, // Database limit dynamically set
                match_count: 50
            });

        if (error) {
            console.error("Error in server-side face search:", error);
            throw error;
        }

        if (!matches || matches.length === 0) return [];

        console.log("Raw Matches from DB:", matches.map((m: any) => ({ id: m.photo_id, d: m.distance })));

        const bestDistance = matches[0].distance;

        if (bestDistance > threshold) {
            console.log("Best match is too far, returning empty.");
            return [];
        }

        // Filtra pela tolerância definida (ex: 0.46)
        const validMatches = matches.filter((m: any) => m.distance <= threshold);

        console.log(`Filtering (Cosine): Best=${bestDistance.toFixed(4)}, Threshold=${threshold} -> Kept ${validMatches.length}/${matches.length}`);

        const uniqueResults = new Map<string, number>();
        validMatches.forEach((m: any) => {
            if (!uniqueResults.has(m.photo_id)) {
                uniqueResults.set(m.photo_id, m.distance);
            }
        });

        return Array.from(uniqueResults.entries()).map(([id, distance]) => ({ id, distance }));
    }
};
