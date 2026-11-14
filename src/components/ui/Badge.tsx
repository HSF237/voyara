import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink',
  success: 'bg-primary-soft text-primary-ink',
  warning: 'bg-accent-soft text-accent-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-sky-soft text-sky-ink',
};

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  success: 'bg-primary',
  warning: 'bg-accent',
  danger: 'bg-danger',
  info: 'bg-sky',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  /** Small status dot before the text (Open / Closes soon / Closed). */
  dot?: boolean;
};

export function Badge({ tone = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
