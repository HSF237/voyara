import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shimmering placeholder. Purely decorative: wrap a loading area in an element
 * with role="status" and a visually hidden label so screen readers hear
 * "Loading" once instead of nothing.
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('vy-skeleton animate-shimmer rounded-md', className)}
      {...rest}
    />
  );
}

export type SkeletonTextProps = HTMLAttributes<HTMLDivElement> & { lines?: number };

export function SkeletonText({ lines = 3, className, ...rest }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={cn('space-y-2.5', className)} {...rest}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5 rounded-full', index === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}
