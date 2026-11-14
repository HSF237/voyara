import { afterEach, describe, expect, it, vi } from 'vitest';
import { convert, getRates } from '@/services/currency';
import { forecastWindow, getDailyForecast, weatherKind } from '@/services/weather';
import frankfurter from '../fixtures/frankfurter-rates.json';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('exchange rates', () => {
  it('reads a recorded Frankfurter response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(frankfurter));
    vi.stubGlobal('fetch', fetchMock);

    const rates = await getRates('INR', ['MYR', 'USD', 'AED']);
    expect(rates.base).toBe('INR');
    expect(rates.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(rates.rates).sort()).toEqual(['AED', 'MYR', 'USD']);
    expect(rates.rates.MYR).toBeGreaterThan(0);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('base')).toBe('INR');
    expect(url.searchParams.get('quotes')).toBe('AED,MYR,USD');
  });

  it('needs no request when base and quote are the same', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const rates = await getRates('MYR', ['MYR']);
    expect(rates.rates).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(convert(250, rates, 'MYR')).toBe(250);
  });

  it('falls back to the copy saved on the device when offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(frankfurter)));
    const live = await getRates('INR', ['MYR']);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const cached = await getRates('INR', ['MYR']);
    expect(cached.stale).toBe(true);
    expect(cached.rates.MYR).toBe(live.rates.MYR);
  });

  it('fails when offline with nothing saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(getRates('JPY', ['MYR'])).rejects.toMatchObject({ kind: 'network' });
  });

  it('converts, and refuses to guess an unknown rate', () => {
    const rates = { base: 'INR', date: '2026-11-14', rates: { MYR: 0.05 } };
    expect(convert(1000, rates, 'MYR')).toBe(50);
    expect(convert(1000, rates, 'THB')).toBeNull();
    expect(convert(1000, undefined, 'MYR')).toBeNull();
  });
});

describe('weather', () => {
  it('groups WMO codes into the states the UI draws', () => {
    expect(weatherKind(0)).toBe('clear');
    expect(weatherKind(2)).toBe('partly');
    expect(weatherKind(3)).toBe('cloudy');
    expect(weatherKind(48)).toBe('fog');
    expect(weatherKind(53)).toBe('drizzle');
    expect(weatherKind(63)).toBe('rain');
    expect(weatherKind(81)).toBe('rain');
    expect(weatherKind(75)).toBe('snow');
    expect(weatherKind(96)).toBe('storm');
  });

  it('works out which trip days the 16-day forecast can cover', () => {
    const today = new Date(2026, 10, 14); // 14 Nov 2026
    expect(forecastWindow('2026-11-21', '2026-11-23', today)).toEqual({
      start: '2026-11-21',
      end: '2026-11-23',
    });
    // Trip runs past the horizon: clipped to the last forecast day.
    expect(forecastWindow('2026-11-27', '2026-12-03', today)).toEqual({
      start: '2026-11-27',
      end: '2026-11-29',
    });
    // Already under way: starts from today.
    expect(forecastWindow('2026-11-12', '2026-11-15', today)?.start).toBe('2026-11-14');
    expect(forecastWindow('2027-01-16', '2027-01-18', today)).toBeNull();
    expect(forecastWindow('2026-11-01', '2026-11-05', today)).toBeNull();
  });

  it('parses a daily forecast and leaves out days with missing values', async () => {
    // Shape documented by Open-Meteo for /v1/forecast with these daily variables.
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        latitude: 3.125,
        longitude: 101.75,
        timezone: 'Asia/Kuala_Lumpur',
        daily: {
          time: ['2026-11-21', '2026-11-22', '2026-11-23'],
          weather_code: [95, null, 2],
          temperature_2m_max: [32.4, 31.0, 33.1],
          temperature_2m_min: [24.2, 24.0, 24.6],
          precipitation_probability_max: [88, 40, null],
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const days = await getDailyForecast(
      { lat: 3.139, lng: 101.6869 },
      { start: '2026-11-21', end: '2026-11-23' },
      'imperial',
    );
    expect(days).toEqual([
      { date: '2026-11-21', kind: 'storm', tempMax: 32.4, tempMin: 24.2, rainChance: 88 },
      { date: '2026-11-23', kind: 'partly', tempMax: 33.1, tempMin: 24.6, rainChance: null },
    ]);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('start_date')).toBe('2026-11-21');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
  });
});
