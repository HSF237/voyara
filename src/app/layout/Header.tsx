import { Languages, Moon, Settings, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { paths } from '@/app/paths';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import { buttonStyles, IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { isLanguageCode, LANGUAGES } from '@/lib/i18n/languages';
import { useSettings } from '@/store/settings';
import { LogoMark } from './Logo';

export function Header() {
  const { t } = useTranslation();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const setTheme = useSettings((state) => state.setTheme);
  const resolvedTheme = useResolvedTheme();
  const dark = resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-2">
        <Link
          to={paths.home}
          className="me-auto flex items-center gap-2.5 rounded-md"
          aria-label={`${t('app.name')} — ${t('nav.home')}`}
        >
          <LogoMark />
          <span className="font-display text-xl font-medium tracking-tight text-ink" translate="no">
            {t('app.name')}
          </span>
        </Link>

        <nav aria-label={t('nav.main')} className="hidden sm:block">
          <NavLink
            to={paths.design}
            className={({ isActive }) =>
              cn(
                'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
              )
            }
          >
            {t('nav.design')}
          </NavLink>
        </nav>

        <div className="relative hidden sm:block">
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
            className="h-9 cursor-pointer appearance-none rounded-full bg-transparent ps-9 pe-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code} lang={item.code}>
                {item.nativeName}
              </option>
            ))}
          </select>
        </div>

        <IconButton
          label={dark ? t('header.toLight') : t('header.toDark')}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        >
          {dark ? (
            <Sun className="size-5" aria-hidden="true" />
          ) : (
            <Moon className="size-5" aria-hidden="true" />
          )}
        </IconButton>

        <NavLink
          to={paths.settings}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
          className={({ isActive }) =>
            cn(buttonStyles({ variant: 'ghost', icon: true }), isActive && 'bg-surface-2')
          }
        >
          <Settings className="size-5" aria-hidden="true" />
        </NavLink>
      </div>
    </header>
  );
}
