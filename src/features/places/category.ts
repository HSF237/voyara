import {
  Binoculars,
  Building2,
  Castle,
  FerrisWheel,
  Landmark,
  Martini,
  Mountain,
  Palette,
  ShoppingBag,
  Trees,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SceneName } from '@/components/Scene';
import type { Category } from '@/planner/types';

export const categoryIcons: Record<Category, LucideIcon> = {
  food: Utensils,
  nature: Trees,
  history: Castle,
  shopping: ShoppingBag,
  nightlife: Martini,
  adventure: Mountain,
  family: FerrisWheel,
  religious: Landmark,
  culture: Palette,
  views: Binoculars,
  architecture: Building2,
};

/** The illustration shown when a place has no photo. */
export const categoryScenes: Record<Category, SceneName> = {
  food: 'food',
  nature: 'hills',
  adventure: 'hills',
  views: 'hills',
  history: 'heritage',
  religious: 'heritage',
  culture: 'heritage',
  shopping: 'city',
  nightlife: 'city',
  family: 'city',
  architecture: 'city',
};

const OWN_LABELS = new Set<Category>(['culture', 'views', 'architecture']);

/** Most categories share their name with a trip interest; three have their own. */
export function categoryLabel(t: TFunction, category: Category): string {
  return t(OWN_LABELS.has(category) ? `cats.${category}` : `interests.${category}`);
}
