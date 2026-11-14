import { currencyOfCountry } from './countryCurrency';

/**
 * Home currencies offered in settings. Every code here is quoted by the
 * exchange-rate service (checked against its currency list).
 */
export const CURRENCIES = [
  'INR', 'MYR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'SGD', 'AUD',
  'CAD', 'JPY', 'CNY', 'THB', 'IDR', 'VND', 'HKD', 'KRW', 'CHF', 'NZD', 'PHP', 'LKR', 'BDT',
  'NPR', 'PKR', 'EGP', 'TRY', 'ZAR',
] as const; // prettier-ignore
export type CurrencyCode = (typeof CURRENCIES)[number];

export type UnitSystem = 'metric' | 'imperial';

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
  const currency = region ? currencyOfCountry(region) : undefined;
  return isCurrencyCode(currency) ? currency : 'USD';
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
