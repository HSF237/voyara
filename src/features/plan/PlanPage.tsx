import { motion } from 'framer-motion';
import { Check, Clock, Coins, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { NotFoundPage } from '@/app/NotFoundPage';
import { paths } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { Badge, Button, Card, Modal, toast } from '@/components/ui';
import { DayStrip } from '@/features/setup/DayStrip';
import { TripPass } from '@/features/trip/TripPass';
import { useTripForecast } from '@/features/trip/useTripForecast';
import { cn } from '@/lib/cn';
import { currencyOfCountry } from '@/lib/countryCurrency';
import { formatDateRange } from '@/lib/dates';
import { useRates } from '@/services/queries';
import { useTripDraft } from '@/store/tripDraft';
import { useTrips } from '@/store/trips';
import type { Trip } from '@/features/trip/model';

function formatLocalTime(now: Date, timezone: string, language: string): string | null {
  try {
    return new Intl.DateTimeFormat(language, {
      hour: 'numeric',
      minute: '2-digit',
      weekday: 'short',
      timeZone: timezone,
    }).format(now);
  } catch {
    return null; // unknown time zone id
  }
}

/** Current wall-clock time at the destination, refreshed every 20 seconds. */
function LocalTime({ timezone, language }: { timezone: string; language: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatLocalTime(now, timezone, language) ?? '—'}</>;
}

function TripView({ trip }: { trip: Trip }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();
  const removeTrip = useTrips((state) => state.removeTrip);
  const loadTrip = useTripDraft((state) => state.loadTrip);
  const [confirming, setConfirming] = useState(false);
  usePageTitle(trip.destination.name);

  const forecast = useTripForecast(trip.destination, trip.startDate, trip.endDate);
  const localCurrency = currencyOfCountry(trip.destination.countryCode);
  const rates = useRates(trip.budgetCurrency, [localCurrency]);
  const rate = localCurrency ? rates.data?.rates[localCurrency] : undefined;

  const steps = [
    { key: 'stepDetails', state: 'done' },
    { key: 'stepPlaces', state: 'current' },
    { key: 'stepPlan', state: 'todo' },
  ] as const;

  return (
    <div className="container-page py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Badge tone="success" dot>
          {t('trip.saved')}
        </Badge>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          {trip.destination.name}
        </h1>
        <p className="mt-2 text-muted">{formatDateRange(trip.startDate, trip.endDate, language)}</p>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 48, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.1 }}
          className="mx-auto w-full max-w-sm lg:mx-0"
        >
          <TripPass
            destination={trip.destination}
            startDate={trip.startDate}
            endDate={trip.endDate}
            travellers={trip.travellers}
            budget={trip.budget}
            budgetCurrency={trip.budgetCurrency}
            pace={trip.pace}
            code={trip.code}
            forecast={forecast.days}
            forecastState={forecast.state}
          />
        </motion.div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-medium text-ink">{t('trip.next')}</h2>
            <ol className="mt-5 space-y-4">
              {steps.map((step, index) => (
                <li key={step.key} className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      step.state === 'done' && 'bg-primary text-on-primary',
                      step.state === 'current' && 'bg-accent text-on-accent',
                      step.state === 'todo' && 'bg-surface-2 text-muted',
                    )}
                    aria-hidden="true"
                  >
                    {step.state === 'done' ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="pt-1">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        step.state === 'todo' ? 'text-muted' : 'text-ink',
                      )}
                    >
                      {t(`trip.${step.key}`)}
                    </p>
                    {step.state === 'current' && (
                      <p className="mt-0.5 text-sm text-muted">{t('trip.placesSoon')}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {trip.destination.timezone && (
              <Card>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="size-4" aria-hidden="true" />
                  {t('trip.localTime')}
                </p>
                <p className="mt-1.5 font-display text-xl font-medium text-ink">
                  <LocalTime timezone={trip.destination.timezone} language={language} />
                </p>
              </Card>
            )}
            {localCurrency && localCurrency !== trip.budgetCurrency && (
              <Card>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Coins className="size-4" aria-hidden="true" />
                  {t('trip.rate')}
                </p>
                <p
                  className="mt-1.5 font-display text-xl font-medium text-ink tabular-nums"
                  dir="ltr"
                >
                  {rate
                    ? `1 ${trip.budgetCurrency} = ${rate.toLocaleString(language, { maximumSignificantDigits: 4 })} ${localCurrency}`
                    : rates.isError
                      ? '—'
                      : '…'}
                </p>
                {rates.isError && (
                  <p className="mt-1 text-sm text-muted">{t('setup.budget.rateOffline')}</p>
                )}
              </Card>
            )}
          </div>

          {forecast.state === 'ready' && forecast.days && forecast.days.length > 0 && (
            <Card>
              <h2 className="font-display text-lg font-medium text-ink">
                {t('trip.forecastTitle')}
              </h2>
              <DayStrip
                startDate={trip.startDate}
                endDate={trip.endDate}
                forecast={forecast.days}
                className="mt-4"
              />
            </Card>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="secondary"
              iconStart={<Pencil className="size-4" aria-hidden="true" />}
              onClick={() => {
                loadTrip(trip);
                void navigate(paths.setup);
              }}
            >
              {t('trip.edit')}
            </Button>
            <Button
              variant="ghost"
              iconStart={<Trash2 className="size-4" aria-hidden="true" />}
              onClick={() => setConfirming(true)}
            >
              {t('trip.delete')}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('trip.deleteTitle')}
        description={t('trip.deleteBody')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // Leave first, so this page never renders without its trip.
                void navigate(paths.dashboard);
                removeTrip(trip.id);
                toast({ title: t('trip.deleted') });
              }}
            >
              {t('trip.delete')}
            </Button>
          </>
        }
      />
    </div>
  );
}

/** A saved trip. For now: the pass, live facts and what comes next. */
export function PlanPage() {
  const { tripId } = useParams();
  const trip = useTrips((state) => state.trips.find((item) => item.id === tripId));
  return trip ? <TripView trip={trip} /> : <NotFoundPage />;
}
