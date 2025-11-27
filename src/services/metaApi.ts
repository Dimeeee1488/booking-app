const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_KEY = 'meta_languages_cache_v1';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export interface MetaLanguage {
  name: string;
  code: string;
  countryFlag?: string;
  flagEmoji: string;
}

interface LanguagesResponse {
  status: boolean;
  data?: Array<{
    name: string;
    code: string;
    countryFlag?: string;
  }>;
}

interface CacheEntry {
  data: MetaLanguage[];
  timestamp: number;
}

let memoryCache: CacheEntry | null = null;
let inFlight: Promise<MetaLanguage[]> | null = null;

const SPECIAL_FLAGS: Record<string, string> = {
  catalonia: '🏴',
  z4: '🇹🇼',
};

const toFlagEmoji = (value?: string, fallback?: string): string => {
  const raw = (value || fallback || '').toLowerCase();
  if (!raw) return '🌐';
  if (SPECIAL_FLAGS[raw]) {
    return SPECIAL_FLAGS[raw];
  }

  const normalized = raw;
  if (!/^[a-z]{2}$/i.test(normalized)) {
    return '🌐';
  }

  const upper = normalized.toUpperCase();
  const chars = upper.split('');
  const codePoints = chars.map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
};

const readPersistedCache = (): CacheEntry | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const persistCache = (entry: CacheEntry) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g., private mode)
  }
};

const FALLBACK_LANGUAGES: MetaLanguage[] = [
  { name: 'English (UK)', code: 'en-gb', countryFlag: 'gb', flagEmoji: '🇬🇧' },
  { name: 'English (US)', code: 'en-us', countryFlag: 'us', flagEmoji: '🇺🇸' },
  { name: 'Deutsch', code: 'de', countryFlag: 'de', flagEmoji: '🇩🇪' },
  { name: 'Nederlands', code: 'nl', countryFlag: 'nl', flagEmoji: '🇳🇱' },
  { name: 'Français', code: 'fr', countryFlag: 'fr', flagEmoji: '🇫🇷' },
  { name: 'Español', code: 'es', countryFlag: 'es', flagEmoji: '🇪🇸' },
  { name: 'Español (AR)', code: 'es-ar', countryFlag: 'ar', flagEmoji: '🇦🇷' },
  { name: 'Español (MX)', code: 'es-mx', countryFlag: 'mx', flagEmoji: '🇲🇽' },
  { name: 'Català', code: 'ca', countryFlag: 'catalonia', flagEmoji: '🏴' },
  { name: 'Italiano', code: 'it', countryFlag: 'it', flagEmoji: '🇮🇹' },
  { name: 'Português (PT)', code: 'pt-pt', countryFlag: 'pt', flagEmoji: '🇵🇹' },
  { name: 'Português (BR)', code: 'pt-br', countryFlag: 'br', flagEmoji: '🇧🇷' },
  { name: 'Norsk', code: 'no', countryFlag: 'no', flagEmoji: '🇳🇴' },
  { name: 'Suomi', code: 'fi', countryFlag: 'fi', flagEmoji: '🇫🇮' },
  { name: 'Svenska', code: 'sv', countryFlag: 'se', flagEmoji: '🇸🇪' },
  { name: 'Dansk', code: 'da', countryFlag: 'dk', flagEmoji: '🇩🇰' },
  { name: 'Čeština', code: 'cs', countryFlag: 'cz', flagEmoji: '🇨🇿' },
  { name: 'Magyar', code: 'hu', countryFlag: 'hu', flagEmoji: '🇭🇺' },
  { name: 'Română', code: 'ro', countryFlag: 'ro', flagEmoji: '🇷🇴' },
  { name: '日本語', code: 'ja', countryFlag: 'jp', flagEmoji: '🇯🇵' },
  { name: '简体中文', code: 'zh-cn', countryFlag: 'cn', flagEmoji: '🇨🇳' },
  { name: '繁體中文', code: 'zh-tw', countryFlag: 'z4', flagEmoji: '🇹🇼' },
  { name: 'Polski', code: 'pl', countryFlag: 'pl', flagEmoji: '🇵🇱' },
  { name: 'Ελληνικά', code: 'el', countryFlag: 'gr', flagEmoji: '🇬🇷' },
  { name: 'Русский', code: 'ru', countryFlag: 'ru', flagEmoji: '🇷🇺' },
  { name: 'Türkçe', code: 'tr', countryFlag: 'tr', flagEmoji: '🇹🇷' },
  { name: 'Български', code: 'bg', countryFlag: 'bg', flagEmoji: '🇧🇬' },
  { name: 'العربية', code: 'ar', countryFlag: 'sa', flagEmoji: '🇸🇦' },
  { name: '한국어', code: 'ko', countryFlag: 'kr', flagEmoji: '🇰🇷' },
  { name: 'עברית', code: 'he', countryFlag: 'il', flagEmoji: '🇮🇱' },
  { name: 'Latviski', code: 'lv', countryFlag: 'lv', flagEmoji: '🇱🇻' },
  { name: 'Українська', code: 'uk', countryFlag: 'ua', flagEmoji: '🇺🇦' },
  { name: 'हिन्दी', code: 'hi', countryFlag: 'in', flagEmoji: '🇮🇳' },
  { name: 'Bahasa Indonesia', code: 'id', countryFlag: 'id', flagEmoji: '🇮🇩' },
  { name: 'Bahasa Malaysia', code: 'ms', countryFlag: 'my', flagEmoji: '🇲🇾' },
  { name: 'ภาษาไทย', code: 'th', countryFlag: 'th', flagEmoji: '🇹🇭' },
  { name: 'Eesti', code: 'et', countryFlag: 'ee', flagEmoji: '🇪🇪' },
  { name: 'Hrvatski', code: 'hr', countryFlag: 'hr', flagEmoji: '🇭🇷' },
  { name: 'Lietuvių', code: 'lt', countryFlag: 'lt', flagEmoji: '🇱🇹' },
  { name: 'Slovenčina', code: 'sk', countryFlag: 'sk', flagEmoji: '🇸🇰' },
  { name: 'Srpski', code: 'sr', countryFlag: 'rs', flagEmoji: '🇷🇸' },
  { name: 'Slovenščina', code: 'sl', countryFlag: 'si', flagEmoji: '🇸🇮' },
  { name: 'Tiếng Việt', code: 'vi', countryFlag: 'vn', flagEmoji: '🇻🇳' },
  { name: 'Filipino', code: 'tl', countryFlag: 'ph', flagEmoji: '🇵🇭' },
  { name: 'Íslenska', code: 'is', countryFlag: 'is', flagEmoji: '🇮🇸' },
];

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  
  // Check if response is HTML (error page) instead of JSON
  if (!contentType.includes('application/json') || rawText.trim().startsWith('<!')) {
    // Silent fail - will use fallback list
    throw new Error('API returned HTML instead of JSON');
  }
  
  try {
    return JSON.parse(rawText);
  } catch (err) {
    // Silent fail - will use fallback list
    throw new Error('Invalid JSON response');
  }
};

const sanitizeLanguages = (payload?: LanguagesResponse): MetaLanguage[] => {
  if (!payload?.status || !Array.isArray(payload.data)) {
    return [];
  }

  try {
    const sanitized: MetaLanguage[] = [];

    for (const entry of payload.data) {
      try {
        if (!entry) continue;
        const name =
          typeof entry.name === 'string'
            ? entry.name.trim()
            : '';
        const code =
          typeof entry.code === 'string'
            ? entry.code.trim().toLowerCase()
            : '';
        if (!name || !code) continue;
        const countryFlag =
          typeof entry.countryFlag === 'string'
            ? entry.countryFlag.trim().toLowerCase()
            : undefined;
        sanitized.push({
          name,
          code,
          countryFlag,
          flagEmoji: toFlagEmoji(countryFlag, code),
        });
      } catch (err) {
        console.warn('Skipping invalid language entry', entry, err);
      }
    }

    return sanitized.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('Failed to sanitize languages payload', err);
    return [];
  }
};

export const getLanguages = async (): Promise<MetaLanguage[]> => {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL) {
    return memoryCache.data;
  }

  if (!memoryCache) {
    const persisted = readPersistedCache();
    if (persisted && now - persisted.timestamp < CACHE_TTL) {
      memoryCache = persisted;
      return persisted.data;
    }
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/meta/languages`);
      if (!response.ok) {
        throw new Error(`Failed to load languages: ${response.status}`);
      }
      const data: LanguagesResponse = await parseJsonResponse(response);
      const sanitized = sanitizeLanguages(data);
      const safeList = sanitized.length > 0 ? sanitized : FALLBACK_LANGUAGES;
      const entry: CacheEntry = { data: safeList, timestamp: Date.now() };
      memoryCache = entry;
      persistCache(entry);
      return safeList;
    } catch (error: any) {
      // Don't show errors for HTML responses - it's expected when API is down
      const isHtmlError = error?.message?.includes('HTML instead of JSON');
      if (!isHtmlError) {
        console.warn('Unable to fetch languages from API, using fallback', error);
      }
      if (memoryCache) {
        return memoryCache.data;
      }
      const fallback = readPersistedCache();
      if (fallback) {
        memoryCache = fallback;
        return fallback.data;
      }
      memoryCache = { data: FALLBACK_LANGUAGES, timestamp: Date.now() };
      persistCache(memoryCache);
      return FALLBACK_LANGUAGES;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

