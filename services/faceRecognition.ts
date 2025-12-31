
import * as faceapi from 'face-api.js';
import { supabase } from './supabaseClient';

const SSD_MOBILENETV1 = 'ssd_mobilenetv1';
const FACE_LANDMARK_68 = 'face_landmark_68';
const FACE_RECOGNITION = 'face_recognition';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Warmup function to compile shaders in the background
async function warmupModels() {
    try {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1;
        dummyCanvas.height = 1;
        // Run a dummy detection to initialize shaders for BOTH models
        console.log("Warming up models...");
        // Warmup TinyFace (still used for some internals)
        await faceapi.detectSingleFace(dummyCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.1 }));

        // Warmup SSD MobileNet (CRITICAL for search speed)
        await faceapi.detectSingleFace(dummyCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }));
        console.log("Models warmed up!");
    } catch (e) {
        console.warn('Warmup failed (non-critical):', e);
    }
}

export const faceRecognitionService = {

    async loadEssentialModels() {
        if (modelsLoaded) return;
        if (loadingPromise) return loadingPromise;

        const modelUrl = '/models';

        loadingPromise = (async () => {
            try {
                // Ensure backend is ready (try WebGL for performance)
                await faceapi.tf.setBackend('webgl').catch(() => console.log('WebGL not available, using CPU'));
                await faceapi.tf.ready();

                // Load only the essential models for fast detection
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl), // Primary (Lightweight)
                    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
                ]);

                modelsLoaded = true;

                // Trigger warmup with a delay
                setTimeout(() => {
                    warmupModels();
                }, 1000);

            } catch (error) {
                console.error('Error loading Essential FaceAPI models:', error);
                modelsLoaded = false;
                throw new Error('Falha ao carregar modelos de reconhecimento facial');
            } finally {
                loadingPromise = null;
            }
        })();

        return loadingPromise;
    },

    async loadPreciseModel() {
        if (faceapi.nets.ssdMobilenetv1.isLoaded) return;

        const modelUrl = '/models';
        try {
            console.log("Loading precise model (SSD MobileNet)...");
            console.time('Load SSD MobileNet');
            await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
            console.timeEnd('Load SSD MobileNet');
        } catch (error) {
            console.error("Error loading SSD MobileNet:", error);
        }
    },

    // Backwards compatibility alias
    async loadModels() {
        return this.loadEssentialModels();
    },

    resizeImage(image: HTMLImageElement, maxWidth = 1280): HTMLCanvasElement | HTMLImageElement {
        if (image.width <= maxWidth && image.height <= maxWidth) {
            return image;
        }

        const canvas = document.createElement('canvas');
        const scale = maxWidth / Math.max(image.width, 1);

        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas;
        }
        return image; // fallback
    },

    async getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement, onStatusUpdate?: (status: string) => void): Promise<Float32Array | null> {
        // ALWAYS use SSD MobileNet for search to match indexing accuracy
        // Since we are preloading, this shouldn't be too slow
        if (onStatusUpdate) onStatusUpdate("Carregando modelos...");

        await this.loadPreciseModel();

        let input: any = image;
        // Resize if it's an image, to ensure we don't process 4k images on CPU
        // But keep enough resolution for SSD to work well
        if (image instanceof HTMLImageElement) {
            input = this.resizeImage(image, 512);
        }

        if (onStatusUpdate) onStatusUpdate("Analisando rosto (Biometria)...");
        console.time('Face Detection');

        const detection = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        console.timeEnd('Face Detection');

        return detection ? detection.descriptor : null;
    },

    async indexPhoto(photoId: string, imageElement: HTMLImageElement) {
        // Indexing MUST use the most accurate model (SSD MobileNet)
        // to ensure the stored descriptors are high quality.
        await this.loadEssentialModels();
        await this.loadPreciseModel();

        // Performance Optimization: Resize for detection
        const inputToProcess = this.resizeImage(imageElement, 1280);

        // Detect all faces in the photo with default options
        let detections = await faceapi.detectAllFaces(inputToProcess)
            .withFaceLandmarks()
            .withFaceDescriptors();

        // Retry with lower confidence if no faces found
        if (detections.length === 0) {
            console.log('No faces detected with default confidence, retrying with 0.3...');
            detections = await faceapi.detectAllFaces(inputToProcess, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                .withFaceLandmarks()
                .withFaceDescriptors();
        }

        // Retry with even lower confidence
        if (detections.length === 0) {
            console.log('No faces detected with 0.3 confidence, retrying with 0.1...');
            detections = await faceapi.detectAllFaces(inputToProcess, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
                .withFaceLandmarks()
                .withFaceDescriptors();
        }

        if (detections.length === 0) {
            console.log('No faces detected in photo', photoId);
            throw new Error("Nenhum rosto foi identificado na foto. Verifique a iluminação e qualidade.");
        }

        const encodings = detections.map((d, index) => ({
            photo_id: photoId,
            face_index: index,
            // Convert Float32Array to regular array for pgvector
            // Supabase JS client handles array -> vector conversion automatically
            descriptor: Array.from(d.descriptor),

            // New Metadata Columns (Spec Alignment)
            x: Math.round(d.detection.box.x),
            y: Math.round(d.detection.box.y),
            w: Math.round(d.detection.box.width),
            h: Math.round(d.detection.box.height),
            quality_score: d.detection.score,

            model_version: 'face-api.js-v1'
        }));

        console.log(`Attempting to save ${encodings.length} face encodings for photo ${photoId}`);

        // Insert into the table (now with vector column)
        const { error } = await supabase
            .from('face_encodings')
            .insert(encodings);

        if (error) {
            console.error('Error saving face encodings:', error);
            throw error;
        }

        // Mark photo as indexed
        await supabase
            .from('photos')
            .update({ is_face_indexed: true })
            .eq('id', photoId);
    },

    async searchMatches(descriptor: Float32Array, threshold = 0.2): Promise<{ id: string, distance: number }[]> {
        // Server-side vector search using pgvector
        // Using a slightly higher base threshold (0.2) to capture potential matches,
        // then filtering strictly on the client side based on relative distance.
        const { data: matches, error } = await supabase
            .rpc('match_faces', {
                query_embedding: Array.from(descriptor),
                match_threshold: threshold,
                match_count: 50
            });

        if (error) {
            console.error("Error in server-side face search:", error);
            throw error;
        }

        if (!matches || matches.length === 0) return [];

        console.log("Raw Matches from DB:", matches.map((m: any) => ({ id: m.photo_id, d: m.distance })));

        // DYNAMIC THRESHOLDING STRATEGY
        // The "absolute" distance varies by model/environment.
        // False positives usually appear as a "shelf" after the true matches.
        // Strategy: 
        // 1. Take the best match distance (e.g., 0.05).
        // 2. Allow a small margin (e.g., +0.08).
        // 3. Discard anything significantly worse than the best match.

        const bestDistance = matches[0].distance;
        const relativeThreshold = bestDistance + 0.08; // Allow matches within 0.08 of the best one

        const validMatches = matches.filter((m: any) => m.distance <= relativeThreshold && m.distance < 0.25); // Hard cap at 0.25

        console.log(`Filtering: Best=${bestDistance.toFixed(4)}, RelativeLimit=${relativeThreshold.toFixed(4)} -> Kept ${validMatches.length}/${matches.length}`);

        // Return unique items (sometimes one photo has multiple faces/matches, take best)
        const uniqueResults = new Map<string, number>();
        validMatches.forEach((m: any) => {
            if (!uniqueResults.has(m.photo_id)) {
                uniqueResults.set(m.photo_id, m.distance);
            }
        });

        // Convert back to array
        return Array.from(uniqueResults.entries()).map(([id, distance]) => ({ id, distance }));
    }
};
