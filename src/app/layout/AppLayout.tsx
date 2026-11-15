import { motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Luggage, Plus, Settings, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { paths } from '@/app/paths';
import { TopProgress } from '@/app/TopProgress';
import { useSession } from '@/app/useSession';
import { UserAvatar } from '@/components/UserAvatar';
import { buttonStyles, IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { verifyGoogleSession } from '@/services/firebase';
import { useAuth } from '@/store/auth';
import { LanguageSelect, ThemeToggle } from './controls';
import { LogoMark } from './Logo';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors',
          isActive ? 'text-primary-ink' : 'text-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-md bg-primary-soft"
              transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            />
          )}
          <item.icon className="relative size-5" aria-hidden="true" />
          <span className="relative truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold transition-colors',
          isActive ? 'text-primary-ink' : 'text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-active"
              className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            />
          )}
          <motion.span animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }}>
            <item.icon className="size-5.5" aria-hidden="true" />
          </motion.span>
          <span className="max-w-20 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/**
 * The signed-in app: a sidebar on wide screens, a top bar and bottom tab bar
 * on phones. Every page inside renders into <Outlet />.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, signOut } = useSession();
  const setUser = useAuth((state) => state.setUser);

  // A remembered Google profile is re-checked once per visit, in the background.
  useEffect(() => {
    if (user?.provider === 'google') void verifyGoogleSession(user.uid, () => setUser(null));
  }, [setUser, user?.provider, user?.uid]);

  if (!user) return null;

  const items: NavItem[] = [
    { to: paths.dashboard, label: t('nav.home'), icon: LayoutDashboard, end: true },
    { to: paths.trips, label: t('nav.trips'), icon: Luggage },
    { to: paths.settings, label: t('nav.settings'), icon: Settings },
  ];
  const [homeItem, tripsItem] = items;

  return (
    <div className="min-h-dvh bg-bg text-ink lg:ps-64">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('nav.skip')}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-line bg-surface p-4 lg:flex">
        <Link to={paths.dashboard} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <LogoMark />
          <span className="font-display text-xl font-medium tracking-tight" translate="no">
            {t('app.name')}
          </span>
        </Link>

        <Link to={paths.setup} className={cn(buttonStyles({ fullWidth: true }), 'mt-6')}>
          <Plus className="size-4" aria-hidden="true" />
          {t('nav.plan')}
        </Link>

        <nav aria-label={t('nav.main')} className="mt-6 flex flex-col gap-1">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-1">
            <LanguageSelect className="min-w-0 flex-1" />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg p-2.5">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email ?? t('auth.guestLabel')}</p>
            </div>
            <IconButton label={t('nav.signOut')} size="sm" onClick={signOut}>
              <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line/70 bg-bg/85 px-4 backdrop-blur-md lg:hidden">
        <Link to={paths.dashboard} className="me-auto flex items-center gap-2 rounded-md">
          <LogoMark className="size-7" />
          <span className="font-display text-lg font-medium tracking-tight" translate="no">
            {t('app.name')}
          </span>
        </Link>
        <ThemeToggle />
        <Link to={paths.settings} aria-label={t('nav.account')} className="rounded-full">
          <UserAvatar user={user} size="sm" />
        </Link>
      </header>

      <main id="main" tabIndex={-1} className="min-w-0 pb-24 outline-none lg:pb-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Phone tab bar, with the main action raised in the middle */}
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-stretch">
          {homeItem && <TabLink item={homeItem} />}
          <div className="flex items-start justify-center">
            <Link
              to={paths.setup}
              aria-label={t('nav.plan')}
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg ring-4 ring-bg transition-transform active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
          {tripsItem && <TabLink item={tripsItem} />}
        </div>
      </nav>
      <TopProgress />
      <ScrollRestoration />
    </div>
  );
}
