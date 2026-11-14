import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  icon?: ReactNode;
};

/** A toggle: interests, travel style, filters. Announced as a pressed/unpressed button. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, onSelectedChange, icon, className, children, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelectedChange?.(!selected);
      }}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium select-none',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-primary bg-primary-soft text-primary-ink'
          : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="inline-flex"
            aria-hidden="true"
          >
            <Check className="size-4" strokeWidth={2.5} />
          </motion.span>
        ) : icon ? (
          <motion.span
            key="icon"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="inline-flex [&>svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </motion.span>
        ) : null}
      </AnimatePresence>
      {children}
    </button>
  );
});
