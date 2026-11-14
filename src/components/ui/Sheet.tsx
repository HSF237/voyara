import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';
import { DialogPortal } from './DialogPortal';
import { useDialogBehaviour } from './useDialogBehaviour';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /**
   * "bottom" slides up and can be dragged down to dismiss (phones).
   * "end" is a side drawer on the trailing edge: right in LTR, left in RTL.
   */
  side?: 'bottom' | 'end';
  className?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = 'bottom',
  className,
}: SheetProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dragControls = useDragControls();
  useDialogBehaviour(open, onClose, panelRef);

  const rtl = i18n.dir() === 'rtl';
  const bottom = side === 'bottom';

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  }

  return (
    <DialogPortal open={open} align={side} onScrimClick={onClose}>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        variants={
          bottom
            ? { closed: { y: '100%', opacity: 0 }, open: { y: 0, opacity: 1 } }
            : { closed: { x: rtl ? '-100%' : '100%', opacity: 0 }, open: { x: 0, opacity: 1 } }
        }
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        drag={bottom ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={bottom ? handleDragEnd : undefined}
        className={cn(
          'relative flex flex-col bg-surface shadow-lg outline-none',
          bottom
            ? 'max-h-[88dvh] w-full max-w-2xl rounded-t-xl pb-[env(safe-area-inset-bottom)]'
            : 'h-full w-[min(26rem,100vw)]',
          className,
        )}
      >
        {bottom && (
          <div
            onPointerDown={(event) => dragControls.start(event)}
            className="flex cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong/60" />
          </div>
        )}
        <div className={cn('flex items-start gap-4 px-5 sm:px-6', bottom ? 'pt-2' : 'pt-5')}>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-medium text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label={t('common.close')} size="sm" onClick={onClose} className="-me-2 -mt-1">
            <X className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </motion.div>
    </DialogPortal>
  );
}
