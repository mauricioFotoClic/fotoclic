
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

/**
 * Formata CPF aplicando a máscara 000.000.000-00 e aceitando apenas números.
 */
export const formatCPF = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length > 9) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  }
  if (digits.length > 6) {
    return digits.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (digits.length > 3) {
    return digits.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  }
  return digits;
};

/**
 * Validação rigorosa do algoritmo de CPF brasileiro (11 dígitos e dígitos verificadores).
 */
export const isValidCPF = (cpf: string): boolean => {
  const clean = (cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

/**
 * Formata Data de Aniversário / Nascimento aplicando a máscara DD/MM/AAAA aceitando apenas números.
 */
export const formatBirthDate = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) {
    return digits.replace(/^(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  }
  if (digits.length > 2) {
    return digits.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
  }
  return digits;
};

/**
 * Valida se uma data no formato DD/MM/AAAA é válida no calendário e não está no futuro.
 */
export const isValidBirthDate = (dateStr: string): boolean => {
  const clean = (dateStr || '').replace(/\D/g, '');
  if (clean.length !== 8) return false;

  const day = parseInt(clean.slice(0, 2), 10);
  const month = parseInt(clean.slice(2, 4), 10);
  const year = parseInt(clean.slice(4, 8), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return false;
  }

  if (dateObj > new Date()) return false;

  return true;
};

/**
 * Converte DD/MM/AAAA para formato ISO YYYY-MM-DD.
 */
export const parseDateToISO = (dateStr: string): string | null => {
  const clean = (dateStr || '').replace(/\D/g, '');
  if (clean.length !== 8) return null;
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
};


