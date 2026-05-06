
/**
 * Utility to share content using the native Web Share API if available,
 * or falling back to a WhatsApp share link.
 */
export const shareContent = async (title: string, text: string, url: string) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing content:', error);
      }
      return false;
    }
  } else {
    // Fallback to WhatsApp
    const shareText = `${text} ${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
    return true;
  }
};
