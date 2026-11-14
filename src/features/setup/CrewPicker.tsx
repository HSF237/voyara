import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { MAX_TRAVELLERS } from '@/features/trip/model';

const tints = [
  'bg-primary-soft text-primary-ink',
  'bg-accent-soft text-accent-ink',
  'bg-sky-soft text-sky-ink',
  'bg-danger-soft text-danger-ink',
] as const;

const SHOWN = 10;

function groupKey(count: number): 'solo' | 'duo' | 'small' | 'big' {
  if (count === 1) return 'solo';
  if (count === 2) return 'duo';
  return count <= 6 ? 'small' : 'big';
}

type CrewPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

/** Traveller count: a stepper, with one figure per person joining the line-up. */
export function CrewPicker({ value, onChange }: CrewPickerProps) {
  const { t } = useTranslation();
  const shown = Math.min(value, SHOWN);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div
        role="group"
        aria-label={t('setup.travellers.label')}
        className="flex items-center gap-1 rounded-full border border-line-strong bg-surface p-1"
      >
        <IconButton
          label={t('setup.travellers.remove')}
          size="sm"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </IconButton>
        <output className="w-10 text-center font-display text-xl font-medium text-ink tabular-nums">
          <AnimatedNumber value={value} />
        </output>
        <IconButton
          label={t('setup.travellers.add')}
          size="sm"
          disabled={value >= MAX_TRAVELLERS}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="min-w-0">
        <div className="flex h-10 items-center -space-x-2 rtl:space-x-reverse" aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            {Array.from({ length: shown }, (_, index) => (
              <motion.span
                key={index}
                layout
                initial={{ opacity: 0, scale: 0, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 14 }}
                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full ring-2 ring-surface',
                  tints[index % tints.length],
                )}
              >
                <UserRound className="size-4.5" />
              </motion.span>
            ))}
            {value > SHOWN && (
              <motion.span
                key="more"
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink ring-2 ring-surface"
              >
                +{value - SHOWN}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-1 text-sm text-muted">{t(`setup.crew.${groupKey(value)}`)}</p>
      </div>
    </div>
  );
}
