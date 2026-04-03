const CUSTOM_SIZES_KEY = 'ercm_custom_sizes';
const LANGUAGE_KEY = 'ercm_language';

// Custom sizes management
export function getCustomSizes(): Record<string, string[]> {
  const stored = localStorage.getItem(CUSTOM_SIZES_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function addCustomSize(steelType: string, size: string) {
  const custom = getCustomSizes();
  if (!custom[steelType]) custom[steelType] = [];
  if (!custom[steelType].includes(size)) {
    custom[steelType].push(size);
    localStorage.setItem(CUSTOM_SIZES_KEY, JSON.stringify(custom));
  }
}

// Language management
export function getLanguage(): string {
  return localStorage.getItem(LANGUAGE_KEY) || 'en';
}

export function setLanguage(lang: string) {
  localStorage.setItem(LANGUAGE_KEY, lang);
}
