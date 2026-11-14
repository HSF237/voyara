import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui';
import { StatusPage } from './layout/StatusPage';
import { paths } from './paths';
import { usePageTitle } from './usePageTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('errors.notFoundTitle'));

  return (
    <StatusPage
      icon={<Compass aria-hidden="true" />}
      title={t('errors.notFoundTitle')}
      body={t('errors.notFoundBody')}
      action={
        <Link to={paths.home} className={buttonStyles()}>
          {t('errors.goHome')}
        </Link>
      }
    />
  );
}
