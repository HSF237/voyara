import { AnimatePresence, motion } from 'framer-motion';
import {
  Bird,
  Building2,
  Check,
  CloudRain,
  Landmark,
  Mountain,
  Sun,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/**
 * Small looping previews for the "how it works" story. They illustrate the
 * real screens with well-known Kuala Lumpur places; nothing here is live data.
 */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative h-[30rem] w-[16.5rem] overflow-hidden rounded-[2.25rem] border border-line bg-bg shadow-lg ring-[7px] ring-surface-2',
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-2.5 z-10 mx-auto h-1.5 w-16 rounded-full bg-line-strong/50" />
      <div className="size-full px-4 pt-9 pb-4">{children}</div>
    </div>
  );
}

// ── 1. Swipe ────────────────────────────────────────────────────────────────
const deck: { name: string; icon: LucideIcon; tone: string; keep: boolean }[] = [
  { name: 'Batu Caves', icon: Mountain, tone: 'bg-accent-soft text-accent-ink', keep: true },
  { name: 'Petronas Towers', icon: Building2, tone: 'bg-sky-soft text-sky-ink', keep: true },
  { name: 'Jalan Alor', icon: Utensils, tone: 'bg-danger-soft text-danger-ink', keep: false },
  { name: 'KL Bird Park', icon: Bird, tone: 'bg-primary-soft text-primary-ink', keep: true },
];

export function SwipeMock({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!active) return;
    const decide = setTimeout(() => setDeciding(true), 1100);
    const next = setTimeout(() => {
      setDeciding(false);
      setIndex((current) => current + 1);
    }, 1650);
    return () => {
      clearTimeout(decide);
      clearTimeout(next);
    };
  }, [active, index]);

  const card = deck[index % deck.length] ?? deck[0];
  const behind = deck[(index + 1) % deck.length] ?? deck[0];
  if (!card || !behind) return null;
  const direction = card.keep ? 1 : -1;

  return (
    <div className="relative size-full">
      <div
        className={cn(
          'absolute inset-x-3 top-5 bottom-16 scale-[0.94] rounded-xl opacity-70',
          behind.tone,
        )}
      />
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ scale: 0.94, opacity: 0.7, y: 12 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
            x: deciding ? direction * 26 : 0,
            rotate: deciding ? direction * 6 : 0,
          }}
          variants={{
            gone: (dir: number) => ({
              x: dir * 300,
              rotate: dir * 20,
              opacity: 0,
              transition: { duration: 0.4 },
            }),
          }}
          exit="gone"
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className={cn(
            'absolute inset-x-0 top-0 bottom-14 flex flex-col justify-between rounded-xl p-4 shadow-md',
            card.tone,
          )}
        >
          <div className="flex justify-between">
            <span
              className={cn(
                'rounded-md border-2 border-current px-2 py-0.5 text-xs font-bold tracking-wide uppercase transition-opacity',
                deciding ? 'opacity-100' : 'opacity-0',
              )}
            >
              {card.keep ? t('home.mock.keep') : t('home.mock.skip')}
            </span>
          </div>
          <card.icon className="mx-auto size-24 opacity-80" strokeWidth={1.25} />
          <p className="font-display text-xl font-medium text-ink">{card.name}</p>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-5">
        <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-danger-ink">
          <X className="size-5" />
        </span>
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary">
          <Check className="size-5" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

// ── 2. Plan ─────────────────────────────────────────────────────────────────
const stops = [
  { time: '9:00', name: 'Merdeka Square', x: 18, y: 62 },
  { time: '11:00', name: 'Central Market', x: 40, y: 30 },
  { time: '14:00', name: 'Petronas Towers', x: 66, y: 52 },
  { time: '17:30', name: 'KLCC Park', x: 86, y: 22 },
];

export function PlanMock({ active }: { active: boolean }) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setRun((current) => current + 1), 5200);
    return () => clearInterval(timer);
  }, [active]);

  const path = stops
    .map((stop, index) => `${index === 0 ? 'M' : 'L'}${stop.x},${stop.y}`)
    .join(' ');

  return (
    <div key={run} className="flex size-full flex-col gap-3">
      <div className="relative h-36 shrink-0 overflow-hidden rounded-lg bg-sky-soft">
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="none">
          <motion.path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: active ? 1 : 0 }}
            transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.3 }}
          />
        </svg>
        {stops.map((stop, index) => (
          <motion.span
            key={stop.name}
            className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-on-primary shadow-sm"
            style={{ left: `${stop.x}%`, top: `${(stop.y / 80) * 100}%` }}
            initial={{ scale: 0, y: -14 }}
            animate={active ? { scale: 1, y: 0 } : { scale: 0, y: -14 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.3 + index * 0.5 }}
          >
            {index + 1}
          </motion.span>
        ))}
      </div>
      <ol className="space-y-2">
        {stops.map((stop, index) => (
          <motion.li
            key={stop.name}
            initial={{ opacity: 0, x: -10 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ delay: 0.4 + index * 0.5, duration: 0.35 }}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5"
          >
            <span className="w-10 text-xs font-semibold text-muted tabular-nums" dir="ltr">
              {stop.time}
            </span>
            <span className="truncate text-sm font-semibold text-ink">{stop.name}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// ── 3. Live ─────────────────────────────────────────────────────────────────
const dayStops = [
  { id: 'merdeka', name: 'Merdeka Square', icon: Landmark, outdoor: true },
  { id: 'batu', name: 'Batu Caves', icon: Mountain, outdoor: true },
  { id: 'museum', name: 'Islamic Arts Museum', icon: Building2, outdoor: false },
];
const slots = ['9:00', '15:00', '17:30'];

export function LiveMock({ active }: { active: boolean }) {
  const { t } = useTranslation();
  // 0 calm → 1 rain warning → 2 swapped
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    const waits = [1300, 2100, 2800];
    const timer = setTimeout(() => setPhase((current) => (current + 1) % 3), waits[phase]);
    return () => clearTimeout(timer);
  }, [active, phase]);

  const [first, second, third] = dayStops;
  if (!first || !second || !third) return null;
  const order = phase === 2 ? [first, third, second] : [first, second, third];

  return (
    <div className="flex size-full flex-col gap-3">
      <div className="h-17">
        <AnimatePresence mode="wait">
          {phase > 0 && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold',
                phase === 1 ? 'bg-sky-soft text-sky-ink' : 'bg-primary-soft text-primary-ink',
              )}
            >
              {phase === 1 ? (
                <CloudRain className="size-5 shrink-0" />
              ) : (
                <Check className="size-5 shrink-0" strokeWidth={3} />
              )}
              <span className="flex-1 leading-snug">
                {phase === 1 ? t('home.mock.rain') : t('home.mock.swapped')}
              </span>
              {phase === 1 && (
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-on-primary"
                >
                  {t('home.mock.swap')}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ol className="space-y-2">
        {order.map((stop, index) => {
          const wetSlot = index === 1;
          const warn = phase === 1 && wetSlot && stop.outdoor;
          return (
            <motion.li
              key={stop.id}
              layout
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn(
                'flex items-center gap-3 rounded-md border bg-surface px-3 py-3',
                warn ? 'border-sky' : 'border-line',
              )}
            >
              <span className="w-10 text-xs font-semibold text-muted tabular-nums" dir="ltr">
                {slots[index]}
              </span>
              <stop.icon className="size-4 shrink-0 text-muted" />
              <span className="flex-1 truncate text-sm font-semibold text-ink">{stop.name}</span>
              {stop.outdoor ? (
                <Sun className={cn('size-4 shrink-0', warn ? 'text-sky-ink' : 'text-accent-ink')} />
              ) : null}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
