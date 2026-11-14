import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Sets the browser tab title: "Settings · Voyara", or the tagline on the home page. */
export function usePageTitle(title?: string): void {
  const { t } = useTranslation();
  const name = t('app.name');
  const tagline = t('app.tagline');

  useEffect(() => {
    document.title = title ? `${title} · ${name}` : `${name} — ${tagline}`;
  }, [title, name, tagline]);
}
