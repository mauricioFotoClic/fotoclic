
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
        // Run a dummy detection to initialize shaders
        await faceapi.detectSingleFace(dummyCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.1 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
    } catch (e) {
        console.warn('Warmup failed (non-critical):', e);
    }
}

export const faceRecognitionService = {

    async loadModels() {
        if (modelsLoaded) return;
        if (loadingPromise) return loadingPromise;

        const modelUrl = '/models';

        loadingPromise = (async () => {
            try {
                // Ensure backend is ready (try WebGL for performance)
                await faceapi.tf.setBackend('webgl').catch(() => console.log('WebGL not available, using CPU'));
                await faceapi.tf.ready();

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl), // Fallback
                    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl), // Primary
                    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
                ]);

                modelsLoaded = true;

                // Trigger warmup with a delay to avoid blocking UI during modal open (improves INP)
                setTimeout(() => {
                    warmupModels();
                }, 1000);

            } catch (error) {
                console.error('Error loading FaceAPI models:', error);
                modelsLoaded = false;
                throw new Error('Falha ao carregar modelos de reconhecimento facial');
            } finally {
                loadingPromise = null;
            }
        })();

        return loadingPromise;
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

    async getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement): Promise<Float32Array | null> {
        await this.loadModels();

        let input: any = image;
        // Resize if it's an image, to ensure we don't process 4k images on CPU
        if (image instanceof HTMLImageElement) {
            input = this.resizeImage(image, 600); // Reduced to 600 for optimal performance
        }

        // Use TinyFaceDetector for speed (much faster on mobile/web)
        // Adjust scoreThreshold as needed (0.5 is default)
        const detection = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            // Fallback: If TinyFace fails, try SSD MobileNet (slower but more accurate)
            console.log("TinyFace failed, trying SSD MobileNet...");
            const retryDetection = await faceapi.detectSingleFace(input)
                .withFaceLandmarks()
                .withFaceDescriptor();
            return retryDetection ? retryDetection.descriptor : null;
        }

        return detection.descriptor;
    },

    async indexPhoto(photoId: string, imageElement: HTMLImageElement) {
        await this.loadModels();

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

    async searchMatches(descriptor: Float32Array, threshold = 0.6): Promise<string[]> {
        // Server-side vector search using pgvector
        // We use the RPC function 'match_faces' created in the migration
        const { data: matches, error } = await supabase
            .rpc('match_faces', {
                query_embedding: Array.from(descriptor), // Convert to regular array
                match_threshold: threshold,
                match_count: 20 // Limit results for performance
            });

        if (error) {
            console.error("Error in server-side face search:", error);
            throw error;
        }

        if (!matches || matches.length === 0) return [];

        // Return unique photo IDs
        const uniquePhotoIds = Array.from(new Set(matches.map((m: any) => m.photo_id)));
        return uniquePhotoIds as string[];
    }
};
