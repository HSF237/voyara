import { rescheduleDay } from './optimise.js';
import type { Plan, PlaceCandidate, PlannerPace } from './types.js';

/**
 * The only changes the AI editor may ask for. Places are named by id, days by
 * number (1 = first day). Anything else in its answer is ignored.
 */
export type EditOp =
  | { op: 'move'; id: string; day: number }
  | { op: 'add'; id: string; day: number }
  | { op: 'remove'; id: string }
  | { op: 'swapDays'; day: number; withDay: number };

export type EditResult = { plan: Plan; applied: number };

/**
 * Applies edit operations to a plan. Every operation is checked first: the
 * place must be one the traveller kept, the day must exist, a place is never
 * duplicated. Days that changed are re-timed in code; themes and tips stay.
 */
export function applyEdits(
  plan: Plan,
  ops: readonly EditOp[],
  places: readonly PlaceCandidate[],
  pace: PlannerPace,
): EditResult {
  const known = new Set(places.map((place) => place.id));
  const days = plan.days.map((day) => day.stops.map((stop) => stop.placeId));
  const extras = plan.days.map((day) => ({ ...day }));
  const touched = new Set<number>();
  const valid = (day: number) => Number.isInteger(day) && day >= 1 && day <= days.length;
  const dayOf = (id: string) => days.findIndex((ids) => ids.includes(id));
  let applied = 0;

  for (const edit of ops) {
    if (edit.op === 'swapDays') {
      if (!valid(edit.day) || !valid(edit.withDay) || edit.day === edit.withDay) continue;
      const a = edit.day - 1;
      const b = edit.withDay - 1;
      [days[a], days[b]] = [days[b]!, days[a]!];
      // The theme and tips travel with the stops; the dates stay where they are.
      const dateA = extras[a]!.date;
      const dateB = extras[b]!.date;
      [extras[a], extras[b]] = [
        { ...extras[b]!, date: dateA },
        { ...extras[a]!, date: dateB },
      ];
      touched.add(a).add(b);
      applied += 1;
      continue;
    }
    if (!known.has(edit.id)) continue;
    const from = dayOf(edit.id);
    if (edit.op === 'remove') {
      if (from < 0) continue;
      days[from] = days[from]!.filter((id) => id !== edit.id);
      touched.add(from);
    } else {
      if (!valid(edit.day)) continue;
      const to = edit.day - 1;
      if (edit.op === 'add' && from >= 0) continue; // already planned
      if (edit.op === 'move' && (from < 0 || from === to)) continue;
      if (from >= 0) {
        days[from] = days[from]!.filter((id) => id !== edit.id);
        touched.add(from);
      }
      days[to]!.push(edit.id);
      touched.add(to);
    }
    applied += 1;
  }

  if (applied === 0) return { plan, applied };
  return {
    applied,
    plan: {
      ...plan,
      days: extras.map((day, index) =>
        touched.has(index) ? rescheduleDay(day, days[index]!, [...places], pace) : day,
      ),
    },
  };
}
