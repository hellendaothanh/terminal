import { TerminalSettings } from '../types';
import { translations, Language } from './translations';

export function useTranslation(settings?: TerminalSettings) {
  const lang: Language = settings?.language || 'vi';
  const dict = translations[lang] || translations.vi;

  const t = (key: keyof typeof translations.vi): string => {
    return dict[key] || translations.vi[key] || key;
  };

  return { t, lang };
}
