import { describe, expect, it } from 'vitest';
import { categoryOfKinds, scorePlace } from '@/planner/categories';
import { checkDay } from '@/planner/checks';
import { applyEdits } from '@/planner/edit';
import { distanceKm, estimateLeg } from '@/planner/geo';
import {
  buildPlan,
  choosePlaces,
  groupIntoDays,
  orderDay,
  planFromOutline,
  rescheduleDay,
  scheduleDay,
  shortenRoute,
  type PlanInput,
} from '@/planner/optimise';
import type { Category, PlaceCandidate } from '@/planner/types';

const place = (
  id: string,
  lat: number,
  lng: number,
  category: Category = 'culture',
  rating = 2,
): PlaceCandidate => ({ id, name: id, lat, lng, category, rating, durationMin: 60 });

// Two tight clusters about 11 km apart, as in a city with an old town and a new centre.
const west = [place('w1', 10, 76.0), place('w2', 10.002, 76.001), place('w3', 10.001, 76.003)];
const east = [place('e1', 10, 76.1), place('e2', 10.002, 76.101), place('e3', 10.001, 76.103)];
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  places: [...west, ...east],
  mustIds: [],
  dates: ['2026-11-21', '2026-11-22'],
  pace: 'relaxed',
  ...over,
});
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

describe('distance and travel estimates', () => {
  it('measures a known distance', () => {
    // Kochi to Alappuzha is about 53 km in a straight line.
    const km = distanceKm({ lat: 9.9312, lng: 76.2673 }, { lat: 9.4981, lng: 76.3388 });
    expect(km).toBeGreaterThan(47);
    expect(km).toBeLessThan(52);
  });

  it('walks short hops and drives longer ones', () => {
    const near = estimateLeg({ lat: 10, lng: 76 }, { lat: 10.003, lng: 76.003 });
    const far = estimateLeg({ lat: 10, lng: 76 }, { lat: 10.05, lng: 76.05 });
    expect(near.mode).toBe('walk');
    expect(far.mode).toBe('drive');
    expect(far.minutes).toBeGreaterThan(near.minutes);
  });
});

describe('categories', () => {
  it('maps source tags to our categories, most specific first', () => {
    expect(categoryOfKinds('religion,hindu_temples,interesting_places')).toBe('religious');
    expect(categoryOfKinds('aquariums,cultural,museums,interesting_places,zoos')).toBe('family');
    expect(categoryOfKinds('view_points,other,skyscrapers,architecture')).toBe('views');
    expect(categoryOfKinds('other,unclassified_objects,tourist_object', 'Central Market')).toBe(
      'shopping',
    );
    expect(categoryOfKinds('something_new')).toBe('culture');
  });

  it('lifts places that match the trip interests', () => {
    const park = { category: 'nature' as const, rating: 2 };
    expect(scorePlace(park, ['nature'])).toBeGreaterThan(scorePlace(park, ['food']));
  });
});

describe('built-in planner', () => {
  it('keeps each part of town on its own day', () => {
    const days = groupIntoDays([...west, ...east], 2, 3).map((day) =>
      day.map((item) => item.id[0]),
    );
    expect(days).toHaveLength(2);
    for (const day of days) expect(new Set(day).size).toBe(1);
  });

  it('shortens a zig-zag route', () => {
    const zigzag = [place('a', 0, 0), place('c', 0, 2), place('b', 0, 1), place('d', 0, 3)];
    expect(shortenRoute(zigzag).map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('puts evening places last', () => {
    const day = orderDay([place('bar', 10, 76, 'nightlife'), ...west], { lat: 10, lng: 76 });
    expect(day.at(-1)?.id).toBe('bar');
  });

  it('never drops a must-do when there is more than fits', () => {
    const weak = place('weak', 10.05, 76.05, 'culture', 1);
    const chosen = choosePlaces(
      input({ places: [...west, ...east, weak], mustIds: ['weak'], dates: ['2026-11-21'] }),
    );
    expect(chosen).toHaveLength(3); // relaxed: three stops a day
    expect(chosen.map((item) => item.id)).toContain('weak');
  });

  it('builds a plan with every place once, in time order', () => {
    const plan = buildPlan(input(), new Date('2026-11-14T00:00:00Z'));
    expect(plan.source).toBe('rules');
    expect(plan.days.map((day) => day.date)).toEqual(['2026-11-21', '2026-11-22']);
    const ids = plan.days.flatMap((day) => day.stops.map((stop) => stop.placeId));
    expect([...ids].sort()).toEqual(['e1', 'e2', 'e3', 'w1', 'w2', 'w3']);
    for (const day of plan.days) {
      expect(day.stops[0]?.start).toBe('10:00');
      expect(day.stops[0]?.travelMin).toBe(0);
      for (let index = 1; index < day.stops.length; index += 1) {
        expect(minutes(day.stops[index]!.start)).toBeGreaterThanOrEqual(
          minutes(day.stops[index - 1]!.end),
        );
      }
    }
  });

  it('adds a lunch break when a day runs across midday', () => {
    const day = scheduleDay('2026-11-21', [...west, east[0]!], 'balanced');
    // 09:30 start, three one-hour stops a short walk apart: the fourth would begin after 12:15.
    expect(day.lunchAt).toBeDefined();
    const fourth = day.stops[3]!;
    expect(minutes(fourth.start)).toBeGreaterThanOrEqual(minutes(day.lunchAt!) + 60);
    expect(scheduleDay('2026-11-21', west.slice(0, 2), 'balanced').lunchAt).toBeUndefined();
  });

  it('leaves later days free when there are few places', () => {
    const plan = buildPlan(
      input({ places: west, dates: ['2026-11-21', '2026-11-22', '2026-11-23'] }),
    );
    expect(plan.days[0]?.stops).toHaveLength(3);
    expect(plan.days[2]?.stops).toHaveLength(0);
  });
});

describe('AI outline → plan', () => {
  it('drops invented and repeated places, and adds a missing must-do', () => {
    const plan = planFromOutline(
      [
        {
          theme: 'Old town',
          stops: [{ id: 'w1', tip: 'Go early.' }, { id: 'made-up' }, { id: 'w2' }, { id: 'w1' }],
        },
        { theme: 'New centre', stops: [{ id: 'e1' }, { id: 'e2' }] },
      ],
      input({ mustIds: ['e3'] }),
      { model: 'test-model', summary: 'Two halves of the city.' },
    );
    expect(plan?.source).toBe('ai');
    expect(plan?.model).toBe('test-model');
    const ids = plan?.days.flatMap((day) => day.stops.map((stop) => stop.placeId)) ?? [];
    expect(ids).not.toContain('made-up');
    expect(ids.filter((id) => id === 'w1')).toHaveLength(1);
    // The missing must-do joins the day whose places are nearest to it.
    expect(plan?.days[1]?.stops.map((stop) => stop.placeId)).toContain('e3');
    expect(plan?.days[0]?.theme).toBe('Old town');
    expect(plan?.days[0]?.stops.find((stop) => stop.placeId === 'w1')?.tip).toBe('Go early.');
  });

  it('refuses an outline with nothing usable', () => {
    expect(planFromOutline([{ stops: [{ id: 'nope' }] }], input())).toBeNull();
    expect(planFromOutline([], input())).toBeNull();
  });

  it('works out the times itself', () => {
    const plan = planFromOutline(
      [{ stops: [{ id: 'w1' }, { id: 'e1' }] }, { stops: [{ id: 'w2' }] }],
      input(),
    );
    const [first, second] = plan?.days[0]?.stops ?? [];
    expect(first?.start).toBe('10:00');
    expect(second?.travelMode).toBe('drive');
    expect(minutes(second!.start)).toBe(minutes(first!.end) + second!.travelMin);
  });
});

describe('editing a day', () => {
  it('re-times the day after a reorder and keeps its tips', () => {
    const day = scheduleDay('2026-11-21', [west[0]!, east[0]!, west[1]!], 'balanced', {
      theme: 'Mixed',
      tips: { w1: 'Bring water.' },
    });
    const tidy = rescheduleDay(day, ['w1', 'w2', 'e1'], [...west, ...east], 'balanced');
    expect(tidy.stops.map((stop) => stop.placeId)).toEqual(['w1', 'w2', 'e1']);
    expect(tidy.theme).toBe('Mixed');
    expect(tidy.stops[0]?.tip).toBe('Bring water.');
    expect(tidy.stops[1]?.travelMode).toBe('walk');
    const travel = (plan: typeof day) => plan.stops.reduce((sum, stop) => sum + stop.travelMin, 0);
    expect(travel(tidy)).toBeLessThan(travel(day));
  });
});

describe('AI edit operations', () => {
  const all = [...west, ...east];
  const base = () => buildPlan(input({ pace: 'relaxed' }), new Date('2026-11-14T00:00:00Z'));
  const idsOf = (plan: ReturnType<typeof base>) =>
    plan.days.map((day) => day.stops.map((stop) => stop.placeId));

  it('moves, removes and adds only places the traveller kept, and re-times the days', () => {
    const plan = base();
    const [first] = idsOf(plan);
    const mover = first![0]!;
    const { plan: edited, applied } = applyEdits(
      plan,
      [
        { op: 'move', id: mover, day: 2 },
        { op: 'remove', id: first![1]! },
        { op: 'move', id: 'invented', day: 1 },
        { op: 'move', id: mover, day: 9 },
        { op: 'add', id: first![2]!, day: 2 }, // already planned: ignored
      ],
      all,
      'relaxed',
    );
    expect(applied).toBe(2);
    const [dayOne, dayTwo] = idsOf(edited);
    expect(dayOne).toEqual([first![2]]);
    expect(dayTwo).toHaveLength(4);
    expect(dayTwo!.at(-1)).toBe(mover);
    expect(edited.days[0]?.stops[0]?.start).toBe('10:00');
    expect(edited.days[0]?.stops[0]?.travelMin).toBe(0);
  });

  it('adds a kept place that was left out, and swaps whole days keeping the dates in place', () => {
    const plan = base();
    const spare = place('spare', 10.0015, 76.002);
    const added = applyEdits(
      plan,
      [{ op: 'add', id: 'spare', day: 1 }],
      [...all, spare],
      'relaxed',
    );
    expect(idsOf(added.plan)[0]).toContain('spare');

    const swapped = applyEdits(plan, [{ op: 'swapDays', day: 1, withDay: 2 }], all, 'relaxed').plan;
    expect(idsOf(swapped)).toEqual([idsOf(plan)[1], idsOf(plan)[0]]);
    expect(swapped.days.map((day) => day.date)).toEqual(plan.days.map((day) => day.date));
  });

  it('returns the same plan when nothing applies', () => {
    const plan = base();
    const result = applyEdits(
      plan,
      [
        { op: 'remove', id: 'nope' },
        { op: 'swapDays', day: 1, withDay: 1 },
      ],
      all,
      'relaxed',
    );
    expect(result).toEqual({ plan, applied: 0 });
  });
});

describe('day checks', () => {
  const garden = place('garden', 10, 76, 'nature');
  const hill = place('hill', 10.4, 76.4, 'views');

  it('flags rain on a day with outdoor stops, and a long hop between far places', () => {
    const day = scheduleDay('2026-11-21', [garden, hill], 'balanced');
    const notices = checkDay(day, [garden, hill], 'balanced', { rainChance: 80 });
    expect(notices).toContainEqual({ code: 'rain', chance: 80, outdoor: 2 });
    expect(notices.find((notice) => notice.code === 'longHop')).toMatchObject({ placeId: 'hill' });
    expect(
      checkDay(day, [garden, hill], 'balanced', { rainChance: 20 }).some(
        (notice) => notice.code === 'rain',
      ),
    ).toBe(false);
  });

  it('flags a day with more stops than the pace, and one that ends late', () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...place(`p${index}`, 10 + index * 0.001, 76),
      durationMin: 120,
    }));
    const notices = checkDay(scheduleDay('2026-11-21', many, 'relaxed'), many, 'relaxed');
    expect(notices).toContainEqual({ code: 'packed', stops: 9, limit: 3 });
    expect(notices.some((notice) => notice.code === 'late')).toBe(true);
  });

  it('says nothing about an ordinary day', () => {
    expect(
      checkDay(scheduleDay('2026-11-21', west, 'balanced'), west, 'balanced', { rainChance: 10 }),
    ).toEqual([]);
  });
});
