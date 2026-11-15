import type { Category } from './types.js';

/** Typical visit length for each kind of place, in minutes. */
export const DURATION_MIN: Record<Category, number> = {
  food: 60,
  nature: 90,
  history: 60,
  shopping: 75,
  nightlife: 90,
  adventure: 150,
  family: 150,
  religious: 45,
  culture: 90,
  views: 40,
  architecture: 30,
};

/** Trip interests (chosen in setup) and the place categories each one favours. */
export const INTEREST_CATEGORIES: Record<string, Category[]> = {
  food: ['food'],
  nature: ['nature', 'views'],
  history: ['history', 'culture', 'architecture'],
  shopping: ['shopping'],
  nightlife: ['nightlife'],
  adventure: ['adventure', 'nature'],
  family: ['family', 'nature'],
  religious: ['religious'],
  photography: ['views', 'architecture', 'nature'],
};

// First match wins, so the more specific kinds come first.
const KIND_RULES: [RegExp, Category][] = [
  [/\b(nightclubs|bars|pubs|casino|alcohol)\b/, 'nightlife'],
  [/\b(restaurants|cafes|fast_food|food_courts|foods|marketplaces|bakeries|picnic_site)\b/, 'food'],
  [/\b(malls|shops|bazaars|supermarkets|outdoor)\b/, 'shopping'],
  [/\b(amusement_parks|water_parks|zoos|aquariums|amusements|miniature_parks|ferris_wheels|roller_coasters)\b/, 'family'],
  [/\b(religion|churches|mosques|hindu_temples|buddhist_temples|temples|cathedrals|monasteries|synagogues|other_temples)\b/, 'religious'],
  [/\b(museums|theatres_and_entertainments|art_galleries|planetariums|cultural)\b/, 'culture'],
  [/\b(view_points|towers|observation_towers|lighthouses)\b/, 'views'],
  [/\b(climbing|diving|surfing|kitesurfing|winter_sports|sport)\b/, 'adventure'],
  [/\b(beaches|natural|gardens_and_parks|nature_reserves|waterfalls|islands|geological_formations|water)\b/, 'nature'],
  [/\b(historic|archaeology|fortifications|monuments_and_memorials|castles|palaces|burial_places|historical_places|battlefields)\b/, 'history'],
  [/\b(architecture|bridges|skyscrapers|historic_architecture|urban_environment)\b/, 'architecture'],
]; // prettier-ignore

/** Maps a data source's comma-separated "kinds" to one of our categories. */
export function categoryOfKinds(kinds: string, name = ''): Category {
  for (const [pattern, category] of KIND_RULES) {
    if (pattern.test(kinds)) return category;
  }
  // Untagged sights: the name is the only hint left.
  if (/\b(market|bazaar|mall|street)\b/i.test(name)) return 'shopping';
  return 'culture';
}

/** How well a place suits the trip: fame first, then a lift for matching interests. */
export function scorePlace(
  place: { category: Category; rating: number; image?: string },
  interests: readonly string[],
): number {
  const wanted = new Set(interests.flatMap((interest) => INTEREST_CATEGORIES[interest] ?? []));
  return place.rating * 2 + (wanted.has(place.category) ? 3 : 0) + (place.image ? 1 : 0);
}
