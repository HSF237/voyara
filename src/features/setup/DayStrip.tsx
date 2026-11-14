import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { daysOfTrip, formatDay } from '@/lib/dates';
import type { DayForecast, WeatherKind } from '@/services/weather';
import { weatherIcons } from './weatherIcons';

const wet: WeatherKind[] = ['drizzle', 'rain', 'storm', 'snow'];

type DayStripProps = {
  startDate: string;
  endDate: string;
  /** When present, days inside the forecast show real weather instead of a plain sun. */
  forecast?: DayForecast[];
  className?: string;
};

/**
 * The trip as a row of days with the nights between them. Days grow and shrink
 * with the date range; forecast days swap their sun for the real outlook.
 */
export function DayStrip({ startDate, endDate, forecast, className }: DayStripProps) {
  const { t, i18n } = useTranslation();
  const days = daysOfTrip(startDate, endDate);
  const byDate = new Map(forecast?.map((day) => [day.date, day]));

  return (
    <ol
      aria-label={t('setup.dates.strip')}
      className={cn(
        'flex [scrollbar-width:none] items-center gap-1 overflow-x-auto pb-1',
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {days.map((date, index) => {
          const outlook = byDate.get(date);
          const Icon = outlook ? weatherIcons[outlook.kind] : Sun;
          const rainy = outlook ? wet.includes(outlook.kind) : false;
          return (
            <motion.li
              key={date}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
              className="flex shrink-0 items-center gap-1"
            >
              {index > 0 && <Moon className="size-3 text-line-strong" aria-hidden="true" />}
              <span
                className={cn(
                  'flex w-13 flex-col items-center rounded-md px-1 py-2',
                  rainy ? 'bg-sky-soft text-sky-ink' : 'bg-accent-soft text-accent-ink',
                )}
              >
                <span className="text-xs font-semibold">
                  {formatDay(date, i18n.language, { weekday: 'short' })}
                </span>
                <Icon className="my-1 size-4.5" aria-hidden="true" />
                <span className="text-xs tabular-nums">
                  {outlook
                    ? `${Math.round(outlook.tempMax)}°`
                    : formatDay(date, i18n.language, { day: 'numeric' })}
                </span>
                {outlook && (
                  <span className="sr-only">
                    {t(`weather.${outlook.kind}`)}
                    {outlook.rainChance !== null &&
                      `, ${t('trip.rainChance')}: ${outlook.rainChance}%`}
                  </span>
                )}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
