import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { PlacePhoto } from '@/services/wiki';

/** Author and licence for a photo, linked to its file page on Wikimedia. */
export function PhotoCredit({ photo, className }: { photo: PlacePhoto; className?: string }) {
  const { t } = useTranslation();
  const who = [photo.credit, photo.license].filter(Boolean).join(', ');
  return (
    <a
      href={photo.sourceUrl}
      target="_blank"
      rel="noreferrer"
      title={`${t('photo.by', { credit: who })} · Wikimedia`}
      className={cn(
        'block truncate text-[0.6875rem] underline-offset-2 hover:underline',
        className,
      )}
    >
      {t('photo.by', { credit: who })}
    </a>
  );
}
