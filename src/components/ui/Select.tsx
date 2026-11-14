import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  options: readonly SelectOption[];
  onValueChange?: (value: string) => void;
};

/** Native select, restyled: the platform picker is the most accessible one on phones. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel = false, hint, options, onValueChange, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;

  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={selectId}
        className={hideLabel ? 'sr-only' : 'mb-2 block text-sm font-medium text-ink'}
      >
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onValueChange?.(event.target.value)}
          className={cn(
            'h-11 w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-surface ps-3.5 pe-10 text-sm font-medium text-ink',
            'transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
