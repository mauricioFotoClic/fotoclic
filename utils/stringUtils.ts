
/**
 * Normalizes a string by converting it to lowercase, removing accents and special characters.
 * Useful for accent-insensitive and case-insensitive comparisons.
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Checks if a search term is contained within a target string, ignoring accents and case.
 */
export const includesNormalized = (target?: string | null, search?: string | null): boolean => {
  if (!search || search.trim() === '') return true;
  if (!target) return false;
  return normalizeString(target).includes(normalizeString(search));
};

/**
 * Escapes HTML characters to prevent XSS attacks in rendered templates.
 */
export const escapeHtml = (str: string): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Retorna a URL do avatar provisório usando o serviço ui-avatars.com com a cor primária (laranja) do FotoClic.
 */
export const getAvatarFallbackUrl = (name: string, size: number = 128): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'F')}&background=f97316&color=fff&size=${size}`;
};

