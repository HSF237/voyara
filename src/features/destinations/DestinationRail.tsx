import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wikiTitle } from '@/features/landing/cities';
import { cn } from '@/lib/cn';
import { flagEmoji, type Place } from '@/services/geocoding';
import { usePhotosByTitle } from '@/services/queries';
import type { PlacePhoto } from '@/services/wiki';

const tints = ['bg-primary-soft', 'bg-accent-soft', 'bg-sky-soft', 'bg-danger-soft'] as const;

/** Author and licence for a photo, linked to its page on Wikimedia Commons. */
export function PhotoCredit({ photo, className }: { photo: PlacePhoto; className?: string }) {
  const { t } = useTranslation();
  const who = [photo.credit, photo.license].filter(Boolean).join(', ');
  return (
    <a
      href={photo.sourceUrl}
      target="_blank"
      rel="noreferrer"
      title={`${t('photo.by', { credit: who })} · Wikimedia Commons`}
      className={cn(
        'block truncate text-[0.6875rem] underline-offset-2 hover:underline',
        className,
      )}
    >
      {t('photo.by', { credit: who })}
    </a>
  );
}

function localTime(now: Date, timezone: string | undefined, language: string): string {
  if (!timezone) return '';
  try {
    return new Intl.DateTimeFormat(language, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(now);
  } catch {
    return '';
  }
}

function DestinationCard({
  place,
  photo,
  loading,
  index,
  now,
  onPick,
}: {
  place: Place;
  photo: PlacePhoto | undefined;
  loading: boolean;
  index: number;
  now: Date;
  onPick: (place: Place) => void;
}) {
  const { t, i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photo) && !failed;
  const time = localTime(now, place.timezone, i18n.language);

  return (
    <li className="w-44 shrink-0 snap-start sm:w-52">
      <motion.button
        type="button"
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
        onClick={() => onPick(place)}
        aria-label={`${t('dash.planHere')}: ${place.name}, ${place.country}`}
        className={cn(
          'relative block aspect-[4/5] w-full overflow-hidden rounded-xl text-start shadow-sm transition-shadow hover:shadow-lg',
          tints[index % tints.length],
          loading && 'vy-skeleton animate-shimmer',
        )}
      >
        {showPhoto && photo ? (
          <>
            <img
              src={photo.url}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-500',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
          </>
        ) : (
          !loading && (
            <span
              className="text-6xl absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              {flagEmoji(place.countryCode)}
            </span>
          )
        )}
        {time && (
          <span
            className="absolute start-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-semibold text-white tabular-nums backdrop-blur-sm"
            dir="ltr"
          >
            {time}
          </span>
        )}
        <span
          className={cn('absolute inset-x-0 bottom-0 p-3.5', showPhoto ? 'text-white' : 'text-ink')}
        >
          <span className="block truncate font-display text-lg leading-tight font-medium">
            <span aria-hidden="true">{showPhoto ? `${flagEmoji(place.countryCode)} ` : ''}</span>
            {place.name}
          </span>
          <span className="block truncate text-sm opacity-85">{place.country}</span>
        </span>
      </motion.button>
      {showPhoto && photo ? (
        <PhotoCredit photo={photo} className="mt-1.5 text-muted" />
      ) : (
        <span className="mt-1.5 block h-4" />
      )}
    </li>
  );
}

type DestinationRailProps = {
  places: readonly Place[];
  onPick: (place: Place) => void;
  /** Shared clock, so every card's local time ticks together. */
  now: Date;
  label: string;
};

/** A sideways-scrolling row of destinations with real photos and local time. */
export function DestinationRail({ places, onPick, now, label }: DestinationRailProps) {
  const photos = usePhotosByTitle(places.map(wikiTitle));

  return (
    <ul
      aria-label={label}
      className="-mx-5 flex snap-x scroll-px-5 [scrollbar-width:none] gap-4 overflow-x-auto px-5 pt-1 pb-2 md:-mx-8 md:scroll-px-8 md:px-8"
    >
      {places.map((place, index) => (
        <DestinationCard
          key={place.id}
          place={place}
          photo={photos.data?.[wikiTitle(place)]}
          loading={photos.isPending}
          index={index}
          now={now}
          onPick={onPick}
        />
      ))}
    </ul>
  );
}
