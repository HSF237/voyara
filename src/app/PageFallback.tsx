import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonText } from '@/components/ui';

/** Shown while a lazily loaded page's code is downloading. */
export function PageFallback() {
  const { t } = useTranslation();

  return (
    <div className="container-page py-12" role="status">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <SkeletonText className="mt-6 max-w-xl" lines={3} />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
