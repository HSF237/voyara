import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  CalendarRange,
  Gauge,
  Heart,
  MapPin,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { planPath } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { DestinationSearch } from '@/components/DestinationSearch';
import { Button, Card, Chip } from '@/components/ui';
import { MAX_NIGHTS } from '@/features/trip/model';
import { TripPass } from '@/features/trip/TripPass';
import { useTripForecast } from '@/features/trip/useTripForecast';
import { currencyOfCountry } from '@/lib/countryCurrency';
import { nightsBetween, parseISODate, startOfToday, toISODate } from '@/lib/dates';
import { approxUnitsPerUsd, budgetScale, defaultBudget } from '@/lib/money';
import { useRates } from '@/services/queries';
import { useSettings } from '@/store/settings';
import { useTripDraft } from '@/store/tripDraft';
import { useTrips } from '@/store/trips';
import { addDays } from 'date-fns';
import { BudgetControl } from './BudgetControl';
import { CrewPicker } from './CrewPicker';
import { DateRangeCalendar } from './DateRangeCalendar';
import { DayStrip } from './DayStrip';
import { InterestPicker } from './InterestPicker';
import { PacePicker } from './PacePicker';

const LENGTH_CHOICES = [2, 3, 5, 7] as const;

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function Section({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section variants={item}>
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
          {aside && <span className="ms-auto text-sm text-muted">{aside}</span>}
        </div>
        {children}
      </Card>
    </motion.section>
  );
}

/** Trip setup: one screen, every control live, only the destination required. */
export function SetupPage() {
  const { t } = useTranslation();
  usePageTitle(t('setup.title'));
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [nudged, setNudged] = useState(false);

  const draft = useTripDraft();
  const homeCurrency = useSettings((state) => state.currency);
  const addTrip = useTrips((state) => state.addTrip);
  const updateTrip = useTrips((state) => state.updateTrip);

  const today = useMemo(() => startOfToday(), []);
  const { destination, startDate, endDate, travellers, pace, interests } = draft;
  const nights = nightsBetween(startDate, endDate);
  const days = nights + 1;

  const localCurrency = destination ? currencyOfCountry(destination.countryCode) : undefined;
  const rates = useRates(homeCurrency, [localCurrency, 'USD']);
  const usdPerUnit = homeCurrency === 'USD' ? 1 : rates.data?.rates.USD;
  const unitsPerUsd = usdPerUnit ? 1 / usdPerUnit : approxUnitsPerUsd(homeCurrency);

  const scale = useMemo(
    () => budgetScale(unitsPerUsd, travellers, days),
    [unitsPerUsd, travellers, days],
  );
  const budget = Math.min(
    scale.max,
    Math.max(scale.min, draft.budget ?? defaultBudget(scale, unitsPerUsd, travellers, days)),
  );

  const forecast = useTripForecast(destination, startDate, endDate);

  function setLength(lengthDays: number) {
    draft.setDates({
      startDate,
      endDate: toISODate(addDays(parseISODate(startDate), lengthDays - 1)),
    });
  }

  function planIt() {
    if (!destination) {
      setNudged(true);
      searchRef.current?.focus();
      searchRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const details = {
      destination,
      startDate,
      endDate,
      travellers,
      budget,
      budgetCurrency: homeCurrency,
      pace,
      interests,
    };
    const saved =
      (draft.editingId ? updateTrip(draft.editingId, details) : undefined) ?? addTrip(details);
    draft.reset();
    void navigate(planPath(saved.id));
  }

  const pass = (
    <TripPass
      destination={destination}
      startDate={startDate}
      endDate={endDate}
      travellers={travellers}
      budget={budget}
      budgetCurrency={homeCurrency}
      pace={pace}
      forecast={forecast.days}
      forecastState={forecast.state}
    />
  );

  return (
    <div>
      <div className="container-page pt-8 pb-8 sm:pt-12 lg:pb-16">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {t('setup.title')}
          </h1>
          <p className="mt-2 max-w-xl text-muted">{t('setup.subtitle')}</p>
        </motion.header>

        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <motion.div variants={list} initial="hidden" animate="show" className="space-y-4">
            <Section icon={MapPin} title={t('setup.where')}>
              <motion.div
                animate={nudged && !destination ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                onAnimationComplete={() => setNudged(false)}
              >
                <DestinationSearch
                  ref={searchRef}
                  value={destination}
                  onSelect={draft.setDestination}
                />
              </motion.div>
            </Section>

            <Section
              icon={CalendarRange}
              title={t('setup.when')}
              aside={`${t('ticket.nights')}: ${nights}`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="me-1 text-sm text-muted">{t('setup.dates.length')}</span>
                {LENGTH_CHOICES.map((length) => (
                  <Chip
                    key={length}
                    selected={days === length}
                    onSelectedChange={() => setLength(length)}
                    className="h-9 px-3.5"
                  >
                    {length}
                  </Chip>
                ))}
              </div>
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={draft.setDates}
                minDate={today}
                maxNights={MAX_NIGHTS}
              />
              <DayStrip
                startDate={startDate}
                endDate={endDate}
                forecast={forecast.days}
                className="mt-5"
              />
            </Section>

            <Section icon={UsersRound} title={t('setup.who')}>
              <CrewPicker value={travellers} onChange={draft.setTravellers} />
            </Section>

            <Section icon={Wallet} title={t('setup.budget.title')}>
              <BudgetControl
                value={budget}
                onChange={draft.setBudget}
                scale={scale}
                currency={homeCurrency}
                travellers={travellers}
                days={days}
                localCurrency={localCurrency}
                country={destination?.country}
                rates={rates.data}
                ratesFailed={rates.isError}
              />
            </Section>

            <Section icon={Gauge} title={t('setup.pace.title')}>
              <PacePicker value={pace} onChange={draft.setPace} label={t('setup.pace.title')} />
            </Section>

            <Section icon={Heart} title={t('setup.interests')} aside={t('setup.optional')}>
              <p className="-mt-2 mb-4 text-sm text-muted">{t('setup.interestsHint')}</p>
              <InterestPicker
                value={interests}
                onToggle={draft.toggleInterest}
                label={t('setup.interests')}
              />
            </Section>

            <div className="lg:hidden">{pass}</div>
          </motion.div>

          <aside className="sticky top-24 hidden lg:block">
            {pass}
            <Button
              size="lg"
              fullWidth
              className="mt-5"
              onClick={planIt}
              iconEnd={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
            >
              {t('setup.planIt')}
            </Button>
            {!destination && (
              <p className="mt-2 text-center text-sm text-muted">{t('setup.needDestination')}</p>
            )}
          </aside>
        </div>
      </div>

      {/* Phones: the action stays within thumb reach, at the bottom of the scrolling page. */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-surface px-5 py-3 shadow-[0_-6px_16px_-10px_rgb(0_0_0/0.25)] lg:hidden">
        <div className="flex items-center gap-4">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {destination ? destination.name : t('setup.needDestination')}
          </p>
          <Button
            onClick={planIt}
            iconEnd={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
          >
            {t('setup.planIt')}
          </Button>
        </div>
      </div>
    </div>
  );
}
