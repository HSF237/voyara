import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { forwardRef, useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { flagEmoji, MIN_QUERY_LENGTH, placeLabel, type Place } from '@/services/geocoding';
import { useDebounced, usePlaceSearch } from '@/services/queries';

type DestinationSearchProps = {
  value: Place | null;
  onSelect: (place: Place | null) => void;
  /** "lg" is the landing-page hero size. */
  size?: 'md' | 'lg';
  /** Visible label. Without it the input is labelled for screen readers only. */
  label?: string;
  className?: string;
};

/**
 * Destination autocomplete (ARIA combobox). Type, then use the arrow keys and
 * Enter, or tap a result. Every suggestion comes from the geocoding service.
 */
export const DestinationSearch = forwardRef<HTMLInputElement, DestinationSearchProps>(
  function DestinationSearch({ value, onSelect, size = 'md', label, className }, ref) {
    const { t } = useTranslation();
    const inputId = useId();
    const listId = useId();
    // null = not editing: show the selected place's name.
    const [draft, setDraft] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const text = draft ?? (value ? placeLabel(value) : '');
    const query = useDebounced(draft ?? '', 220);
    const search = usePlaceSearch(query);
    const typing = (draft ?? '').trim().length >= MIN_QUERY_LENGTH;
    const waiting = typing && (search.isFetching || query !== draft);
    const results = typing ? (search.data ?? []) : [];
    const showList = open && typing;
    const large = size === 'lg';

    function choose(place: Place) {
      onSelect(place);
      setDraft(null);
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (results.length === 0) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setActive((index) => (index + delta + results.length) % results.length);
      } else if (event.key === 'Enter') {
        const place = results[Math.min(active, results.length - 1)];
        if (showList && place) {
          event.preventDefault();
          choose(place);
        }
      } else if (event.key === 'Escape') {
        if (open) {
          event.preventDefault();
          setOpen(false);
          setDraft(null);
        }
      }
    }

    let status = '';
    if (showList) {
      if (search.isError && !waiting) status = t('search.error');
      else if (waiting && results.length === 0) status = t('search.searching');
      else if (results.length === 0) status = t('search.noResults');
      else status = t('search.found', { count: results.length });
    }

    return (
      <div className={cn('relative', className)}>
        <label
          htmlFor={inputId}
          className={label ? 'mb-2 block text-sm font-medium text-ink' : 'sr-only'}
        >
          {label ?? t('home.searchLabel')}
        </label>
        <div className="relative">
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted',
              large ? 'start-5' : 'start-3.5',
            )}
            aria-hidden="true"
          >
            {value && draft === null ? (
              <MapPin className={cn(large ? 'size-5' : 'size-4', 'text-primary-ink')} />
            ) : (
              <Search className={large ? 'size-5' : 'size-4'} />
            )}
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={t('home.searchPlaceholder')}
            value={text}
            onChange={(event) => {
              setDraft(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={(event) => {
              if (value && draft === null) event.target.select();
            }}
            onBlur={() => {
              setOpen(false);
              setDraft(null);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full border border-line-strong bg-surface text-ink shadow-sm transition-shadow placeholder:text-muted',
              'focus:shadow-md',
              large
                ? 'h-16 rounded-full ps-13 pe-14 text-lg'
                : 'h-12 rounded-md ps-10 pe-11 text-base',
            )}
          />
          <span className={cn('absolute top-1/2 -translate-y-1/2', large ? 'end-4' : 'end-2')}>
            {waiting ? (
              <LoaderCircle className="m-2 size-5 animate-spin text-muted" aria-hidden="true" />
            ) : text ? (
              <button
                type="button"
                aria-label={t('search.clear')}
                // Keep focus in the input so the list doesn't close before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(null);
                  setDraft('');
                  setOpen(false);
                }}
                className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>

        <AnimatePresence>
          {showList && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 480, damping: 34 }}
              className="absolute inset-x-0 top-full z-30 mt-2 origin-top overflow-hidden rounded-lg border border-line bg-surface text-start shadow-lg"
            >
              <ul id={listId} role="listbox" aria-label={t('home.searchLabel')} className="p-1.5">
                {results.map((place, index) => (
                  <motion.li
                    key={place.id}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(place)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5',
                      index === active && 'bg-surface-2',
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden="true">
                      {flagEmoji(place.countryCode)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {place.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {[place.region, place.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </ul>
              {results.length === 0 && (
                <p className="px-4 pt-1 pb-4 text-sm text-muted">{status}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
