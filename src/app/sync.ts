import { loadScriptFont } from '@/lib/i18n/fonts';
import { i18n } from '@/lib/i18n';
import { getLanguage, type LanguageCode } from '@/lib/i18n/languages';
import { useSettings, type ThemePreference } from '@/store/settings';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(theme: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme: ThemePreference): void {
  const resolved = resolveTheme(theme, window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');

  // Keep the browser chrome (address bar on mobile) matching the page.
  const background = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (background) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute('media');
      meta.setAttribute('content', background);
    });
  }
}

export function applyLanguage(code: LanguageCode): void {
  const { dir } = getLanguage(code);
  const root = document.documentElement;
  root.lang = code;
  root.dir = dir;
  void loadScriptFont(code);
  if (i18n.isInitialized && i18n.language !== code) void i18n.changeLanguage(code);
}

/**
 * Keeps <html> (theme class, lang, dir) and i18next in step with the settings
 * store. Called once from main.tsx; returns a cleanup function for tests.
 */
export function startSettingsSync(): () => void {
  const { theme, language } = useSettings.getState();
  applyTheme(theme);
  applyLanguage(language);

  const unsubscribe = useSettings.subscribe((state, previous) => {
    if (state.theme !== previous.theme) applyTheme(state.theme);
    if (state.language !== previous.language) applyLanguage(state.language);
  });

  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (useSettings.getState().theme === 'system') applyTheme('system');
  };
  media.addEventListener('change', onSystemChange);

  return () => {
    unsubscribe();
    media.removeEventListener('change', onSystemChange);
  };
}
