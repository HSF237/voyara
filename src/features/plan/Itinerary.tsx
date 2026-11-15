import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Car,
  CloudRain,
  Clock3,
  Footprints,
  RefreshCw,
  Route,
  Shuffle,
  Sparkles,
  Star,
  Utensils,
  X,
} from 'lucide-react';
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { pickPath } from '@/app/paths';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import { Photo } from '@/components/Photo';
import { PhotoCredit } from '@/components/PhotoCredit';
import { Scene } from '@/components/Scene';
import { Badge, Button } from '@/components/ui';
import { buttonStyles } from '@/components/ui/button.styles';
import { photoAt } from '@/features/destinations/catalog';
import { useDestinationPhoto } from '@/features/destinations/useDestinationPhoto';
import { categoryIcons, categoryLabel, categoryScenes } from '@/features/places/category';
import { weatherIcons } from '@/features/setup/weatherIcons';
import type { Trip, TripPicks } from '@/features/trip/model';
import { useTripForecast } from '@/features/trip/useTripForecast';
import { cn } from '@/lib/cn';
import { formatDateRange, formatDay } from '@/lib/dates';
import { checkDay, type DayNotice } from '@/planner/checks';
import { rescheduleDay } from '@/planner/optimise';
import type { DayPlan, Plan, PlaceCandidate, PlanStop } from '@/planner/types';
import { flagEmoji } from '@/services/geocoding';
import { useTrips } from '@/store/trips';
import { AskVoyara } from './AskVoyara';
import { RouteSketch, type RoutePoint } from './RouteSketch';

// The map library is large: it downloads only when a plan is on screen.
const RouteMap = lazy(() => import('./RouteMap'));

function TravelRow({ stop }: { stop: PlanStop }) {
  const { t } = useTranslation();
  const Icon = stop.travelMode === 'walk' ? Footprints : Car;
  return (
    <li
      className="flex items-center gap-2 py-2 ps-[4.75rem] text-xs text-muted"
      aria-label={t('plan.travel')}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>
        {t(`plan.${stop.travelMode}`)} · {t('plan.min', { count: stop.travelMin })} ·{' '}
        {t('plan.km', { count: stop.travelKm })}
      </span>
    </li>
  );
}

function StopRow({
  stop,
  place,
  number,
  must,
  active,
  first,
  last,
  onActive,
  onMove,
  onRemove,
}: {
  stop: PlanStop;
  place: PlaceCandidate;
  number: number;
  must: boolean;
  active: boolean;
  first: boolean;
  last: boolean;
  onActive: (id: string | undefined) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const Icon = categoryIcons[place.category];
  const tool = 'grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <motion.li
      layout="position"
      id={`stop-${place.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => onActive(place.id)}
      onMouseLeave={() => onActive(undefined)}
      onFocus={() => onActive(place.id)}
      className="flex scroll-mt-24 gap-3"
    >
      <div className="w-12 shrink-0 pt-4 text-end">
        <p className="text-sm font-semibold text-ink tabular-nums" dir="ltr">
          {stop.start}
        </p>
        <p className="text-xs text-muted tabular-nums" dir="ltr">
          {stop.end}
        </p>
      </div>
      <div className="flex flex-col items-center pt-3.5">
        <span
          className={cn(
            'relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-4 ring-bg transition-colors',
            active ? 'bg-accent text-on-accent' : 'bg-primary text-on-primary',
          )}
        >
          {number}
        </span>
      </div>
      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl border bg-surface p-3 shadow-sm transition-[border-color,box-shadow] sm:p-4',
          active ? 'border-primary shadow-md' : 'border-line',
        )}
      >
        <div className="flex gap-3">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:size-[4.5rem]">
            <Photo src={place.image} fallback={<Scene name={categoryScenes[place.category]} />} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base leading-snug font-semibold text-pretty text-ink">
              {place.name}
              {must && (
                <Star className="ms-1.5 inline size-3.5 -translate-y-px fill-accent text-accent" aria-label={t('pick.must')} />
              )}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {categoryLabel(t, place.category)} · {t('plan.min', { count: place.durationMin })}
              </span>
            </p>
            {place.address && <p className="mt-0.5 truncate text-xs text-muted">{place.address}</p>}
          </div>
        </div>
        {stop.tip && (
          <p className="mt-3 flex gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-ink">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary-ink" aria-hidden="true" />
            <span>{stop.tip}</span>
          </p>
        )}
        <div className="-mx-1 mt-2 -mb-1.5 flex justify-end gap-0.5">
          <button type="button" className={tool} disabled={first} onClick={() => onMove(-1)} aria-label={`${t('plan.moveUp')}: ${place.name}`}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={tool} disabled={last} onClick={() => onMove(1)} aria-label={`${t('plan.moveDown')}: ${place.name}`}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={tool} onClick={onRemove} aria-label={`${t('plan.removeStop')}: ${place.name}`}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.li>
  );
} // prettier-ignore

/** One thing worth a second look in the day, in plain words. */
function Notice({ notice, placeName }: { notice: DayNotice; placeName?: string }) {
  const { t } = useTranslation();
  const Icon = notice.code === 'rain' ? CloudRain : notice.code === 'late' ? Clock3 : Route;
  const text =
    notice.code === 'rain'
      ? t('warn.rain', { chance: notice.chance, count: notice.outdoor })
      : notice.code === 'late'
        ? t('warn.late', { time: notice.ends })
        : notice.code === 'packed'
          ? t('warn.packed', { count: notice.stops, limit: notice.limit })
          : notice.code === 'longHop'
            ? t('warn.longHop', { count: notice.minutes, place: placeName ?? '' })
            : t('warn.travel', { count: notice.minutes });
  return (
    <li className="flex items-start gap-2.5 rounded-lg bg-accent-soft px-3.5 py-2.5 text-sm text-ink">
      <Icon className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden="true" />
      <span>{text}</span>
    </li>
  );
}

type ItineraryProps = {
  trip: Trip;
  picks: TripPicks;
  plan: Plan;
  /** Trip-level actions (edit details, delete), shown under the plan. */
  footer?: ReactNode;
};

/** The day-by-day plan: day tabs, a timeline of stops with travel between them, and the route map. */
export function Itinerary({ trip, picks, plan, footer }: ItineraryProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const theme = useResolvedTheme();
  const savePlan = useTrips((state) => state.savePlan);
  const [dayIndex, setDayIndex] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const photo = useDestinationPhoto(trip.destination);
  const forecast = useTripForecast(trip.destination, trip.startDate, trip.endDate);

  const byId = useMemo(() => new Map(picks.places.map((place) => [place.id, place])), [picks.places]);
  const must = useMemo(() => new Set(picks.mustIds), [picks.mustIds]);
  const day = plan.days[Math.min(dayIndex, plan.days.length - 1)] as DayPlan | undefined;
  const stops = useMemo(
    () =>
      (day?.stops ?? []).flatMap((stop) => {
        const place = byId.get(stop.placeId);
        return place ? [{ stop, place }] : [];
      }),
    [day, byId],
  );
  const points: RoutePoint[] = useMemo(
    () =>
      stops.map(({ place }, index) => ({
        id: place.id,
        lat: place.lat,
        lng: place.lng,
        label: String(index + 1),
        name: place.name,
      })),
    [stops],
  );
  const travelMin = stops.reduce((sum, { stop }) => sum + stop.travelMin, 0);
  const rainChance = (date: string) => forecast.days?.find((entry) => entry.date === date)?.rainChance;
  const notices = day ? checkDay(day, picks.places, trip.pace, { rainChance: rainChance(day.date) ?? null }) : [];
  const lunchBefore = day?.lunchAt ? stops.findIndex(({ stop }, index) => index > 0 && stop.start >= (day.lunchAt ?? '')) : -1; // prettier-ignore

  function change(ids: string[]) {
    if (!day) return;
    const next = rescheduleDay(day, ids, picks.places, trip.pace);
    savePlan(trip.id, { ...plan, days: plan.days.map((item) => (item === day ? next : item)) });
  }
  const ids = stops.map(({ place }) => place.id);
  const move = (index: number, by: -1 | 1) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(index + by, 0, moved);
    change(next);
  };

  function showOnList(id: string) {
    setActiveId(id);
    document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div>
      <header className="relative overflow-hidden bg-primary text-white lg:rounded-b-[2rem]">
        {photo && (
          <>
            <Photo src={photoAt(photo, 1280)} eager />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/40 to-black/35" />
          </>
        )}
        <div className="container-page relative pt-10 pb-8 sm:pt-14">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {plan.source === 'ai' ? t('plan.byAi') : t('plan.byRules')}
            </span>
            <h1 className="mt-4 font-display text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
              <span aria-hidden="true">{flagEmoji(trip.destination.countryCode)} </span>
              {trip.destination.name}
            </h1>
            <p className="mt-2 text-white/90">
              {formatDateRange(trip.startDate, trip.endDate, language)} · <span dir="ltr">{trip.code}</span>
            </p>
            {plan.summary && <p className="mt-4 max-w-2xl text-lg text-white/95">{plan.summary}</p>}
            {plan.source === 'rules' && <p className="mt-4 max-w-2xl text-sm text-white/85">{t('plan.rulesNote')}</p>}
          </motion.div>
          {photo && <PhotoCredit photo={photo} className="mt-6 text-white/70" />}
        </div>
      </header>

      <div className="container-page py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label={t('plan.yourPlan')} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
            {plan.days.map((item, index) => {
              const selected = item === day;
              const weather = forecast.days?.find((entry) => entry.date === item.date);
              const WeatherIcon = weather ? weatherIcons[weather.kind] : undefined;
              return (
                <button
                  key={item.date}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setDayIndex(index);
                    setActiveId(undefined);
                  }}
                  className={cn(
                    'relative shrink-0 rounded-xl border px-4 py-2.5 text-start transition-colors',
                    selected ? 'border-transparent text-on-primary' : 'border-line bg-surface text-ink hover:bg-surface-2',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="day-active"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center gap-3">
                    <span>
                      <span className="block text-sm font-semibold">{t('plan.day', { count: index + 1 })}</span>
                      <span className={cn('block text-xs', selected ? 'opacity-90' : 'text-muted')}>
                        {formatDay(item.date, language, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                    {WeatherIcon && weather && (
                      <span className="flex items-center gap-1 text-xs tabular-nums">
                        <WeatherIcon className="size-4" aria-hidden="true" />
                        {Math.round(weather.tempMax)}°
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={pickPath(trip.id)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              <Shuffle className="size-4" aria-hidden="true" />
              {t('plan.editPicks')}
            </Link>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={() => savePlan(trip.id, undefined)}
            >
              {t('plan.replan')}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <AskVoyara
            trip={trip}
            picks={picks}
            plan={plan}
            currentDay={Math.min(dayIndex, plan.days.length - 1) + 1}
            rainChance={rainChance}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section aria-labelledby="day-title" className="min-w-0 lg:order-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="day-title" className="font-display text-2xl font-medium tracking-tight text-ink">
                {day?.theme ?? t('plan.day', { count: dayIndex + 1 })}
              </h2>
              <p className="text-sm text-muted">
                {t('plan.stops', { count: stops.length })} · {t('plan.travel')}{' '}
                {t('plan.min', { count: travelMin })}
              </p>
            </div>

            {notices.length > 0 && (
              <ul className="mt-4 space-y-2">
                {notices.map((notice) => (
                  <Notice
                    key={notice.code}
                    notice={notice}
                    placeName={notice.code === 'longHop' ? byId.get(notice.placeId)?.name : undefined}
                  />
                ))}
              </ul>
            )}

            {stops.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
                <p className="text-muted">{t('plan.freeDay')}</p>
                <Link to={pickPath(trip.id)} className={cn(buttonStyles({ variant: 'secondary' }), 'mt-5')}>
                  {t('plan.editPicks')}
                </Link>
              </div>
            ) : (
              <ol className="relative mt-5 before:absolute before:top-6 before:bottom-6 before:start-[4.6rem] before:w-px before:bg-line">
                <AnimatePresence initial={false} mode="popLayout">
                  {stops.flatMap(({ stop, place }, index) => [
                    index > 0 && <TravelRow key={`go-${place.id}`} stop={stop} />,
                    index === lunchBefore && (
                      <li key="lunch" className="flex items-center gap-2 pb-2 ps-[4.75rem] text-xs font-medium text-accent-ink">
                        <Utensils className="size-3.5" aria-hidden="true" />
                        <span dir="ltr">{day?.lunchAt}</span> {t('plan.lunch')}
                      </li>
                    ),
                    <StopRow
                      key={place.id}
                      stop={stop}
                      place={place}
                      number={index + 1}
                      must={must.has(place.id)}
                      active={activeId === place.id}
                      first={index === 0}
                      last={index === stops.length - 1}
                      onActive={setActiveId}
                      onMove={(by) => move(index, by)}
                      onRemove={() => change(ids.filter((id) => id !== place.id))}
                    />,
                  ])}
                </AnimatePresence>
              </ol>
            )}
          </section>

          <aside
            aria-label={t('plan.mapLabel')}
            className="order-first h-56 overflow-hidden rounded-xl border border-line shadow-sm sm:h-72 lg:sticky lg:top-6 lg:order-2 lg:h-[min(34rem,calc(100dvh-3rem))]"
          >
            {points.length > 0 ? (
              <Suspense fallback={<RouteSketch points={points} activeId={activeId} />}>
                <RouteMap points={points} activeId={activeId} theme={theme} onSelect={showOnList} />
              </Suspense>
            ) : (
              <div className="grid size-full place-items-center bg-surface-2">
                <span className="h-40 w-56">
                  <Scene name="journey" />
                </span>
              </div>
            )}
          </aside>
        </div>

        {footer && <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">{footer}</div>}
      </div>
    </div>
  );
} // prettier-ignore

/** A small "planned by" badge for lists and cards. */
export function PlanBadge({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  return (
    <Badge tone={plan.source === 'ai' ? 'success' : 'neutral'}>
      {plan.source === 'ai' ? t('plan.byAi') : t('plan.byRules')}
    </Badge>
  );
}
