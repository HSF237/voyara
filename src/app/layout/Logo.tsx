import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-8', className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M17 20l15 26 15-26"
        fill="none"
        className="stroke-on-primary"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="17" r="4.5" className="fill-accent" />
    </svg>
  );
}
