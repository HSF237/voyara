import { motion, type HTMLMotionProps } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button.styles';

const press = { scale: 0.97 };
const spring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and blocks clicks while work is in progress. */
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    loading = false,
    iconStart,
    iconEnd,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      whileTap={press}
      transition={spring}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : iconStart}
      {children}
      {iconEnd}
    </motion.button>
  );
});

export type IconButtonProps = Omit<HTMLMotionProps<'button'>, 'children' | 'aria-label'> & {
  /** Required: icon-only buttons have no visible text for screen readers. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={press}
      transition={spring}
      className={cn(buttonStyles({ variant, size, icon: true }), className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
