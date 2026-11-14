/**
 * Home-currency list for settings. Milestone 3 swaps this for the live list
 * from the exchange-rate service; until then it is limited to currencies that
 * service is known to quote.
 */
export const CURRENCIES = [
  'INR',
  'MYR',
  'USD',
  'EUR',
  'GBP',
  'SGD',
  'AUD',
  'CAD',
  'JPY',
  'CNY',
  'THB',
  'IDR',
  'HKD',
  'KRW',
  'CHF',
  'NZD',
  'PHP',
  'TRY',
  'ZAR',
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export type UnitSystem = 'metric' | 'imperial';

const EUROZONE = ['AT', 'BE', 'DE', 'ES', 'FI', 'FR', 'GR', 'IE', 'IT', 'NL', 'PT'];

const REGION_CURRENCY: Record<string, CurrencyCode> = {
  IN: 'INR',
  MY: 'MYR',
  US: 'USD',
  GB: 'GBP',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  JP: 'JPY',
  CN: 'CNY',
  TH: 'THB',
  ID: 'IDR',
  HK: 'HKD',
  KR: 'KRW',
  CH: 'CHF',
  NZ: 'NZD',
  PH: 'PHP',
  TR: 'TRY',
  ZA: 'ZAR',
  ...Object.fromEntries(EUROZONE.map((region) => [region, 'EUR' as const])),
};

const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** Best-guess region ("IN", "MY") from a BCP 47 tag such as "en-IN" or "ml". */
export function regionOf(tag: string | undefined): string | undefined {
  if (!tag) return undefined;
  try {
    return new Intl.Locale(tag).maximize().region;
  } catch {
    return undefined;
  }
}

export function detectCurrency(tag: string | undefined): CurrencyCode {
  const region = regionOf(tag);
  return (region && REGION_CURRENCY[region]) || 'USD';
}

export function detectUnits(tag: string | undefined): UnitSystem {
  const region = regionOf(tag);
  return region && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}

/** "Indian Rupee" in the given UI language, falling back to the code. */
export function currencyName(code: CurrencyCode, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}
