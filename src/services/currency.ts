import * as z from 'zod/mini';
import { fetchJson } from './http';

/** Exchange rates from Frankfurter (central-bank data, no key). */
export type Rates = {
  base: string;
  /** ISO date the rates were published. */
  date: string;
  /** 1 unit of `base` = rates[quote] units of `quote`. */
  rates: Record<string, number>;
  /** True when served from the on-device copy because the network failed. */
  stale?: boolean;
};

const ratesSchema = z.array(
  z.object({
    date: z.string(),
    base: z.string(),
    quote: z.string(),
    rate: z.number().check(z.positive()),
  }),
);

const cacheKey = (base: string) => `voyara.rates.${base}`;

function readCache(base: string): Rates | null {
  try {
    const raw = localStorage.getItem(cacheKey(base));
    return raw ? (JSON.parse(raw) as Rates) : null;
  } catch {
    return null;
  }
}

function writeCache(rates: Rates): void {
  try {
    const previous = readCache(rates.base);
    const merged = { ...rates, rates: { ...previous?.rates, ...rates.rates } };
    localStorage.setItem(cacheKey(rates.base), JSON.stringify(merged));
  } catch {
    /* storage full or blocked: the live value still works */
  }
}

/**
 * Latest rates for `base` against `quotes`. Falls back to the last copy saved
 * on this device (marked `stale`) so prices still convert offline.
 */
export async function getRates(
  base: string,
  quotes: readonly string[],
  signal?: AbortSignal,
): Promise<Rates> {
  const wanted = [...new Set(quotes.filter((quote) => quote !== base))].sort();
  if (wanted.length === 0) return { base, date: new Date().toISOString().slice(0, 10), rates: {} };

  const url = new URL('https://api.frankfurter.dev/v2/rates');
  url.searchParams.set('base', base);
  url.searchParams.set('quotes', wanted.join(','));

  try {
    const rows = await fetchJson(url.toString(), ratesSchema, { signal, timeoutMs: 6000 });
    const result: Rates = {
      base,
      date: rows[0]?.date ?? new Date().toISOString().slice(0, 10),
      rates: Object.fromEntries(rows.map((row) => [row.quote, row.rate])),
    };
    writeCache(result);
    return result;
  } catch (error) {
    const cached = readCache(base);
    if (cached && wanted.every((quote) => cached.rates[quote] !== undefined)) {
      return { ...cached, stale: true };
    }
    throw error;
  }
}

/** Convert `amount` of `rates.base` into `quote`. Null when the rate is unknown. */
export function convert(amount: number, rates: Rates | undefined, quote: string): number | null {
  if (!rates) return null;
  if (quote === rates.base) return amount;
  const rate = rates.rates[quote];
  return rate === undefined ? null : amount * rate;
}
