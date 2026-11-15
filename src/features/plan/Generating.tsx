import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderMark } from '@/components/Loader';
import { Photo } from '@/components/Photo';
import { Scene } from '@/components/Scene';
import { categoryScenes } from '@/features/places/category';
import type { Trip, TripPicks } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { makePlan } from '@/services/planner';
import { useTrips } from '@/store/trips';

const STEPS = ['step1', 'step2', 'step3'] as const;
/** Long enough to read as work being done; a plan that arrives sooner waits for it. */
const SHORTEST_MS = 2200;

/** Shown while the plan is being built: asks the planner, then saves what it returns. */
export function Generating({ trip, picks }: { trip: Trip; picks: TripPicks }) {
  const { t, i18n } = useTranslation();
  const savePlan = useTrips((state) => state.savePlan);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const ticker = setInterval(
      () => setStep((value) => Math.min(value + 1, STEPS.length - 1)),
      1100,
    );
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    makePlan(trip, picks, i18n.language.slice(0, 2), controller.signal).then(
      (plan) => {
        timer = setTimeout(
          () => savePlan(trip.id, plan),
          Math.max(0, SHORTEST_MS - (Date.now() - started)),
        );
      },
      () => undefined, // cancelled: this screen is gone
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // Runs once for this trip: the picks cannot change while this screen is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const shown = picks.places.slice(0, 7);

  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-12">
      <div role="status" className="w-full max-w-lg text-center">
        <LoaderMark className="mx-auto" />
        <h1 className="mt-10 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          {t('plan.building')}
        </h1>
        <p className="mt-2 text-muted">{trip.destination.name}</p>

        {/* The kept places, joined one by one: the route taking shape. */}
        <div className="relative mx-auto mt-10 flex w-fit items-center gap-3" aria-hidden="true">
          <motion.span
            className="absolute inset-x-5 top-1/2 h-0.5 origin-left -translate-y-1/2 bg-primary rtl:origin-right"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
          />
          {shown.map((place, index) => (
            <motion.span
              key={place.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.15 + index * 0.22,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="relative size-11 overflow-hidden rounded-full border-2 border-surface bg-surface-2 shadow-md sm:size-12"
            >
              <Photo
                src={place.image}
                eager
                fallback={<Scene name={categoryScenes[place.category]} />}
              />
            </motion.span>
          ))}
        </div>

        <ol className="mx-auto mt-10 w-fit space-y-3 text-start">
          {STEPS.map((key, index) => (
            <li key={key} className="flex items-center gap-3">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300',
                  index < step && 'bg-primary text-on-primary',
                  index === step && 'bg-primary-soft text-primary-ink',
                  index > step && 'bg-surface-2 text-muted',
                )}
              >
                {index < step ? (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span
                    className={cn(
                      'size-1.5 rounded-full bg-current',
                      index === step && 'animate-pulse',
                    )}
                  />
                )}
              </span>
              <span
                className={cn('text-sm', index <= step ? 'font-medium text-ink' : 'text-muted')}
              >
                {t(`plan.${key}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
