/**
 * The planner's data model. This folder is shared by the browser and by the
 * server functions in /api, so it must stay free of browser APIs and of the
 * "@/" alias (relative imports with a ".js" ending only).
 */

export const CATEGORIES = [
  'food',
  'nature',
  'history',
  'shopping',
  'nightlife',
  'adventure',
  'family',
  'religious',
  'culture',
  'views',
  'architecture',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type PlannerPace = 'relaxed' | 'balanced' | 'packed';

/** A real place from a data source. The planner only ever refers to these by `id`. */
export type PlaceCandidate = {
  /** Stable id from the data source, e.g. "otm:W323394984". */
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: Category;
  /** 1 (worth a look) to 3 (famous), from the data source. */
  rating: number;
  /** Typical visit length in minutes. */
  durationMin: number;
  summary?: string;
  image?: string;
  /** Page that credits the image (author and licence). */
  imageSource?: string;
  wikipedia?: string;
  address?: string;
};

export type TravelMode = 'walk' | 'drive';

export type PlanStop = {
  placeId: string;
  /** "HH:mm", local time at the destination. */
  start: string;
  end: string;
  /** Getting here from the previous stop (0 for the first stop of a day). */
  travelMin: number;
  travelKm: number;
  travelMode: TravelMode;
  /** One line from the AI planner; absent on rule-based plans. */
  tip?: string;
};

export type DayPlan = {
  /** "yyyy-MM-dd" */
  date: string;
  theme?: string;
  /** Start of the lunch break, when the day runs across midday. */
  lunchAt?: string;
  stops: PlanStop[];
};

export type Plan = {
  days: DayPlan[];
  /** "ai": day grouping and tips by the AI planner. "rules": the built-in planner. */
  source: 'ai' | 'rules';
  model?: string;
  summary?: string;
  generatedAt: string;
};

/** What the AI planner is allowed to decide: grouping, order, and a few words. Never places or times. */
export type DayOutline = { theme?: string; stops: { id: string; tip?: string }[] };
