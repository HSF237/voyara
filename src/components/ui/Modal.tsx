import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';
import { DialogPortal } from './DialogPortal';
import { useDialogBehaviour } from './useDialogBehaviour';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Usually the action buttons. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set false for decisions that must be answered: Escape and scrim clicks are ignored. */
  dismissible?: boolean;
  className?: string;
};

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  className,
}: ModalProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogBehaviour(open, onClose, panelRef, dismissible);

  return (
    <DialogPortal open={open} align="center" onScrimClick={dismissible ? onClose : undefined}>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        variants={{
          closed: { opacity: 0, scale: 0.96, y: 12 },
          open: { opacity: 1, scale: 1, y: 0 },
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className={cn(
          'relative flex max-h-[min(40rem,calc(100dvh-2rem))] w-full flex-col rounded-xl bg-surface shadow-lg outline-none',
          widths[size],
          className,
        )}
      >
        <div className="flex items-start gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
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
          {dismissible && (
            <IconButton
              label={t('common.close')}
              size="sm"
              onClick={onClose}
              className="-me-2 -mt-1"
            >
              <X className="size-5" aria-hidden="true" />
            </IconButton>
          )}
        </div>
        {children && <div className="overflow-y-auto p-5 sm:p-6">{children}</div>}
        {footer && (
          <div
            className={cn(
              'flex flex-wrap justify-end gap-3 p-5 sm:p-6',
              children ? 'border-t border-line' : 'pt-5',
            )}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </DialogPortal>
  );
}
