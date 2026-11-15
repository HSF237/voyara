import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectLanguage, isLanguageCode, type LanguageCode } from '@/lib/i18n/languages';
import {
  detectCurrency,
  detectUnits,
  isCurrencyCode,
  type CurrencyCode,
  type UnitSystem,
} from '@/lib/locale';

export type ThemePreference = 'light' | 'dark' | 'system';
const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export type SettingsValues = {
  theme: ThemePreference;
  language: LanguageCode;
  currency: CurrencyCode;
  units: UnitSystem;
};

type SettingsActions = {
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setUnits: (units: UnitSystem) => void;
  reset: () => void;
};

export type SettingsState = SettingsValues & SettingsActions;

/** localStorage key. public/boot.js reads the same key before first paint. */
export const SETTINGS_STORAGE_KEY = 'voyara.settings';

/** First-visit defaults, guessed from the browser so nobody has to set them. */
export function detectDefaults(): SettingsValues {
  const tags = typeof navigator === 'undefined' ? [] : (navigator.languages ?? []);
  const primary = tags[0];
  return {
    theme: 'light',
    language: detectLanguage(tags),
    currency: detectCurrency(primary),
    units: detectUnits(primary),
  };
}

/** Drop anything unexpected that might be sitting in localStorage. */
function sanitize(saved: unknown, defaults: SettingsValues): SettingsValues {
  const s = (saved ?? {}) as Partial<Record<keyof SettingsValues, unknown>>;
  return {
    theme: THEMES.includes(s.theme as ThemePreference)
      ? (s.theme as ThemePreference)
      : defaults.theme,
    language: isLanguageCode(s.language) ? s.language : defaults.language,
    currency: isCurrencyCode(s.currency) ? s.currency : defaults.currency,
    units: s.units === 'metric' || s.units === 'imperial' ? s.units : defaults.units,
  };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...detectDefaults(),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setUnits: (units) => set({ units }),
      reset: () => set(detectDefaults()),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 2,
      // v2 made light the default: earlier visitors on "system" move to it once.
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Partial<SettingsValues>;
        return version < 2 && saved.theme === 'system' ? { ...saved, theme: 'light' } : saved;
      },
      partialize: ({ theme, language, currency, units }) => ({ theme, language, currency, units }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted, current) }),
    },
  ),
);
