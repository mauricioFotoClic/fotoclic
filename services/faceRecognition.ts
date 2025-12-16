
import * as faceapi from 'face-api.js';
import { supabase } from './supabaseClient';

const SSD_MOBILENETV1 = 'ssd_mobilenetv1';
const FACE_LANDMARK_68 = 'face_landmark_68';
const FACE_RECOGNITION = 'face_recognition';

let modelsLoaded = false;

export const faceRecognitionService = {

    async loadModels() {
        if (modelsLoaded) return;

        const modelUrl = '/models';

        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
            ]);
            modelsLoaded = true;
            console.log('FaceAPI models loaded');
        } catch (error) {
            console.error('Error loading FaceAPI models:', error);
            throw new Error('Falha ao carregar modelos de reconhecimento facial');
        }
    },

    resizeImage(image: HTMLImageElement, maxWidth = 800): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / Math.max(image.width, 1);

        // Only resize if image is larger than maxWidth
        if (scale >= 1) {
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(image, 0, 0);
            return canvas;
        }

        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        return canvas;
    },

    async getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement): Promise<Float32Array | null> {
        await this.loadModels();

        // Resize image if it's an HTMLImageElement (video not supported for resize here yet)
        let input = image;
        if (image instanceof HTMLImageElement) {
            input = this.resizeImage(image);
        }

        const detection = await faceapi.detectSingleFace(input)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            return null;
        }

        return detection.descriptor;
    },

    async indexPhoto(photoId: string, imageElement: HTMLImageElement) {
        await this.loadModels();

        // Detect all faces in the photo
        // Detect all faces in the photo with default options
        let detections = await faceapi.detectAllFaces(imageElement)
            .withFaceLandmarks()
            .withFaceDescriptors();

        // Retry with lower confidence if no faces found
        if (detections.length === 0) {
            console.log('No faces detected with default confidence, retrying with 0.3...');
            detections = await faceapi.detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                .withFaceLandmarks()
                .withFaceDescriptors();
        }

        // Retry with even lower confidence
        if (detections.length === 0) {
            console.log('No faces detected with 0.3 confidence, retrying with 0.1...');
            detections = await faceapi.detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
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
            descriptor: Array.from(d.descriptor), // Convert Float32Array to regular array for JSONB
            model_version: 'face-api.js-v1'
        }));

        console.log(`Attempting to save ${encodings.length} face encodings for photo ${photoId}`);

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
        // Client-side search for MVP (fetches all encodings - optimization needed for scale)
        const { data: allEncodings, error } = await supabase
            .from('face_encodings')
            .select('photo_id, descriptor');

        if (error) throw error;
        if (!allEncodings || allEncodings.length === 0) return [];

        const matches: { photoId: string, distance: number }[] = [];

        // Simple Euclidean distance
        allEncodings.forEach(record => {
            const dbDescriptor = record.descriptor as number[];
            const distance = faceapi.euclideanDistance(descriptor, dbDescriptor);

            if (distance < threshold) {
                matches.push({ photoId: record.photo_id, distance });
            }
        });

        matches.sort((a, b) => a.distance - b.distance);

        // Return unique photo IDs
        const uniquePhotoIds = Array.from(new Set(matches.map(m => m.photoId)));
        return uniquePhotoIds;
    }
};
