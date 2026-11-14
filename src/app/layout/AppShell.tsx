import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { paths } from '@/app/paths';
import { Header } from './Header';

export function AppShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('nav.skip')}
      </a>
      <Header />
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
