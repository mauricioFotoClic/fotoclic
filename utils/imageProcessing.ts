
/**
 * Image processing utility for FotoClic
 */

import imageCompression from 'browser-image-compression';

interface ProcessedImages {
    thumb: string; // Base64 (WebP, ~400px)
    preview: string; // Base64 (WebP, ~1600px + Watermark)
    original: string; // Base64 (Original File)
    width: number;
    height: number;
}

export const processImageForUpload = async (file: File): Promise<ProcessedImages> => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const isBig = file.size > 15 * 1024 * 1024; // acima de 15MB

    let originalFileToUpload = file;

    // 1. Se for HEIC ou for maior que 15MB, comprime silenciosamente para no máximo 15MB
    if (isHeic || isBig) {
        try {
            originalFileToUpload = await imageCompression(file, {
                maxSizeMB: 15,
                maxWidthOrHeight: 8192, // Resolução 8K para preservar qualidade
                useWebWorker: true,
                fileType: isHeic ? 'image/jpeg' : undefined
            });
        } catch (error) {
            console.warn('Image compression for original file failed, using source file', error);
        }
    }

    // 2. Para processamento no Canvas do browser, gerar uma versão otimizada leve
    let renderFile = file;
    if (isHeic || file.size > 5 * 1024 * 1024) {
        try {
            renderFile = await imageCompression(file, {
                maxSizeMB: 5,
                maxWidthOrHeight: 4096, // Resolução máx para renderizar previews sem crashar navegadores mobile
                useWebWorker: true,
                fileType: isHeic ? 'image/jpeg' : undefined
            });
        } catch (error) {
            console.warn('Failed to compress render file', error);
        }
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(renderFile);
        img.src = objectUrl;

        img.onload = () => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const originalBase64 = reader.result as string;

                try {
                    // 2. Generate Thumb (Max 400px)
                    const thumbDataUrl = resizeImage(img, 400, 0.7);

                    // 3. Generate Preview (Max 1600px) with Watermark
                    const previewDataUrl = resizeImageWithWatermark(img, 1600, 0.8, "FOTOCLIC   PROVA   ");

                    resolve({
                        thumb: thumbDataUrl,
                        preview: previewDataUrl,
                        original: originalBase64,
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    });

                } catch (err) {
                    reject(err);
                } finally {
                    URL.revokeObjectURL(objectUrl);
                }
            };
            reader.onerror = (e) => reject(new Error("Failed to read original file"));
            reader.readAsDataURL(originalFileToUpload);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
        };
    });
};

const resizeImage = (img: HTMLImageElement, maxSide: number, quality: number): string => {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    if (width > maxSide || height > maxSide) {
        if (width > height) {
            height *= maxSide / width;
            width = maxSide;
        } else {
            width *= maxSide / height;
            height = maxSide;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/webp', quality);
};

const resizeImageWithWatermark = (img: HTMLImageElement, maxSide: number, quality: number, watermarkText: string): string => {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // Resize logic
    if (width > maxSide || height > maxSide) {
        if (width > height) {
            height *= maxSide / width;
            width = maxSide;
        } else {
            width *= maxSide / height;
            height = maxSide;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    // Draw Image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply Watermark
    ctx.save();
    ctx.font = `bold ${Math.max(20, width / 20)}px sans-serif`; // Responsive font size
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Marca muito mais visível
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Adicionar sombra para contraste em imagens claras e escuras
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Rotate 45 degrees
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.translate(-width / 2, -height / 2);

    // Draw repeated text grid
    const stepX = width / 3;
    const stepY = height / 3;

    // We draw a grid of text over the image, considering the rotation which makes coordinate space larger
    // Just drawing a big centered "PROVA" or pattern for now simpler:
    // User asked for "diagonal leve ou repetido". 
    // Let's draw a few lines.

    for (let y = -height; y < height * 2; y += stepY) {
        for (let x = -width; x < width * 2; x += stepX) {
            ctx.fillText(watermarkText, x, y);
        }
    }

    ctx.restore();

    return canvas.toDataURL('image/webp', quality);
};
