import { describe, expect, it } from 'vitest';
import {
  arcPoints,
  latLngToVec3,
  rotationFacing,
  shortestAngle,
} from '@/features/landing/globe/math';
import { makeTripCode } from '@/features/trip/model';
import { currencyOfCountry } from '@/lib/countryCurrency';
import {
  daysOfTrip,
  defaultTripDates,
  monthGrid,
  nightsBetween,
  parseISODate,
  toISODate,
} from '@/lib/dates';
import { budgetScale, defaultBudget, niceNumber } from '@/lib/money';

describe('dates', () => {
  it('round-trips calendar days without time-zone drift', () => {
    expect(toISODate(parseISODate('2027-01-16'))).toBe('2027-01-16');
    expect(parseISODate('2027-01-16').getHours()).toBe(0);
  });

  it('counts nights and lists every day of a trip', () => {
    expect(nightsBetween('2027-01-16', '2027-01-16')).toBe(0);
    expect(nightsBetween('2027-01-30', '2027-02-02')).toBe(3);
    expect(daysOfTrip('2027-01-30', '2027-02-01')).toEqual([
      '2027-01-30',
      '2027-01-31',
      '2027-02-01',
    ]);
  });

  it('defaults to a three-day trip starting on a Saturday at least three days out', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const today = new Date(2026, 10, 14 + offset);
      const { startDate, endDate } = defaultTripDates(today);
      const start = parseISODate(startDate);
      expect(start.getDay()).toBe(6);
      expect(nightsBetween(toISODate(today), startDate)).toBeGreaterThanOrEqual(3);
      expect(nightsBetween(startDate, endDate)).toBe(2);
    }
  });

  it('lays a month out in full weeks from the chosen first weekday', () => {
    // January 2027 starts on a Friday and has 31 days.
    const mondayFirst = monthGrid(2027, 0, 1);
    expect(mondayFirst.every((week) => week.length === 7)).toBe(true);
    expect(mondayFirst[0]?.map((day) => day?.getDate() ?? null)).toEqual([
      null,
      null,
      null,
      null,
      1,
      2,
      3,
    ]);
    const sundayFirst = monthGrid(2027, 0, 0);
    expect(sundayFirst[0]?.map((day) => day?.getDate() ?? null)).toEqual([
      null,
      null,
      null,
      null,
      null,
      1,
      2,
    ]);
    expect(mondayFirst.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('budget', () => {
  it('rounds to 1, 2 or 5 times a power of ten', () => {
    expect(niceNumber(17)).toBe(20);
    expect(niceNumber(1700)).toBe(2000);
    expect(niceNumber(62)).toBe(50);
    expect(niceNumber(0)).toBe(1);
  });

  it.each([
    ['USD', 1],
    ['MYR', 4.4],
    ['INR', 94],
    ['IDR', 16500],
  ])('builds a usable slider range in %s', (_currency, unitsPerUsd) => {
    for (const [people, days] of [
      [1, 1],
      [2, 3],
      [12, 14],
    ] as const) {
      const scale = budgetScale(unitsPerUsd, people, days);
      const start = defaultBudget(scale, unitsPerUsd, people, days);
      expect(scale.min).toBeGreaterThan(0);
      expect(scale.max).toBeGreaterThan(scale.min);
      expect((scale.max - scale.min) / scale.step).toBeGreaterThanOrEqual(10);
      expect(start).toBeGreaterThanOrEqual(scale.min);
      expect(start).toBeLessThanOrEqual(scale.max);
      expect(start % scale.step).toBe(0);
    }
  });

  it('knows which currency a country uses', () => {
    expect(currencyOfCountry('MY')).toBe('MYR');
    expect(currencyOfCountry('in')).toBe('INR');
    expect(currencyOfCountry('FR')).toBe('EUR');
    expect(currencyOfCountry('AE')).toBe('AED');
    expect(currencyOfCountry('ZZ')).toBeUndefined();
  });
});

describe('trip code', () => {
  it('is short and avoids look-alike characters', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(makeTripCode()).toMatch(/^VY-[A-HJ-NP-Z2-9]{5}$/);
    }
  });
});

describe('globe maths', () => {
  it('puts longitude 0 in front, east to the right and north up', () => {
    const [x0, y0, z0] = latLngToVec3(0, 0);
    expect([x0, y0, z0].map((n) => Math.round(n))).toEqual([0, 0, 1]);
    expect(latLngToVec3(0, 90)[0]).toBeCloseTo(1);
    expect(latLngToVec3(90, 0)[1]).toBeCloseTo(1);
  });

  it('turns the short way round', () => {
    expect(shortestAngle(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(shortestAngle(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
    expect(rotationFacing(0, 90).yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('draws arcs that start and end on the surface and rise in between', () => {
    const points = arcPoints({ lat: 9.93, lng: 76.27 }, { lat: 3.14, lng: 101.69 }, 20);
    const length = (p: number[]) => Math.hypot(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    expect(points).toHaveLength(21);
    expect(length(points[0]!)).toBeCloseTo(1);
    expect(length(points[20]!)).toBeCloseTo(1);
    expect(length(points[10]!)).toBeGreaterThan(1.05);
  });
});
