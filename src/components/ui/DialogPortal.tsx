import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type DialogPortalProps = {
  open: boolean;
  onScrimClick?: () => void;
  align: 'center' | 'bottom' | 'end';
  children: ReactNode;
};

const alignment: Record<DialogPortalProps['align'], string> = {
  center: 'items-end justify-center p-4 sm:items-center',
  bottom: 'items-end justify-center',
  end: 'items-stretch justify-end',
};

/** Renders the scrim and positions the panel, outside #root so it can stay interactive. */
export function DialogPortal({ open, onScrimClick, align, children }: DialogPortalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="dialog"
          className={cn('fixed inset-0 z-50 flex', alignment[align])}
          initial="closed"
          animate="open"
          exit="closed"
        >
          <motion.div
            className="absolute inset-0 bg-scrim"
            variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onScrimClick}
            aria-hidden="true"
          />
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
