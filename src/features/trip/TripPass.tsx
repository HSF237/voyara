import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { PointerEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoMark } from '@/app/layout/Logo';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { DayStrip } from '@/features/setup/DayStrip';
import { cn } from '@/lib/cn';
import { formatDateRange, nightsBetween } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { flagEmoji, type Place } from '@/services/geocoding';
import type { DayForecast } from '@/services/weather';
import type { Pace } from './model';

export type ForecastState = 'ready' | 'loading' | 'later' | 'error' | 'none';

type TripPassProps = {
  destination: Place | null;
  startDate: string;
  endDate: string;
  travellers: number;
  budget: number;
  budgetCurrency: string;
  pace: Pace;
  /** Shown once the trip is saved. */
  code?: string;
  forecast?: DayForecast[];
  forecastState: ForecastState;
  className?: string;
};

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-[0.6875rem] font-semibold tracking-widest text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink tabular-nums">{children}</dd>
    </div>
  );
}

/** Round "passport stamp" that thuds onto the pass when a destination is chosen. */
function Stamp({ place }: { place: Place }) {
  const ring = `${place.name} · ${place.country} · `.toUpperCase();
  return (
    <motion.svg
      key={place.id}
      viewBox="0 0 120 120"
      className="pointer-events-none absolute end-4 top-16 size-24 text-primary-ink"
      initial={{ scale: 1.9, opacity: 0, rotate: -34 }}
      animate={{ scale: 1, opacity: 0.85, rotate: -14 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      aria-hidden="true"
    >
      <defs>
        <path id="stamp-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="32" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <text fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="currentColor">
        <textPath href="#stamp-ring" textLength="270" lengthAdjust="spacing">
          {ring.repeat(2).slice(0, 40)}
        </textPath>
      </text>
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        letterSpacing="1"
        fill="currentColor"
      >
        {place.countryCode}
      </text>
    </motion.svg>
  );
}

/**
 * The trip as a boarding pass. It fills in live while the trip is being set
 * up, and is the trip's header once saved. Tilts gently under the pointer.
 */
export function TripPass({
  destination,
  startDate,
  endDate,
  travellers,
  budget,
  budgetCurrency,
  pace,
  code,
  forecast,
  forecastState,
  className,
}: TripPassProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const reduced = useReducedMotion();
  const nights = nightsBetween(startDate, endDate);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-7, 7]), {
    stiffness: 220,
    damping: 22,
  });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [6, -6]), {
    stiffness: 220,
    damping: 22,
  });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div className={cn('[perspective:1200px]', className)}>
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ rotateX, rotateY }}
        className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
      >
        <div className="flex items-center gap-2.5 bg-primary px-5 py-3 text-on-primary">
          <LogoMark className="size-6 rounded-[7px] ring-1 ring-on-primary/30" />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase">
            {t('ticket.pass')}
          </span>
          {code && (
            <span className="ms-auto font-mono text-xs tracking-wider" dir="ltr">
              {code}
            </span>
          )}
        </div>

        <div className="relative px-5 pt-5 pb-4">
          {destination && <Stamp place={destination} />}
          <p className="text-[0.6875rem] font-semibold tracking-widest text-muted uppercase">
            {t('ticket.destination')}
          </p>
          {destination ? (
            <motion.div
              key={destination.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="pe-24"
            >
              <p className="font-display text-2xl leading-tight font-medium text-ink">
                {destination.name}
              </p>
              <p className="mt-1 truncate text-sm text-muted">
                <span aria-hidden="true">{flagEmoji(destination.countryCode)} </span>
                {[destination.region, destination.country].filter(Boolean).join(', ')}
              </p>
            </motion.div>
          ) : (
            <p className="mt-1 rounded-md border border-dashed border-line-strong px-3 py-4 text-sm text-muted">
              {t('ticket.choose')}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('ticket.dates')} wide>
              {formatDateRange(startDate, endDate, language)}
            </Field>
            <Field label={t('ticket.nights')}>
              <AnimatedNumber value={nights} />
            </Field>
            <Field label={t('ticket.travellers')}>
              <AnimatedNumber value={travellers} />
            </Field>
            <Field label={t('ticket.pace')}>{t(`setup.pace.${pace}`)}</Field>
            <Field label={t('ticket.budget')}>
              <AnimatedNumber
                value={budget}
                format={(amount) => formatMoney(amount, budgetCurrency, language)}
              />
            </Field>
          </dl>
        </div>

        {/* Perforation: two notches and a dashed tear line. */}
        <div className="relative" aria-hidden="true">
          <span className="absolute -start-3 -top-3 size-6 rounded-full border border-line bg-bg" />
          <span className="absolute -end-3 -top-3 size-6 rounded-full border border-line bg-bg" />
          <div className="mx-6 border-t-2 border-dashed border-line" />
        </div>

        <div className="px-5 pt-4 pb-5">
          <p className="text-[0.6875rem] font-semibold tracking-widest text-muted uppercase">
            {t('ticket.weather')}
          </p>
          <div className="mt-2 min-h-17">
            {forecastState === 'ready' && forecast && forecast.length > 0 ? (
              <DayStrip startDate={startDate} endDate={endDate} forecast={forecast} />
            ) : (
              <p className="text-sm text-muted">
                {forecastState === 'loading' && t('common.loading')}
                {forecastState === 'later' && t('ticket.weatherLater')}
                {(forecastState === 'error' || forecastState === 'ready') &&
                  t('ticket.weatherUnavailable')}
                {forecastState === 'none' && t('ticket.weatherChoose')}
              </p>
            )}
          </div>
          <div
            className="mt-4 h-8 bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_5px,currentColor_5px_6px,transparent_6px_10px,currentColor_10px_13px,transparent_13px_15px)] text-ink/70"
            aria-hidden="true"
          />
        </div>
      </motion.div>
    </div>
  );
}
