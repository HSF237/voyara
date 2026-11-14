import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { isLanguageCode, LANGUAGES } from '@/lib/i18n/languages';
import { useSettings } from '@/store/settings';

/** Light/dark switch used in every header and the sidebar. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const setTheme = useSettings((state) => state.setTheme);
  const dark = useResolvedTheme() === 'dark';
  return (
    <IconButton
      label={dark ? t('header.toLight') : t('header.toDark')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={className}
    >
      {dark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </IconButton>
  );
}

/** Compact language picker (native select, so it is fully accessible on phones). */
export function LanguageSelect({ className }: { className?: string }) {
  const { t } = useTranslation();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  return (
    <div className={cn('relative', className)}>
      <Languages
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <select
        aria-label={t('header.language')}
        value={language}
        onChange={(event) => {
          if (isLanguageCode(event.target.value)) setLanguage(event.target.value);
        }}
        className="h-9 w-full cursor-pointer appearance-none rounded-full bg-transparent ps-9 pe-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code} lang={item.code}>
            {item.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
