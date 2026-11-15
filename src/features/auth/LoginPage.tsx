import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageSelect, ThemeToggle } from '@/app/layout/controls';
import { LogoMark } from '@/app/layout/Logo';
import { paths, safeNext } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { PhotoCredit } from '@/components/PhotoCredit';
import { Button, toast } from '@/components/ui';
import { DESTINATIONS, photoAt } from '@/features/destinations/catalog';
import { cn } from '@/lib/cn';
import { authProblem, signInWithGoogle } from '@/services/firebase';
import { GUEST_EMOJIS, makeGuest, useAuth } from '@/store/auth';

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const panelPhoto = DESTINATIONS.find((item) => item.id === 'cur:munnar');

/** Sign in with Google, or start straight away as a guest with a name and avatar. */
export function LoginPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.signIn'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const user = useAuth((state) => state.user);
  const setUser = useAuth((state) => state.setUser);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(GUEST_EMOJIS[0] ?? '🧭');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function handleGoogle() {
    setBusy(true);
    try {
      setUser(await signInWithGoogle());
      void navigate(next, { replace: true });
    } catch (error) {
      const problem = authProblem(error);
      if (problem !== 'popupClosed') console.error('Google sign-in failed', error);
      toast({
        title: t(`auth.errors.${problem}`),
        tone: problem === 'popupClosed' ? 'neutral' : 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  function handleGuest(event: FormEvent) {
    event.preventDefault();
    setUser(makeGuest(name.trim() || t('auth.guestLabel'), emoji));
    void navigate(next, { replace: true });
  }

  return (
    <div className="grid min-h-dvh bg-bg text-ink lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col">
        {panelPhoto && (
          <>
            <img
              src={photoAt(panelPhoto.photo, 1280)}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-black/35" />
          </>
        )}
        <Link to={paths.home} className="relative flex items-center gap-2.5 self-start rounded-md">
          <LogoMark className="ring-1 ring-white/40" />
          <span className="font-display text-xl font-medium tracking-tight" translate="no">
            {t('app.name')}
          </span>
        </Link>
        <motion.div
          variants={list}
          initial="hidden"
          animate="show"
          className="relative mt-auto max-w-md"
        >
          <motion.p
            variants={rise}
            className="font-display text-3xl leading-tight font-normal tracking-tight"
          >
            {t('home.titleLead')} <em>{t('home.titleEmphasis')}</em>
          </motion.p>
          <ul className="mt-8 space-y-3">
            {(['one', 'two', 'three'] as const).map((key) => (
              <motion.li key={key} variants={rise} className="flex items-center gap-3 text-base">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {t(`auth.points.${key}`)}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        {panelPhoto && (
          <PhotoCredit photo={panelPhoto.photo} className="relative mt-6 text-white/70" />
        )}
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center gap-1">
          <Link
            to={paths.home}
            className="me-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            <span className="lg:hidden" translate="no">
              {t('app.name')}
            </span>
            <span className="hidden lg:inline">{t('nav.home')}</span>
          </Link>
          <LanguageSelect />
          <ThemeToggle />
        </div>

        <motion.main
          variants={list}
          initial="hidden"
          animate="show"
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
        >
          <motion.div variants={rise}>
            <LogoMark className="size-11 lg:hidden" />
            <h1 className="mt-5 font-display text-2xl font-medium tracking-tight sm:text-3xl lg:mt-0">
              {t('auth.title')}
            </h1>
            <p className="mt-2 text-muted">{t('auth.subtitle')}</p>
          </motion.div>

          <motion.div variants={rise} className="mt-8">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={busy}
              onClick={() => void handleGoogle()}
              iconStart={<LogIn className="size-5" aria-hidden="true" />}
            >
              {t('auth.google')}
            </Button>
          </motion.div>

          <motion.div variants={rise} className="my-7 flex items-center gap-4 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-line" />
          </motion.div>

          <motion.form variants={rise} onSubmit={handleGuest}>
            <h2 className="font-display text-lg font-medium">{t('auth.guestTitle')}</h2>
            <label htmlFor="guest-name" className="mt-4 mb-2 block text-sm font-medium">
              {t('auth.guestName')}
            </label>
            <input
              id="guest-name"
              type="text"
              autoComplete="given-name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('auth.guestNamePlaceholder')}
              className="h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted"
            />
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium">{t('auth.pickAvatar')}</legend>
              <div className="grid grid-cols-6 gap-2">
                {GUEST_EMOJIS.map((option) => (
                  <label key={option} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="avatar"
                      value={option}
                      checked={emoji === option}
                      onChange={() => setEmoji(option)}
                      className="peer sr-only"
                    />
                    <motion.span
                      whileTap={{ scale: 0.9 }}
                      animate={{ scale: emoji === option ? 1.08 : 1 }}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-md border text-2xl transition-colors',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                        emoji === option
                          ? 'border-primary bg-primary-soft'
                          : 'border-line bg-surface hover:bg-surface-2',
                      )}
                    >
                      {option}
                    </motion.span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-6"
              iconEnd={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
            >
              {t('auth.guestGo')}
            </Button>
            <p className="mt-3 text-center text-sm text-muted">{t('auth.guestNote')}</p>
          </motion.form>
        </motion.main>
      </div>
    </div>
  );
}
