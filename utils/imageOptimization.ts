export const getOptimizedImageUrl = (url: string | undefined | null, width: number = 800, quality: number = 80): string => {
    if (!url) return '';
    // If it's a base64 string or an external URL not from Supabase
    if (url.startsWith('data:') || !url.includes('.supabase.co/storage/v1/object/public/')) {
        return url;
    }

    // Convert Supabase object URL to render URL (Image Transformations API)
    let newUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');

    try {
        const urlObj = new URL(newUrl);
        urlObj.searchParams.set('width', width.toString());
        urlObj.searchParams.set('quality', quality.toString());
        urlObj.searchParams.set('resize', 'contain');
        return urlObj.toString();
    } catch (e) {
        return url; // fallback se for URL inválida (não deveria acontecer)
    }
};
