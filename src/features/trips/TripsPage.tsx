import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { paths } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { Badge, buttonStyles, Tab, TabList, TabPanel, Tabs } from '@/components/ui';
import { pastTrips, upcomingTrips } from '@/features/dashboard/model';
import type { Trip } from '@/features/trip/model';
import { startOfToday, toISODate } from '@/lib/dates';
import { useTrips } from '@/store/trips';
import { TripCard } from './TripCard';

function TripGrid({ trips, empty }: { trips: Trip[]; empty: string }) {
  const { t } = useTranslation();
  if (trips.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
        <p className="text-muted">{empty}</p>
        <Link to={paths.setup} className={`${buttonStyles()} mt-5`}>
          <Plus className="size-4" aria-hidden="true" />
          {t('nav.plan')}
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false} mode="popLayout">
        {trips.map((trip, index) => (
          <motion.li
            key={trip.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.04, duration: 0.35 }}
          >
            <TripCard trip={trip} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Every saved trip, split into what's coming and what's done. */
export function TripsPage() {
  const { t } = useTranslation();
  usePageTitle(t('trips.title'));
  const trips = useTrips((state) => state.trips);
  const [tab, setTab] = useState('upcoming');
  const today = useMemo(() => toISODate(startOfToday()), []);
  const upcoming = useMemo(() => upcomingTrips(trips, today), [trips, today]);
  const past = useMemo(() => pastTrips(trips, today), [trips, today]);

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {t('trips.title')}
        </h1>
        <Link to={paths.setup} className={buttonStyles({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          {t('nav.plan')}
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabList aria-label={t('trips.title')}>
          <Tab value="upcoming">
            {t('trips.upcoming')} <Badge className="ms-1.5">{upcoming.length}</Badge>
          </Tab>
          <Tab value="past">
            {t('trips.past')} <Badge className="ms-1.5">{past.length}</Badge>
          </Tab>
        </TabList>
        <TabPanel value="upcoming" className="pt-6">
          <TripGrid trips={upcoming} empty={t('trips.emptyUpcoming')} />
        </TabPanel>
        <TabPanel value="past" className="pt-6">
          <TripGrid trips={past} empty={t('trips.emptyPast')} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
