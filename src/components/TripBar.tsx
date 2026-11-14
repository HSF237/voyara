import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarRange, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { CrewPicker } from '@/features/setup/CrewPicker';
import { DateRangeCalendar } from '@/features/setup/DateRangeCalendar';
import { MAX_NIGHTS } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { formatDateRange, nightsBetween, startOfToday } from '@/lib/dates';
import { useTripDraft } from '@/store/tripDraft';
import { DestinationSearch } from './DestinationSearch';

type Panel = 'dates' | 'people';

type TripBarProps = {
  /** Called with a destination chosen. Usually navigates to trip setup. */
  onSubmit: () => void;
  /** Two rows instead of one: for narrow columns such as the landing hero. */
  stacked?: boolean;
  className?: string;
};

function Segment({
  icon,
  label,
  value,
  open,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'flex h-14 w-full min-w-0 items-center gap-3 rounded-md px-3.5 text-start transition-colors',
        open ? 'bg-primary-soft' : 'hover:bg-surface-2',
      )}
    >
      <span className="text-muted [&>svg]:size-4.5" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block truncate text-sm font-semibold text-ink tabular-nums">{value}</span>
      </span>
    </button>
  );
}

/**
 * The whole trip in one bar: where, when, who, go. It edits the same draft as
 * the full setup screen, so "Plan it" carries everything across.
 */
export function TripBar({ onSubmit, stacked = false, className }: TripBarProps) {
  const { t, i18n } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [nudged, setNudged] = useState(false);
  const today = useMemo(() => startOfToday(), []);

  const destination = useTripDraft((state) => state.destination);
  const startDate = useTripDraft((state) => state.startDate);
  const endDate = useTripDraft((state) => state.endDate);
  const travellers = useTripDraft((state) => state.travellers);
  const setDestination = useTripDraft((state) => state.setDestination);
  const setDates = useTripDraft((state) => state.setDates);
  const setTravellers = useTripDraft((state) => state.setTravellers);

  // An open panel closes on Escape or a click anywhere outside the bar.
  useEffect(() => {
    if (!panel) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPanel(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panel]);

  function submit() {
    setPanel(null);
    if (!destination) {
      setNudged(true);
      searchRef.current?.focus();
      return;
    }
    onSubmit();
  }

  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <div ref={root} className={cn('relative', className)}>
      <motion.div
        animate={nudged && !destination ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setNudged(false)}
        className={cn(
          'grid gap-1 rounded-xl border border-line bg-surface p-1.5 shadow-md',
          stacked
            ? 'grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]'
            : 'grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto]',
        )}
      >
        <DestinationSearch
          ref={searchRef}
          bare
          value={destination}
          onSelect={setDestination}
          className={cn('col-span-2', stacked ? 'sm:col-span-3' : 'lg:col-span-1')}
        />
        <Segment
          icon={<CalendarRange />}
          label={`${t('ticket.dates')} · ${t('ticket.nights')}: ${nightsBetween(startDate, endDate)}`}
          value={formatDateRange(startDate, endDate, i18n.language)}
          open={panel === 'dates'}
          onClick={() => toggle('dates')}
        />
        <Segment
          icon={<UsersRound />}
          label={t('ticket.travellers')}
          value={travellers}
          open={panel === 'people'}
          onClick={() => toggle('people')}
        />
        <Button
          size="lg"
          onClick={submit}
          className={cn('col-span-2 rounded-lg', stacked ? 'sm:col-span-1' : 'lg:col-span-1')}
          iconEnd={<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
        >
          {t('setup.planIt')}
        </Button>
      </motion.div>

      <AnimatePresence>
        {panel && (
          <motion.div
            key={panel}
            role="dialog"
            aria-label={panel === 'dates' ? t('ticket.dates') : t('ticket.travellers')}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className={cn(
              'absolute top-full z-30 mt-2 origin-top rounded-xl border border-line bg-surface p-4 text-start shadow-lg sm:p-5',
              panel === 'dates' ? 'inset-x-0 mx-auto max-w-2xl' : 'end-0 w-full max-w-sm',
            )}
          >
            {panel === 'dates' ? (
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={setDates}
                minDate={today}
                maxNights={MAX_NIGHTS}
              />
            ) : (
              <CrewPicker value={travellers} onChange={setTravellers} />
            )}
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setPanel(null)}>
                {t('bar.done')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
