import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Baby,
  CalendarDays,
  ChevronDown,
  Heart,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { CrewPicker } from '@/features/setup/CrewPicker';
import { DateRangeCalendar } from '@/features/setup/DateRangeCalendar';
import { MAX_NIGHTS } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { formatDay, nightsBetween, startOfToday } from '@/lib/dates';
import { useTripDraft } from '@/store/tripDraft';
import { DestinationSearch } from './DestinationSearch';

type Panel = 'dates' | 'people';

const parties: { key: 'solo' | 'couple' | 'family' | 'friends'; size: number; icon: LucideIcon }[] =
  [
    { key: 'solo', size: 1, icon: UserRound },
    { key: 'couple', size: 2, icon: Heart },
    { key: 'family', size: 4, icon: Baby },
    { key: 'friends', size: 6, icon: UsersRound },
  ];

type TripBarProps = {
  /** Called once a destination is chosen. Usually opens trip setup. */
  onSubmit: () => void;
  className?: string;
};

/**
 * The trip search card: who's going (tabs), where, when, how many — and one
 * big button. It edits the same draft as the full setup screen, so "Plan it"
 * carries everything across.
 */
export function TripBar({ onSubmit, className }: TripBarProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [nudged, setNudged] = useState(false);
  const today = useMemo(() => startOfToday(), []);

  const draft = useTripDraft();
  const { destination, startDate, endDate, travellers, interests } = draft;
  const familyTrip = interests.includes('family');
  const activeParty =
    travellers === 1
      ? 'solo'
      : travellers === 2
        ? 'couple'
        : travellers === 4 && familyTrip
          ? 'family'
          : travellers === 6
            ? 'friends'
            : null;

  // An open panel closes on Escape or a click anywhere outside the card.
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

  function chooseParty(key: (typeof parties)[number]['key'], size: number) {
    draft.setTravellers(size);
    if ((key === 'family') !== familyTrip) draft.toggleInterest('family');
  }

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
  const dateTile = (label: string, date: string) => (
    <span className="block min-w-0 px-3 py-2.5 text-start sm:px-4">
      <span className="block text-xs text-muted">{label}</span>
      <span className="block truncate text-base font-semibold text-ink tabular-nums">
        {formatDay(date, language, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <span className="block truncate text-xs text-muted">
        {formatDay(date, language, { weekday: 'long' })}
      </span>
    </span>
  );

  return (
    <div ref={root} className={cn('relative pt-6 pb-7', className)}>
      {/* Who's going: tabs that sit on the card's top edge */}
      <div className="absolute inset-x-0 top-0 z-10 flex justify-center px-3">
        <div
          role="group"
          aria-label={t('setup.who')}
          className="flex max-w-full [scrollbar-width:none] gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-md"
        >
          {parties.map(({ key, size, icon: Icon }) => {
            const active = activeParty === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => chooseParty(key, size)}
                className={cn(
                  'relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm',
                  active ? 'text-on-primary' : 'text-muted hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="party-active"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
                <Icon className="relative hidden size-4 min-[26rem]:block" aria-hidden="true" />
                <span className="relative">{t(`party.${key}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        animate={nudged && !destination ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setNudged(false)}
        className="rounded-[1.75rem] border border-line bg-surface px-4 pt-11 pb-12 shadow-lg sm:px-6"
      >
        <div className="rounded-lg border border-line-strong">
          <DestinationSearch
            ref={searchRef}
            bare
            value={destination}
            onSelect={draft.setDestination}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={panel === 'dates'}
            aria-label={`${t('ticket.dates')}: ${formatDay(startDate, language, { dateStyle: 'medium' })} – ${formatDay(endDate, language, { dateStyle: 'medium' })}`}
            onClick={() => toggle('dates')}
            className={cn(
              'grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center rounded-lg border transition-colors',
              panel === 'dates'
                ? 'border-primary bg-primary-soft'
                : 'border-line-strong hover:bg-surface-2',
            )}
          >
            <CalendarDays className="ms-4 size-5 text-muted" aria-hidden="true" />
            {dateTile(t('bar.start'), startDate)}
            <span className="border-s border-line">{dateTile(t('bar.end'), endDate)}</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={panel === 'people'}
            onClick={() => toggle('people')}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-start transition-colors',
              panel === 'people'
                ? 'border-primary bg-primary-soft'
                : 'border-line-strong hover:bg-surface-2',
            )}
          >
            <UsersRound className="size-5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">{t('ticket.travellers')}</span>
              <span className="block text-base font-semibold text-ink tabular-nums">
                {travellers}
              </span>
              <span className="block truncate text-xs text-muted">
                {t('ticket.nights')}: {nightsBetween(startDate, endDate)}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted transition-transform',
                panel === 'people' && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </motion.div>

      {/* The main action overlaps the card's bottom edge */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-6">
        <Button
          size="lg"
          onClick={submit}
          className="h-14 w-full max-w-sm text-base tracking-wide uppercase shadow-lg"
          iconEnd={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />}
        >
          {t('setup.planIt')}
        </Button>
      </div>

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
              'absolute top-[calc(100%-1.25rem)] z-30 origin-top rounded-xl border border-line bg-surface p-4 text-start shadow-lg sm:p-5',
              panel === 'dates' ? 'inset-x-0 mx-auto max-w-2xl' : 'end-0 w-full max-w-sm',
            )}
          >
            {panel === 'dates' ? (
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={draft.setDates}
                minDate={today}
                maxNights={MAX_NIGHTS}
              />
            ) : (
              <CrewPicker value={travellers} onChange={draft.setTravellers} />
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
