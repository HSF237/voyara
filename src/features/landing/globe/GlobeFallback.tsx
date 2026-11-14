import { cn } from '@/lib/cn';

/**
 * A still, CSS-only globe. Shown while the 3D code downloads, and instead of
 * it on devices without WebGL or with very little power to spare.
 */
export function GlobeFallback({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-full items-center justify-center', className)} aria-hidden="true">
      <div
        className="aspect-square w-[78%] rounded-full shadow-[0_0_80px_-10px_var(--primary)]"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--primary) 55%, white) 0%, var(--primary) 38%, color-mix(in oklab, var(--primary) 55%, black) 100%)',
        }}
      />
    </div>
  );
}
