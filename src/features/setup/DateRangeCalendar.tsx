import { addDays, addMonths, differenceInCalendarDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { monthGrid, parseISODate, toISODate, weekStartsOn } from '@/lib/dates';
import { useMediaQuery } from '@/lib/useMediaQuery';

type Range = { startDate: string; endDate: string };

type DateRangeCalendarProps = Range & {
  onChange: (range: Range) => void;
  /** Earliest selectable day (normally today). */
  minDate: Date;
  /** Longest allowed stay. */
  maxNights: number;
};

type View = { year: number; month: number };

const viewOf = (date: Date): View => ({ year: date.getFullYear(), month: date.getMonth() });
const monthIndex = (view: View) => view.year * 12 + view.month;

/**
 * Date-range picker. First tap sets the start, second tap sets the end.
 * Keyboard: arrows move by day or week, Page Up/Down by month, Enter selects.
 */
export function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
  minDate,
  maxNights,
}: DateRangeCalendarProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const rtl = i18n.dir() === 'rtl';
  const twoMonths = useMediaQuery('(min-width: 640px)');
  const months = twoMonths ? 2 : 1;

  const [view, setView] = useState<View>(() => viewOf(parseISODate(startDate)));
  const [direction, setDirection] = useState(1);
  /** Set after the first tap, while waiting for the end date. */
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState(startDate);
  const moveFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const minISO = toISODate(minDate);
  const weekStart = weekStartsOn(language);

  const weekdayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { weekday: 'narrow' });
    const longFormatter = new Intl.DateTimeFormat(language, { weekday: 'long' });
    // 2024-09-01 was a Sunday.
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2024, 8, 1 + ((index + weekStart) % 7));
      return { short: formatter.format(day), long: longFormatter.format(day) };
    });
  }, [language, weekStart]);

  const monthTitle = useMemo(
    () => new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }),
    [language],
  );
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(language, { dateStyle: 'full' }),
    [language],
  );

  // What is highlighted: the saved range, or a live preview while choosing the end.
  let shownStart = startDate;
  let shownEnd = endDate;
  if (anchor) {
    const other = hover ?? anchor;
    [shownStart, shownEnd] = other < anchor ? [other, anchor] : [anchor, other];
    const limit = toISODate(addDays(parseISODate(shownStart), maxNights));
    if (shownEnd > limit) shownEnd = limit;
  }

  function showMonthOf(date: string) {
    const target = viewOf(parseISODate(date));
    const offset = monthIndex(target) - monthIndex(view);
    if (offset < 0 || offset >= months) {
      setDirection(offset < 0 ? -1 : 1);
      setView(target);
    }
  }

  function shiftView(by: number) {
    const next = viewOf(addMonths(new Date(view.year, view.month, 1), by));
    if (monthIndex(next) < monthIndex(viewOf(minDate))) return;
    setDirection(by);
    setView(next);
  }

  function pick(date: string) {
    if (date < minISO) return;
    setFocusDate(date);
    if (!anchor) {
      setAnchor(date);
      onChange({ startDate: date, endDate: date });
      return;
    }
    const first = date < anchor ? date : anchor;
    const limit = toISODate(addDays(parseISODate(first), maxNights));
    const chosen = date < anchor ? anchor : date;
    const last = chosen > limit ? limit : chosen;
    onChange({ startDate: first, endDate: last });
    setAnchor(null);
    setHover(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const current = parseISODate(focusDate);
    let next: Date | null = null;
    if (event.key === forward) next = addDays(current, 1);
    else if (event.key === backward) next = addDays(current, -1);
    else if (event.key === 'ArrowDown') next = addDays(current, 7);
    else if (event.key === 'ArrowUp') next = addDays(current, -7);
    else if (event.key === 'PageDown') next = addMonths(current, 1);
    else if (event.key === 'PageUp') next = addMonths(current, -1);
    if (!next) return;

    event.preventDefault();
    if (differenceInCalendarDays(next, minDate) < 0) next = minDate;
    const iso = toISODate(next);
    moveFocus.current = true;
    setFocusDate(iso);
    if (anchor) setHover(iso);
    showMonthOf(iso);
  }

  // After a keyboard move, put real focus on the new day once it is rendered.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, view]);

  const canGoBack = monthIndex(view) > monthIndex(viewOf(minDate));
  const visible = Array.from({ length: months }, (_, index) =>
    viewOf(addMonths(new Date(view.year, view.month, 1), index)),
  );
  // If the focus day scrolled out of view, the first visible valid day takes the tab stop.
  const focusVisible = visible.some(
    (item) => monthIndex(item) === monthIndex(viewOf(parseISODate(focusDate))),
  );
  const fallbackFocus = toISODate(
    new Date(view.year, view.month, 1) < minDate ? minDate : new Date(view.year, view.month, 1),
  );
  const tabStop = focusVisible ? focusDate : fallbackFocus;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('setup.dates.prev')}
          disabled={!canGoBack}
          onClick={() => shiftView(-1)}
          className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {anchor ? t('setup.dates.pickEnd') : t('setup.dates.pickStart')}
        </p>
        <button
          type="button"
          aria-label={t('setup.dates.next')}
          onClick={() => shiftView(1)}
          className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2"
        >
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow keys bubble up from the day buttons */}
      <div
        ref={gridRef}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHover(null)}
        className="relative mt-2 overflow-hidden"
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={`${view.year}-${view.month}-${months}`}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: (rtl ? -dir : dir) * 40 }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: (rtl ? dir : -dir) * 40 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-8 sm:grid-cols-2"
          >
            {visible.map((item) => {
              const title = monthTitle.format(new Date(item.year, item.month, 1));
              return (
                <div key={monthIndex(item)} role="grid" aria-label={title}>
                  <p
                    className="text-center font-display text-lg font-medium text-ink"
                    aria-hidden="true"
                  >
                    {title}
                  </p>
                  <div role="row" className="mt-3 grid grid-cols-7">
                    {weekdayNames.map((name) => (
                      <span
                        key={name.long}
                        role="columnheader"
                        aria-label={name.long}
                        className="pb-1 text-center text-xs font-semibold text-muted"
                      >
                        {name.short}
                      </span>
                    ))}
                  </div>
                  {monthGrid(item.year, item.month, weekStart).map((week, weekIndex) => (
                    <div key={weekIndex} role="row" className="grid grid-cols-7">
                      {week.map((day, dayIndex) => {
                        if (!day) return <span key={dayIndex} role="gridcell" />;
                        const iso = toISODate(day);
                        const disabled = iso < minISO;
                        const isStart = iso === shownStart;
                        const isEnd = iso === shownEnd;
                        const inRange = iso > shownStart && iso < shownEnd;
                        const edge = isStart || isEnd;
                        const single = shownStart === shownEnd;
                        return (
                          <div
                            key={dayIndex}
                            role="gridcell"
                            aria-selected={edge || inRange}
                            className={cn(
                              'relative py-0.5',
                              // The soft band behind the range, squared off between days.
                              inRange && 'bg-primary-soft',
                              !single && isStart && 'rounded-s-full bg-primary-soft',
                              !single && isEnd && 'rounded-e-full bg-primary-soft',
                            )}
                          >
                            <button
                              type="button"
                              data-date={iso}
                              tabIndex={iso === tabStop ? 0 : -1}
                              aria-label={dayLabel.format(day)}
                              aria-disabled={disabled || undefined}
                              onClick={() => pick(iso)}
                              onMouseEnter={() => anchor && !disabled && setHover(iso)}
                              onFocus={() => setFocusDate(iso)}
                              className={cn(
                                'relative mx-auto flex size-10 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                                disabled
                                  ? 'cursor-not-allowed text-muted/50'
                                  : edge
                                    ? 'font-semibold text-on-primary'
                                    : 'text-ink hover:bg-surface-2',
                                iso === minISO && !edge && 'font-semibold text-primary-ink',
                              )}
                            >
                              {edge && (
                                <motion.span
                                  layoutId={isStart ? 'cal-start' : 'cal-end'}
                                  className="absolute inset-0 rounded-full bg-primary"
                                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                                />
                              )}
                              <span className="relative">{day.getDate()}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
