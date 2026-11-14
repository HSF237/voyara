import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Earth, Luggage, Moon, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { paths, planPath } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { TripBar } from '@/components/TripBar';
import { Card } from '@/components/ui';
import { DestinationRail, PhotoCredit } from '@/features/destinations/DestinationRail';
import { CITIES } from '@/features/landing/cities';
import { DayStrip } from '@/features/setup/DayStrip';
import type { Trip } from '@/features/trip/model';
import { useTripForecast } from '@/features/trip/useTripForecast';
import { TripCard } from '@/features/trips/TripCard';
import { cn } from '@/lib/cn';
import { formatDateRange, startOfToday, toISODate } from '@/lib/dates';
import { useNow } from '@/lib/useNow';
import { flagEmoji, type Place } from '@/services/geocoding';
import { usePlacePhoto } from '@/services/queries';
import { firstName, useAuth } from '@/store/auth';
import { useTripDraft } from '@/store/tripDraft';
import { useTrips } from '@/store/trips';
import { dayPart, daysUntil, tripStats, upcomingTrips } from './model';

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function NextTrip({ trip, today }: { trip: Trip; today: string }) {
  const { t, i18n } = useTranslation();
  const forecast = useTripForecast(trip.destination, trip.startDate, trip.endDate);
  const photo = usePlacePhoto(trip.destination).data;
  const [photoFailed, setPhotoFailed] = useState(false);
  const withPhoto = Boolean(photo) && !photoFailed;
  const days = daysUntil(trip, today);
  const underWay = days <= 0;

  return (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-xl bg-primary p-6 shadow-md sm:p-8',
        withPhoto ? 'text-white' : 'text-on-primary',
      )}
    >
      {withPhoto && photo && (
        <>
          <img
            src={photo.url}
            alt=""
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div aria-hidden="true" className={withPhoto ? 'hidden' : undefined}>
        <div className="absolute -end-28 -top-28 size-80 rounded-full border border-on-primary/15" />
        <div className="absolute -end-16 -top-16 size-56 rounded-full border border-on-primary/15" />
        <div className="absolute -end-4 -top-4 size-32 rounded-full bg-on-primary/10" />
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <span className="inline-flex h-6 items-center rounded-full bg-on-primary/15 px-2.5 text-xs font-semibold">
            {underWay ? t('dash.now') : t('dash.nextTrip')}
          </span>
          <h2 className="mt-4 font-display text-3xl leading-tight font-medium tracking-tight">
            <span aria-hidden="true">{flagEmoji(trip.destination.countryCode)} </span>
            {trip.destination.name}
          </h2>
          <p className="mt-2 opacity-90">
            {formatDateRange(trip.startDate, trip.endDate, i18n.language)}
          </p>
        </div>
        {!underWay && (
          <div className="text-end">
            <p className="font-display text-4xl leading-none font-medium tabular-nums">
              <AnimatedNumber value={days} />
            </p>
            <p className="mt-1 text-sm opacity-90">{t('dash.daysToGo')}</p>
          </div>
        )}
      </div>

      <div className="relative mt-6 rounded-lg bg-surface p-4 text-ink">
        {forecast.state === 'ready' && forecast.days && forecast.days.length > 0 ? (
          <DayStrip startDate={trip.startDate} endDate={trip.endDate} forecast={forecast.days} />
        ) : (
          <p className="text-sm text-muted">
            {forecast.state === 'loading' && t('common.loading')}
            {forecast.state === 'later' && t('ticket.weatherLater')}
            {(forecast.state === 'error' || forecast.state === 'ready') &&
              t('ticket.weatherUnavailable')}
          </p>
        )}
      </div>

      <Link
        to={planPath(trip.id)}
        className="relative mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 text-sm font-semibold text-ink shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-on-primary"
      >
        {t('dash.openTrip')}
        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
      </Link>
      {withPhoto && photo && (
        <PhotoCredit photo={photo} className="absolute end-4 bottom-3 max-w-[55%] text-white/75" />
      )}
    </div>
  );
}

function FirstTrip() {
  const { t } = useTranslation();
  return (
    <Card className="flex h-full flex-col justify-center p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        <Luggage className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-medium tracking-tight">
        {t('dash.emptyTitle')}
      </h2>
      <p className="mt-2 text-muted">{t('dash.emptyBody')}</p>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center gap-4 p-5 sm:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-2xl leading-none font-medium tabular-nums">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </Card>
  );
}

/** Home for a signed-in traveller: what's next, what's saved, and where to go. */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  usePageTitle(t('nav.home'));
  const navigate = useNavigate();
  const now = useNow();
  const user = useAuth((state) => state.user);
  const trips = useTrips((state) => state.trips);
  const setDestination = useTripDraft((state) => state.setDestination);

  const today = useMemo(() => toISODate(startOfToday()), []);
  const upcoming = useMemo(() => upcomingTrips(trips, today), [trips, today]);
  const stats = useMemo(() => tripStats(trips), [trips]);
  const next = upcoming[0];
  const others = (next ? trips.filter((trip) => trip.id !== next.id) : trips).slice(0, 3);

  function planFor(place: Place) {
    setDestination(place);
    void navigate(paths.setup);
  }

  return (
    <motion.div
      variants={list}
      initial="hidden"
      animate="show"
      className="container-page py-6 sm:py-10"
    >
      <motion.header variants={rise}>
        <p className="text-sm text-muted">
          {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(now)}
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {t(`dash.${dayPart(now.getHours())}`, { name: firstName(user) })}
        </h1>
      </motion.header>

      <motion.div variants={rise} className="relative z-20 mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">{t('dash.whereNext')}</h2>
        <TripBar onSubmit={() => void navigate(paths.setup)} />
      </motion.div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <motion.div variants={rise} className="min-w-0">
          {next ? <NextTrip trip={next} today={today} /> : <FirstTrip />}
        </motion.div>
        <motion.div variants={rise} className="grid min-w-0 gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatTile icon={Luggage} label={t('dash.stats.trips')} value={stats.trips} />
          <StatTile icon={Earth} label={t('dash.stats.countries')} value={stats.countries} />
          <StatTile icon={Moon} label={t('dash.stats.nights')} value={stats.nights} />
        </motion.div>
      </div>

      {others.length > 0 && (
        <motion.section variants={rise} aria-labelledby="dash-trips" className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="dash-trips" className="font-display text-xl font-medium">
              {t('dash.yourTrips')}
            </h2>
            <Link
              to={paths.trips}
              className="rounded-sm text-sm font-semibold text-primary-ink underline-offset-4 hover:underline"
            >
              {t('dash.seeAll')}
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={rise} aria-labelledby="dash-ideas" className="mt-10">
        <h2 id="dash-ideas" className="font-display text-xl font-medium">
          {t('dash.ideas')}
        </h2>
        <div className="mt-4">
          <DestinationRail
            places={Object.values(CITIES)}
            onPick={planFor}
            now={now}
            label={t('dash.ideas')}
          />
        </div>
      </motion.section>
    </motion.div>
  );
}
