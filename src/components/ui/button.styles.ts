import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-full text-center leading-tight font-semibold select-none ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-danger text-on-danger shadow-sm hover:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-4 py-1.5 text-sm',
  md: 'min-h-11 px-5 py-2 text-sm',
  lg: 'min-h-13 px-7 py-2.5 text-base',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-13',
};

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Square, icon-only button. */
  icon?: boolean;
};

/** Class names for anything that should look like a button (e.g. a router link). */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon = false,
}: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], icon ? iconSizes[size] : sizes[size], fullWidth && 'w-full');
}
