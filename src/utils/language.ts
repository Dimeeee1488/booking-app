export interface PreferredLanguage {
  code: string;
  name: string;
  countryFlag?: string;
}

const STORAGE_KEY = 'preferred_language_v1';
const CHANGE_EVENT = 'preferred-language-change';

export const DEFAULT_LANGUAGE: PreferredLanguage = {
  code: 'en-us',
  name: 'English (US)',
  countryFlag: 'us',
};

const safeWindow = (): Window | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window;
};

export const getPreferredLanguage = (): PreferredLanguage => {
  const win = safeWindow();
  if (!win) {
    return DEFAULT_LANGUAGE;
  }
  try {
    const raw = win.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LANGUAGE;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.code) {
      return DEFAULT_LANGUAGE;
    }
    return {
      code: (parsed.code as string).toLowerCase(),
      name: parsed.name || DEFAULT_LANGUAGE.name,
      countryFlag: (parsed.countryFlag || DEFAULT_LANGUAGE.countryFlag) as string | undefined,
    };
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const getPreferredLanguageCode = (): string => getPreferredLanguage().code;

export const setPreferredLanguage = (language: PreferredLanguage) => {
  const win = safeWindow();
  if (!win) {
    return;
  }
  try {
    const payload = {
      code: language.code.toLowerCase(),
      name: language.name,
      countryFlag: language.countryFlag,
    };
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    win.dispatchEvent(
      new CustomEvent<PreferredLanguage>(CHANGE_EVENT, {
        detail: payload,
      })
    );
  } catch (error) {
    console.warn('Unable to persist preferred language', error);
  }
};

export const subscribeToPreferredLanguage = (
  listener: (language: PreferredLanguage) => void
): (() => void) => {
  const win = safeWindow();
  if (!win) {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<PreferredLanguage>).detail;
    listener(detail || DEFAULT_LANGUAGE);
  };
  win.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () => win.removeEventListener(CHANGE_EVENT, handler as EventListener);
};

