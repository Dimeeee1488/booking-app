import { useMemo } from 'react';
import { translate, type TranslationKey } from '../localization';
import { getPreferredLanguageCode } from '../utils/language';
import { subscribeToPreferredLanguage } from '../utils/language';
import { useState, useEffect } from 'react';

export const useTranslation = () => {
  const [languageCode, setLanguageCode] = useState(getPreferredLanguageCode());

  useEffect(() => {
    const unsubscribe = subscribeToPreferredLanguage((language) => {
      setLanguageCode(language.code);
    });
    return unsubscribe;
  }, []);

  const t = useMemo(
    () => (key: TranslationKey) => translate(languageCode, key),
    [languageCode]
  );

  return { t, languageCode };
};

