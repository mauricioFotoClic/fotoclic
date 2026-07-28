/**
 * Web Worker for Off-Main-Thread Image Processing and Watermarking
 * High performance hardware-accelerated processing via OffscreenCanvas
 */

self.onmessage = async (e) => {
    const { id, file, watermarkText } = e.data;
    try {
        let source;
        let width = 0;
        let height = 0;

        try {
            source = await createImageBitmap(file);
            width = source.width;
            height = source.height;
        } catch (err) {
            throw new Error(`Falha ao ler bitmap da imagem: ${err.message}`);
        }

        // 1. Generate Thumb Blob (Max 500px, 0.82 WebP quality)
        const thumbBlob = await drawToBlob(source, width, height, 500, 0.82, false);

        // 2. Generate Preview Blob (Max 2048px 2K, 0.85 WebP quality + Watermark)
        const previewBlob = await drawToBlob(source, width, height, 2048, 0.85, true, watermarkText || "FOTOCLIC   PROVA   ");

        if (source && typeof source.close === 'function') {
            source.close();
        }

        self.postMessage({
            id,
            success: true,
            thumbBlob,
            previewBlob,
            width,
            height
        });
    } catch (error) {
        self.postMessage({
            id,
            success: false,
            error: error.message || "Erro no Web Worker ao processar imagem."
        });
    }
};

async function drawToBlob(img, origW, origH, maxSide, quality, addWatermark, watermarkText) {
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

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error("Falha ao obter contexto 2d de OffscreenCanvas.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    if (addWatermark) {
        ctx.save();
        ctx.font = `bold ${Math.max(22, Math.round(width / 18))}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.translate(width / 2, height / 2);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);

        const stepX = Math.round(width / 3);
        const stepY = Math.round(height / 3);

        for (let y = -height; y < height * 2; y += stepY) {
            for (let x = -width; x < width * 2; x += stepX) {
                ctx.fillText(watermarkText, x, y);
            }
        }
        ctx.restore();
    }

    return await canvas.convertToBlob({ type: 'image/webp', quality });
}
