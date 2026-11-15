import { motion } from 'framer-motion';
import { Moon, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { planPath } from '@/app/paths';
import { photoAt } from '@/features/destinations/catalog';
import { useDestinationPhoto } from '@/features/destinations/useDestinationPhoto';
import type { Trip } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { formatDateRange, nightsBetween } from '@/lib/dates';
import { flagEmoji } from '@/services/geocoding';

const bands = [
  'bg-primary-soft text-primary-ink',
  'bg-accent-soft text-accent-ink',
  'bg-sky-soft text-sky-ink',
  'bg-danger-soft text-danger-ink',
] as const;

function bandFor(code: string): string {
  let hash = 0;
  for (const char of code) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return bands[hash % bands.length] ?? bands[0];
}

/** One saved trip, as a card that opens it. */
export function TripCard({ trip, className }: { trip: Trip; className?: string }) {
  const { t, i18n } = useTranslation();
  const nights = nightsBetween(trip.startDate, trip.endDate);
  const photo = useDestinationPhoto(trip.destination);
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photo) && !failed;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={className}
    >
      <Link
        to={planPath(trip.id)}
        className="block h-full overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md"
      >
        <div
          className={cn(
            'relative flex h-36 items-end justify-between overflow-hidden px-5 pb-3',
            bandFor(trip.destination.countryCode),
          )}
        >
          {showPhoto && photo && (
            <>
              <img
                src={photoAt(photo, 500)}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className="absolute inset-0 size-full object-cover"
              />
              <span className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            </>
          )}
          <span className="relative text-4xl leading-none" aria-hidden="true">
            {flagEmoji(trip.destination.countryCode)}
          </span>
          <span
            className={cn(
              'relative font-mono text-xs tracking-wider',
              showPhoto ? 'text-white' : 'opacity-80',
            )}
            dir="ltr"
          >
            {trip.code}
          </span>
        </div>
        <div className="p-5">
          <p className="truncate font-display text-xl font-medium text-ink">
            {trip.destination.name}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{trip.destination.country}</p>
          <p className="mt-3 text-sm font-medium text-ink">
            {formatDateRange(trip.startDate, trip.endDate, i18n.language)}
          </p>
          <p className="mt-2 flex items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Moon className="size-4" aria-hidden="true" />
              <span className="sr-only">{t('ticket.nights')}: </span>
              {nights}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UsersRound className="size-4" aria-hidden="true" />
              <span className="sr-only">{t('ticket.travellers')}: </span>
              {trip.travellers}
            </span>
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
