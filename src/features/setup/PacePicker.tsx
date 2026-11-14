import { motion } from 'framer-motion';
import { Moon, Sunrise } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { PACES, type Pace } from '@/features/trip/model';

/**
 * A typical day for each pace, as [start hour, end hour] stops between 8:00
 * and 22:00. Drawn as blocks on a day line so the difference is visible at a
 * glance. The planner uses the same stop counts.
 */
const DAY_RHYTHM: Record<Pace, [number, number][]> = {
  relaxed: [
    [9.5, 11.5],
    [13.5, 15.5],
    [17.5, 19.5],
  ],
  balanced: [
    [9, 10.5],
    [11, 12.5],
    [14, 15.5],
    [16, 17.5],
    [19, 20.5],
  ],
  packed: [
    [8, 9.3],
    [9.7, 11],
    [11.4, 12.7],
    [13.6, 14.9],
    [15.3, 16.6],
    [17, 18.3],
    [19.4, 21],
  ],
};

const DAY_START = 8;
const DAY_END = 22;

function DayRhythm({ pace, active }: { pace: Pace; active: boolean }) {
  return (
    <span className="mt-4 flex items-center gap-2" aria-hidden="true">
      <Sunrise className="size-3.5 shrink-0 text-muted" />
      <span className="relative h-2.5 flex-1 rounded-full bg-surface-2">
        {DAY_RHYTHM[pace].map(([from, to], index) => (
          <motion.span
            key={index}
            className={cn(
              'absolute inset-y-0 origin-left rounded-full rtl:origin-right',
              active ? 'bg-primary' : 'bg-line-strong/50',
            )}
            style={{
              insetInlineStart: `${((from - DAY_START) / (DAY_END - DAY_START)) * 100}%`,
              width: `${((to - from) / (DAY_END - DAY_START)) * 100}%`,
            }}
            initial={false}
            animate={active ? { scaleX: [0.2, 1], opacity: [0.4, 1] } : { scaleX: 1, opacity: 1 }}
            transition={{
              duration: 0.4,
              delay: active ? index * 0.06 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </span>
      <Moon className="size-3.5 shrink-0 text-muted" />
    </span>
  );
}

type PacePickerProps = {
  value: Pace;
  onChange: (pace: Pace) => void;
  label: string;
};

/** Relaxed / Balanced / Packed, each with a picture of what the day looks like. */
export function PacePicker({ value, onChange, label }: PacePickerProps) {
  const { t } = useTranslation();
  const name = useId();

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {PACES.map((pace) => {
          const checked = pace === value;
          return (
            <label key={pace} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={pace}
                checked={checked}
                onChange={() => onChange(pace)}
                className="peer sr-only"
              />
              <motion.span
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'block h-full rounded-lg border p-4 transition-colors',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  checked
                    ? 'border-primary bg-primary-soft'
                    : 'border-line-strong bg-surface hover:bg-surface-2',
                )}
              >
                <span className="block text-sm font-semibold text-ink">
                  {t(`setup.pace.${pace}`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t(`setup.pace.${pace}Hint`)}
                </span>
                <DayRhythm pace={pace} active={checked} />
              </motion.span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
