import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PhotoProps = {
  src: string | undefined;
  /** Empty for decorative photos (the usual case: a caption sits beside them). */
  alt?: string;
  className?: string;
  /** Shown when there is no photo, or it fails to load. */
  fallback?: ReactNode;
  eager?: boolean;
  sizes?: string;
  srcSet?: string;
};

/**
 * A photo that arrives gracefully: a soft shimmer holds its place, then the
 * image fades and settles in. Fills its parent, which sets the shape.
 */
export function Photo({ src, alt = '', className, fallback, eager, sizes, srcSet }: PhotoProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (!src || state === 'failed') {
    return (
      <span className={cn('absolute inset-0 grid place-items-center bg-surface-2', className)}>
        {fallback}
      </span>
    );
  }
  return (
    <>
      {state === 'loading' && <span className="vy-skeleton absolute inset-0 animate-shimmer" />}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        // A cached image can finish before React attaches onLoad.
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setState('ready');
        }}
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
        className={cn(
          'absolute inset-0 size-full object-cover transition-[opacity,scale,filter] duration-700 ease-out',
          state === 'ready' ? 'blur-0 scale-100 opacity-100' : 'scale-105 opacity-0 blur-sm',
          className,
        )}
      />
    </>
  );
}
