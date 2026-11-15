import { useTranslation } from 'react-i18next';
import { LoaderMark } from '@/components/Loader';

/**
 * Shown while a page's code is downloading. It looks exactly like the opening
 * screen in index.html, so a cold start reads as one continuous moment.
 */
export function PageFallback() {
  const { t } = useTranslation();
  return (
    <div role="status" className="fixed inset-0 z-40 grid place-items-center bg-bg">
      <span className="sr-only">{t('common.loading')}</span>
      <LoaderMark className="size-18" />
    </div>
  );
}
