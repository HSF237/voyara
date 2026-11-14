import { forwardRef, type ElementType, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Lifts on hover. Use when the whole card is a link or button target. */
  interactive?: boolean;
  /** Removes the default padding (for full-bleed photos). */
  flush?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, flush = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line bg-surface shadow-sm',
        !flush && 'p-5 sm:p-6',
        interactive &&
          'transition-[box-shadow,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
      {...rest}
    />
  );
});

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & { as?: ElementType };

export function CardTitle({ as: Tag = 'h3', className, ...rest }: CardTitleProps) {
  return <Tag className={cn('font-display text-lg font-medium text-ink', className)} {...rest} />;
}

export function CardText({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1.5 text-sm text-muted', className)} {...rest} />;
}
