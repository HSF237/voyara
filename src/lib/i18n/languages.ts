export const LANGUAGE_CODES = ['en', 'ms', 'ml', 'hi', 'ar', 'ta'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type Language = {
  code: LanguageCode;
  /** Name in the language itself — what a speaker looks for in a list. */
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
};

const ENGLISH: Language = { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr' };

export const LANGUAGES: readonly Language[] = [
  ENGLISH,
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', dir: 'ltr' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function getLanguage(code: LanguageCode): Language {
  return LANGUAGES.find((language) => language.code === code) ?? ENGLISH;
}

/** Pick the first supported language from a browser preference list. */
export function detectLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguageCode(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
