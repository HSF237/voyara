import { usePlacePhoto } from '@/services/queries';
import type { PlacePhoto } from '@/services/wiki';
import { findDestination } from './catalog';

/**
 * A photo for any destination: the catalogue's own photo when the place is a
 * featured one, otherwise the lead image of its Wikipedia article.
 */
export function useDestinationPhoto(
  place: { name: string; country: string; countryCode: string } | null | undefined,
): PlacePhoto | undefined {
  const featured = place ? findDestination(place) : undefined;
  const looked = usePlacePhoto(featured ? null : place);
  return featured?.photo ?? looked.data ?? undefined;
}
