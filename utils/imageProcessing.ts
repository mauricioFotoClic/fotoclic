
/**
 * Image processing utility for FotoClic
 */

import imageCompression from 'browser-image-compression';

export interface ProcessedImages {
    thumb: string; // Base64 (WebP, ~500px)
    preview: string; // Base64 (WebP, ~2048px + Watermark)
    original: string; // Base64 (Original File)
    width: number;
    height: number;
}

export interface FastProcessedImages {
    thumbBlob: Blob;
    previewBlob: Blob;
    width: number;
    height: number;
}

/**
 * Ultra-fast hardware accelerated image processor (GPU / Canvas native)
 * Preserves 2K resolution (2048px) with 85% WebP quality + crisp watermark.
 */
export const processImageFast = async (file: File): Promise<FastProcessedImages> => {
    let source: ImageBitmap | HTMLImageElement;
    let width = 0;
    let height = 0;

    try {
        source = await createImageBitmap(file);
        width = source.width;
        height = source.height;
    } catch {
        const img = await loadImageElement(file);
        source = img;
        width = img.naturalWidth;
        height = img.naturalHeight;
    }

    // 1. Generate Thumb (Max 500px, 0.82 quality)
    const thumbBlob = await drawToBlob(source, width, height, 500, 0.82, false);

    // 2. Generate Preview (Max 2048px 2K, 0.85 quality + Watermark)
    const previewBlob = await drawToBlob(source, width, height, 2048, 0.85, true, "Fotoclic Preview");

    if ('close' in source && typeof source.close === 'function') {
        source.close();
    }

    return { thumbBlob, previewBlob, width, height };
};

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
};

const drawToBlob = (
    img: ImageBitmap | HTMLImageElement,
    origW: number,
    origH: number,
    maxSide: number,
    quality: number,
    addWatermark: boolean,
    watermarkText = "Fotoclic Preview"
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        let width = origW;
        let height = origH;

        if (width > maxSide || height > maxSide) {
            if (width > height) {
                height = Math.round(height * (maxSide / width));
                width = maxSide;
            } else {
                width = Math.round(width * (maxSide / height));
                height = maxSide;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error("Canvas context failed"));
            return;
        }

        // Draw High Quality Scaled Image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        if (addWatermark) {
            ctx.save();
            const fontSize = Math.max(30, Math.round(width / 13.5));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Contorno escuro para maior contraste
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.80)';
            ctx.lineWidth = Math.max(2, Math.round(fontSize / 14));

            ctx.shadowColor = 'rgba(0, 0, 0, 0.90)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            ctx.translate(width / 2, height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.translate(-width / 2, -height / 2);

            const stepX = Math.round(width / 2.8);
            const stepY = Math.round(height / 2.8);

            for (let y = -height; y < height * 2; y += stepY) {
                for (let x = -width; x < width * 2; x += stepX) {
                    ctx.strokeText(watermarkText, x, y);
                    ctx.fillText(watermarkText, x, y);
                }
            }
            ctx.restore();
        }

        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to convert canvas to blob"));
            },
            'image/webp',
            quality
        );
    });
};

export const processImageForUpload = async (file: File): Promise<ProcessedImages> => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const isBig = file.size > 15 * 1024 * 1024;

    let originalFileToUpload = file;
    if (isHeic || isBig) {
        try {
            originalFileToUpload = await imageCompression(file, {
                maxSizeMB: 15,
                maxWidthOrHeight: 8192,
                useWebWorker: true,
                fileType: isHeic ? 'image/jpeg' : undefined
            });
        } catch (error) {
            console.warn('Image compression failed, using source file', error);
        }
    }

    const { thumbBlob, previewBlob, width, height } = await processImageFast(originalFileToUpload);

    const blobToDataUrl = (blob: Blob): Promise<string> => {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
        });
    };

    const [thumbUrl, previewUrl, originalUrl] = await Promise.all([
        blobToDataUrl(thumbBlob),
        blobToDataUrl(previewBlob),
        blobToDataUrl(originalFileToUpload)
    ]);

    return {
        thumb: thumbUrl,
        preview: previewUrl,
        original: originalUrl,
        width,
        height
    };
};
