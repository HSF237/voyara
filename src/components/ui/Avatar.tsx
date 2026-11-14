import { Children, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { initialsOf } from './avatar.utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

const sizes: Record<AvatarSize, string> = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
};

const tints = [
  'bg-primary-soft text-primary-ink',
  'bg-accent-soft text-accent-ink',
  'bg-sky-soft text-sky-ink',
  'bg-danger-soft text-danger-ink',
] as const;

/** Stable tint per person so the same name always gets the same colour. */
function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return tints[hash % tints.length] ?? tints[0];
}

export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** Person's name. Used for the accessible label and the initials fallback. */
  name: string;
  src?: string;
  /** Emoji avatar (group mode guests pick one). */
  emoji?: string;
  size?: AvatarSize;
};

export function Avatar({ name, src, emoji, size = 'md', className, ...rest }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none',
        'ring-2 ring-surface',
        sizes[size],
        !showImage && tintFor(name),
        className,
      )}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : emoji ? (
        <span aria-hidden="true" className="text-[1.15em] leading-none">
          {emoji}
        </span>
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}

export type AvatarGroupProps = HTMLAttributes<HTMLDivElement> & {
  /** Show at most this many avatars, then a "+N" counter. */
  max?: number;
  size?: AvatarSize;
  children: ReactNode;
};

export function AvatarGroup({
  max = 4,
  size = 'md',
  className,
  children,
  ...rest
}: AvatarGroupProps) {
  const all = Children.toArray(children);
  const visible = all.slice(0, max);
  const hidden = all.length - visible.length;

  return (
    <div className={cn('flex items-center -space-x-2 rtl:space-x-reverse', className)} {...rest}>
      {visible}
      {hidden > 0 && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-ink ring-2 ring-surface',
            sizes[size],
          )}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
