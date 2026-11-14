/** "RM 1,200" / "₹85,000" — whole units, in the user's language. */
export function formatMoney(amount: number, currency: string, language: string): string {
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(language)}`;
  }
}

/** Round to a "nice" number (1, 2 or 5 × a power of ten) for slider steps. */
export function niceNumber(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * power;
}

export type BudgetScale = { min: number; max: number; step: number };

/**
 * Slider range for a trip budget in any currency. Built from the live
 * USD rate so ₹, RM, ¥ and Rp all get a sensible range and step.
 *
 * @param unitsPerUsd how many units of the home currency one US dollar buys
 */
export function budgetScale(unitsPerUsd: number, travellers: number, days: number): BudgetScale {
  const people = Math.max(1, travellers);
  const length = Math.max(1, days);
  const step = niceNumber((unitsPerUsd * 10 * people * length) / 3);
  const min = Math.max(step, Math.round((unitsPerUsd * 15 * people * length) / step) * step);
  const max = Math.round((unitsPerUsd * 600 * people * length) / step) * step;
  return { min, max: Math.max(max, min + step * 10), step };
}

/** Starting point before the person touches the slider: a mid-range trip. */
export function defaultBudget(
  scale: BudgetScale,
  unitsPerUsd: number,
  travellers: number,
  days: number,
): number {
  const target = unitsPerUsd * 90 * Math.max(1, travellers) * Math.max(1, days);
  const snapped = Math.round(target / scale.step) * scale.step;
  return Math.min(scale.max, Math.max(scale.min, snapped));
}

/**
 * Rough units-per-US-dollar, used ONLY to size the budget slider when live
 * rates cannot be reached. Never shown as an exchange rate.
 */
const APPROX_UNITS_PER_USD: Record<string, number> = {
  USD: 1, EUR: 1, GBP: 1, CHF: 1, AUD: 1.5, CAD: 1.4, NZD: 1.7, SGD: 1.3,
  MYR: 4.5, AED: 3.7, SAR: 3.75, QAR: 3.6, CNY: 7, HKD: 7.8, ZAR: 18, TRY: 40,
  THB: 35, PHP: 57, INR: 85, JPY: 150, LKR: 300, PKR: 280, BDT: 120, NPR: 135,
  KRW: 1400, IDR: 16000, VND: 25000, KWD: 0.3, OMR: 0.4, BHD: 0.4, EGP: 50, MVR: 15,
}; // prettier-ignore

export const approxUnitsPerUsd = (currency: string): number => APPROX_UNITS_PER_USD[currency] ?? 1;
