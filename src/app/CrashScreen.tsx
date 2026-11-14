import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { StatusPage } from './layout/StatusPage';

/** Friendly fallback when rendering throws. Reloading recovers almost every case. */
export function CrashScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-bg text-ink" role="alert">
      <StatusPage
        icon={<TriangleAlert aria-hidden="true" />}
        title={t('errors.crashTitle')}
        body={t('errors.crashBody')}
        action={<Button onClick={() => window.location.reload()}>{t('errors.retry')}</Button>}
      />
    </div>
  );
}
