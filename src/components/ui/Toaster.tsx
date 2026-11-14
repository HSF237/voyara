import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { dismissToast, useToastStore, type ToastItem, type ToastTone } from './toast';

const icons: Record<ToastTone, typeof Info> = {
  neutral: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

const iconTones: Record<ToastTone, string> = {
  neutral: 'text-sky-ink',
  success: 'text-primary-ink',
  warning: 'text-accent-ink',
  danger: 'text-danger-ink',
};

function ToastCard({ item }: { item: ToastItem }) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const Icon = icons[item.tone];

  // Auto-dismiss, but wait while the pointer or keyboard focus is on the toast.
  useEffect(() => {
    if (paused || item.duration <= 0) return;
    const timer = window.setTimeout(() => dismissToast(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, paused]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={item.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-3.5 shadow-lg"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconTones[item.tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            className="mt-2 rounded-sm text-sm font-semibold text-primary-ink underline-offset-4 hover:underline"
            onClick={() => {
              item.action?.onClick();
              dismissToast(item.id);
            }}
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={t('common.dismiss')}
        onClick={() => dismissToast(item.id)}
        className="-me-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </motion.li>
  );
}

/** Mount once near the app root. Toasts are triggered with toast() from ./toast. */
export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((state) => state.toasts);
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="region"
      aria-label={t('common.notifications')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ol className="flex flex-col items-center gap-2 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </ol>
    </div>,
    document.body,
  );
}
