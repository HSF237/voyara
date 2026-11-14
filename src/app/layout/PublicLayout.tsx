import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { paths } from '@/app/paths';
import { buttonStyles } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { LanguageSelect, ThemeToggle } from './controls';
import { LogoMark } from './Logo';

/** The public front door: landing page and other pages anyone can open. */
export function PublicLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const signedIn = useAuth((state) => Boolean(state.user));

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-2">
          <Link
            to={paths.home}
            className="me-auto flex items-center gap-2.5 rounded-md"
            aria-label={`${t('app.name')} — ${t('nav.home')}`}
          >
            <LogoMark />
            <span
              className="font-display text-xl font-medium tracking-tight text-ink"
              translate="no"
            >
              {t('app.name')}
            </span>
          </Link>
          <LanguageSelect className="hidden sm:block" />
          <ThemeToggle />
          <Link
            to={signedIn ? paths.dashboard : paths.login}
            className={buttonStyles({ size: 'sm' })}
          >
            {signedIn ? t('nav.openApp') : t('nav.signIn')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <footer className="border-t border-line/70">
        <div className="container-page flex h-16 items-center text-sm text-muted">
          <span translate="no">{t('app.name')}</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span className="truncate">{t('app.tagline')}</span>
          <Link
            to={paths.design}
            className="ms-auto shrink-0 rounded-sm font-medium underline-offset-4 hover:text-ink hover:underline"
          >
            {t('nav.design')}
          </Link>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
