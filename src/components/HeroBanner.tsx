import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { BANNERS, photoAt, photoSrcSet } from '@/features/destinations/catalog';
import { cn } from '@/lib/cn';
import { PhotoCredit } from './PhotoCredit';

/**
 * A wide photo banner that slowly cross-fades between featured destinations.
 * Children are laid over it; the current photo is credited in the corner.
 */
export function HeroBanner({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const current = BANNERS[index % BANNERS.length];

  useEffect(() => {
    if (reduced || BANNERS.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % BANNERS.length), 7000);
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <div className={cn('relative overflow-hidden bg-primary', className)}>
      <AnimatePresence initial={false}>
        {current && (
          <motion.img
            key={current.id}
            src={photoAt(current.photo, 1280)}
            srcSet={photoSrcSet(current.photo)}
            sizes="100vw"
            alt=""
            fetchPriority={index === 0 ? 'high' : 'auto'}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 9, ease: 'linear' } }}
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/40 to-black/60" />
      <div className="relative h-full">{children}</div>
      {current && (
        <div className="absolute end-4 top-3 flex max-w-[70%] items-center gap-2 text-white/80">
          <span className="truncate text-xs font-semibold">
            {current.name}, {current.country}
          </span>
          <PhotoCredit photo={current.photo} className="min-w-0" />
        </div>
      )}
    </div>
  );
}
