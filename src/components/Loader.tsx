import { cn } from '@/lib/cn';

/**
 * Voyara's loading mark: the logo drawing itself inside a slowly turning
 * dotted orbit. The same animation as the opening screen in index.html.
 */
export function LoaderMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-16 overflow-visible', className)}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="46"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="3 9"
        strokeLinecap="round"
        className="vy-loader-ring stroke-primary opacity-45"
      />
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M17 20l15 26 15-26"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="vy-loader-mark stroke-on-primary"
      />
      <circle cx="32" cy="17" r="4.5" className="vy-loader-dot fill-accent" />
    </svg>
  );
}

/** A centred loader with an optional line of text, for pages and large panels. */
export function Loader({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('grid place-items-center gap-8 py-24 text-center', className)}>
      <LoaderMark />
      <p className={cn('text-sm font-medium text-muted', !label && 'sr-only')}>
        {label ?? 'Loading'}
      </p>
    </div>
  );
}
