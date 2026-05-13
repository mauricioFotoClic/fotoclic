
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
export const includesNormalized = (target: string, search: string): boolean => {
  if (!target || !search) return false;
  return normalizeString(target).includes(normalizeString(search));
};
