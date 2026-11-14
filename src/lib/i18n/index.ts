import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, type LanguageCode } from './languages';
import en from './locales/en.json';

/** English ships in the main bundle; every other language is its own chunk. */
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*.json',
  '!./locales/en.json',
]);

const lazyLocales: BackendModule = {
  type: 'backend',
  init() {
    /* no options */
  },
  read(language, _namespace, callback) {
    const load = localeLoaders[`./locales/${language}.json`];
    if (!load) {
      callback(new Error(`No translations for "${language}"`), null);
      return;
    }
    load()
      .then((module) => callback(null, module.default))
      .catch((error: unknown) => callback(error as Error, null));
  },
};

export function initI18n(language: LanguageCode) {
  if (i18n.isInitialized) return i18n.changeLanguage(language);

  return i18n
    .use(lazyLocales)
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...LANGUAGE_CODES],
      resources: { en: { translation: en } },
      partialBundledLanguages: true,
      interpolation: { escapeValue: false }, // React already escapes
      returnNull: false,
      react: { useSuspense: false },
    });
}

export { i18n };
