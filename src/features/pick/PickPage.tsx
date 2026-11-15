import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Heart, RotateCcw, Sparkles, Star, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NotFoundPage } from '@/app/NotFoundPage';
import { planPath } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { LoaderMark } from '@/components/Loader';
import { Photo } from '@/components/Photo';
import { Scene } from '@/components/Scene';
import { Button, Card } from '@/components/ui';
import { categoryLabel, categoryScenes } from '@/features/places/category';
import type { Trip } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { daysOfTrip } from '@/lib/dates';
import { scorePlace } from '@/planner/categories';
import { PACE_RULES } from '@/planner/optimise';
import type { PlaceCandidate } from '@/planner/types';
import { ServiceError } from '@/services/http';
import { usePlaces } from '@/services/queries';
import { useTrips } from '@/store/trips';
import { SwipeCard, type Verdict } from './SwipeCard';

type Verdicts = Record<string, Verdict>;

function RoundButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full border shadow-md transition-opacity disabled:opacity-40',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

function Deck({ trip, places }: { trip: Trip; places: PlaceCandidate[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const savePicks = useTrips((state) => state.savePicks);

  // Best match first: famous places and the trip's interests lead the deck.
  const ordered = useMemo(
    () => [...places].sort((a, b) => scorePlace(b, trip.interests) - scorePlace(a, trip.interests)),
    [places, trip.interests],
  );
  const [verdicts, setVerdicts] = useState<Verdicts>(() => {
    const must = new Set(trip.picks?.mustIds);
    return Object.fromEntries(
      (trip.picks?.places ?? []).map((place) => [place.id, must.has(place.id) ? 'must' : 'keep']),
    );
  });
  const [history, setHistory] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<Verdict>();

  const waiting = ordered.filter((place) => !verdicts[place.id]);
  const kept = ordered.filter((place) => verdicts[place.id] === 'keep' || verdicts[place.id] === 'must'); // prettier-ignore
  const skipped = ordered.filter((place) => verdicts[place.id] === 'skip').length;
  const current = waiting[0];
  const suggested = daysOfTrip(trip.startDate, trip.endDate).length * PACE_RULES[trip.pace].stopsPerDay; // prettier-ignore

  function judge(verdict: Verdict) {
    if (!current) return;
    setLeaving(verdict);
    setVerdicts((all) => ({ ...all, [current.id]: verdict }));
    setHistory((ids) => [...ids, current.id]);
  }

  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((ids) => ids.slice(0, -1));
    setVerdicts(({ [last]: _, ...rest }) => rest);
  }

  // The key handler is attached once and always calls the latest judge/undo.
  const actions = useRef({ judge, undo });
  useEffect(() => {
    actions.current = { judge, undo };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest('input, textarea, select, [role="dialog"]')) return;
      const rtl = document.documentElement.dir === 'rtl';
      if (event.key === 'ArrowRight') actions.current.judge(rtl ? 'skip' : 'keep');
      else if (event.key === 'ArrowLeft') actions.current.judge(rtl ? 'keep' : 'skip');
      else if (event.key === 'ArrowUp') actions.current.judge('must');
      else if (event.key === 'Backspace' || event.key.toLowerCase() === 'z') actions.current.undo();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function pickForMe() {
    const room = Math.max(0, suggested - kept.length);
    setVerdicts((all) => ({
      ...all,
      ...Object.fromEntries(waiting.slice(0, room).map((place) => [place.id, 'keep' as const])),
    }));
  }

  function build() {
    savePicks(trip.id, {
      places: kept,
      mustIds: kept.filter((place) => verdicts[place.id] === 'must').map((place) => place.id),
    });
    void navigate(planPath(trip.id));
  }

  const toggleMust = (id: string) =>
    setVerdicts((all) => ({ ...all, [id]: all[id] === 'must' ? 'keep' : 'must' }));
  const remove = (id: string) => setVerdicts(({ [id]: _, ...rest }) => rest);
  const canBuild = kept.length >= 2;

  return (
    <div className="mt-5 grid gap-8 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="mx-auto w-full max-w-md">
        {/* On phones the card is sized so the buttons under it stay above the tab bar. */}
        <div className="relative h-[clamp(19rem,calc(100dvh-24rem),34rem)] w-full sm:aspect-[4/5] sm:h-auto sm:max-h-[34rem]">
          <AnimatePresence custom={leaving}>
            {waiting
              .slice(0, 3)
              .reverse()
              .map((place) => (
                <SwipeCard
                  key={place.id}
                  place={place}
                  depth={waiting.indexOf(place)}
                  onVerdict={judge}
                />
              ))}
          </AnimatePresence>

          {!current && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 grid place-items-center rounded-[1.75rem] border border-dashed border-line-strong bg-surface p-8 text-center"
            >
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary-ink">
                  <Sparkles className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-display text-2xl font-medium tracking-tight">
                  {t('pick.doneTitle')}
                </h2>
                <p className="mt-2 text-muted">{t('pick.doneBody')}</p>
                {skipped > 0 && (
                  <Button
                    variant="secondary"
                    className="mt-6"
                    iconStart={<RotateCcw className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      setHistory([]);
                      setVerdicts((all) =>
                        Object.fromEntries(
                          Object.entries(all).filter(([, verdict]) => verdict !== 'skip'),
                        ),
                      );
                    }}
                  >
                    {t('pick.again')}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-7 flex items-center justify-center gap-3 sm:mt-8 sm:gap-4">
          <RoundButton
            label={t('pick.undo')}
            onClick={undo}
            disabled={history.length === 0}
            className="size-11 border-line bg-surface text-muted"
          >
            <RotateCcw className="size-4.5" aria-hidden="true" />
          </RoundButton>
          <RoundButton
            label={t('pick.skip')}
            onClick={() => judge('skip')}
            disabled={!current}
            className="size-16 border-line bg-surface text-ink"
          >
            <X className="size-7" aria-hidden="true" />
          </RoundButton>
          <RoundButton
            label={t('pick.must')}
            onClick={() => judge('must')}
            disabled={!current}
            className="size-13 border-transparent bg-accent text-on-accent"
          >
            <Star className="size-5.5" aria-hidden="true" />
          </RoundButton>
          <RoundButton
            label={t('pick.keep')}
            onClick={() => judge('keep')}
            disabled={!current}
            className="size-16 border-transparent bg-primary text-on-primary"
          >
            <Heart className="size-7" aria-hidden="true" />
          </RoundButton>
          <RoundButton
            label={t('pick.surprise')}
            onClick={pickForMe}
            disabled={!current || kept.length >= suggested}
            className="size-11 border-line bg-surface text-muted"
          >
            <Wand2 className="size-4.5" aria-hidden="true" />
          </RoundButton>
        </div>
        <p className="mt-4 hidden text-center text-xs text-muted sm:block">{t('pick.keys')}</p>
        <p className="mt-3 text-center text-xs text-muted" dir="ltr">
          <a
            href="https://opentripmap.io"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            OpenTripMap
          </a>{' '}
          ·{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            © OpenStreetMap
          </a>{' '}
          · Wikipedia
        </p>
      </div>

      <Card className="lg:sticky lg:top-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium text-ink">{t('pick.yours')}</h2>
          <p className="text-sm text-muted tabular-nums" aria-live="polite">
            {t('pick.kept', { count: kept.length })} · {t('pick.left', { count: waiting.length })}
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${Math.min(100, (kept.length / Math.max(1, suggested)) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>

        {kept.length === 0 ? (
          <p className="mt-5 text-sm text-muted">{t('pick.none')}</p>
        ) : (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pe-1">
            <AnimatePresence initial={false}>
              {kept.map((place) => {
                const must = verdicts[place.id] === 'must';
                return (
                  <motion.li
                    key={place.id}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="flex items-center gap-3 rounded-lg border border-line p-2"
                  >
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      <Photo
                        src={place.image}
                        fallback={<Scene name={categoryScenes[place.category]} />}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {place.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {categoryLabel(t, place.category)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-pressed={must}
                      aria-label={`${t('pick.must')}: ${place.name}`}
                      onClick={() => toggleMust(place.id)}
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
                        must ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-surface-2',
                      )}
                    >
                      <Star className={cn('size-4', must && 'fill-current')} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('pick.remove', { name: place.name })}
                      onClick={() => remove(place.id)}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        <Button
          fullWidth
          size="lg"
          className="mt-5"
          disabled={!canBuild}
          onClick={build}
          iconStart={<Sparkles className="size-4.5" aria-hidden="true" />}
        >
          {t('pick.build')}
        </Button>
        {!canBuild && <p className="mt-2 text-center text-xs text-muted">{t('pick.buildHint')}</p>}
      </Card>
    </div>
  );
}

/** The swipe deck: real places for the trip's destination, one card at a time. */
export function PickPage() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const trip = useTrips((state) => state.trips.find((item) => item.id === tripId));
  usePageTitle(t('pick.title'));
  const places = usePlaces(trip?.destination);

  if (!trip) return <NotFoundPage />;
  const name = trip.destination.name;
  // 503 means the server has no key for the places source: a deployment step, not a network fault.
  const notSetUp = places.error instanceof ServiceError && places.error.status === 503;

  return (
    <div className="container-page py-5 sm:py-10">
      <Link
        to={planPath(trip.id)}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {name}
      </Link>
      <h1 className="mt-2 font-display text-xl font-medium tracking-tight text-ink sm:mt-3 sm:text-3xl">
        {t('pick.title')}
      </h1>
      <p className="mt-2 hidden max-w-2xl text-muted sm:block">{t('pick.lead', { place: name })}</p>

      {places.isPending && (
        <div
          role="status"
          className="mx-auto mt-10 grid max-w-md place-items-center gap-6 rounded-[1.75rem] border border-line bg-surface px-8 py-20 text-center shadow-sm"
        >
          <LoaderMark />
          <div>
            <p className="font-display text-xl font-medium text-ink">
              {t('pick.finding', { place: name })}
            </p>
            <p className="mt-1.5 text-sm text-muted">{t('pick.findingHint')}</p>
          </div>
        </div>
      )}

      {places.isError && (
        <Card className="mx-auto mt-10 max-w-md text-center">
          <h2 className="font-display text-xl font-medium text-ink">
            {t(notSetUp ? 'pick.setupTitle' : 'pick.errorTitle')}
          </h2>
          <p className="mt-2 text-muted">{t(notSetUp ? 'pick.setupBody' : 'pick.errorBody')}</p>
          <Button className="mt-6" onClick={() => void places.refetch()}>
            {t('pick.retry')}
          </Button>
        </Card>
      )}

      {places.data?.length === 0 && (
        <Card className="mx-auto mt-10 max-w-md text-center">
          <h2 className="font-display text-xl font-medium text-ink">{t('pick.emptyTitle')}</h2>
          <p className="mt-2 text-muted">{t('pick.emptyBody')}</p>
        </Card>
      )}

      {places.data && places.data.length > 0 && <Deck trip={trip} places={places.data} />}
    </div>
  );
}
