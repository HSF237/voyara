import type { LanguageCode } from './languages';

/**
 * Plus Jakarta Sans and Fraunces only cover Latin. Each other script gets a
 * Noto Sans face, fetched the first time that language is selected so English
 * users never download it.
 */
const scriptFontLoaders: Partial<Record<LanguageCode, () => Promise<unknown>>> = {
  ml: () => import('@fontsource-variable/noto-sans-malayalam/index.css'),
  hi: () => import('@fontsource-variable/noto-sans-devanagari/index.css'),
  ta: () => import('@fontsource-variable/noto-sans-tamil/index.css'),
  ar: () => import('@fontsource-variable/noto-sans-arabic/index.css'),
};

const loaded = new Set<LanguageCode>();

export async function loadScriptFont(code: LanguageCode): Promise<void> {
  const loader = scriptFontLoaders[code];
  if (!loader || loaded.has(code)) return;
  loaded.add(code);
  try {
    await loader();
  } catch (error) {
    loaded.delete(code);
    console.warn(`Could not load the font for "${code}"; using the system font.`, error);
  }
}
