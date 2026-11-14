import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

export type SegmentedProps<T extends string> = {
  label: string;
  hideLabel?: boolean;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
};

/** Pick one of a few options. Real radio inputs underneath, so arrow keys just work. */
export function Segmented<T extends string>({
  label,
  hideLabel = false,
  value,
  onValueChange,
  options,
  className,
}: SegmentedProps<T>) {
  const id = useId();

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={hideLabel ? 'sr-only' : 'mb-2 text-sm font-medium text-ink'}>
        {label}
      </legend>
      <div className="grid w-full auto-cols-fr grid-flow-col rounded-lg bg-surface-2 p-1 sm:inline-grid sm:w-auto">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label key={option.value} className="relative min-w-0 cursor-pointer">
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={checked}
                onChange={() => onValueChange(option.value)}
                className="peer sr-only"
              />
              {checked && (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="absolute inset-0 rounded-md bg-surface shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative flex h-full min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-center text-sm leading-tight font-semibold transition-colors sm:px-4 sm:whitespace-nowrap',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  checked ? 'text-ink' : 'text-muted hover:text-ink',
                  '[&>svg]:size-4 [&>svg]:shrink-0',
                )}
              >
                {option.icon}
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
