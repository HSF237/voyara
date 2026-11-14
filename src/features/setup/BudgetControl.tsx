import { useTranslation } from 'react-i18next';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Slider } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatMoney, type BudgetScale } from '@/lib/money';
import { convert, type Rates } from '@/services/currency';

type BudgetControlProps = {
  value: number;
  onChange: (value: number) => void;
  scale: BudgetScale;
  /** The traveller's home currency: what the slider is in. */
  currency: string;
  travellers: number;
  days: number;
  /** Destination currency and country, once a destination is chosen. */
  localCurrency?: string;
  country?: string;
  rates?: Rates;
  ratesFailed: boolean;
};

/** Trip budget in the home currency, with the live local-currency equivalent. */
export function BudgetControl({
  value,
  onChange,
  scale,
  currency,
  travellers,
  days,
  localCurrency,
  country,
  rates,
  ratesFailed,
}: BudgetControlProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const perPersonDay = value / Math.max(1, travellers) / Math.max(1, days);
  const showLocal = Boolean(localCurrency && localCurrency !== currency);
  const local = showLocal && localCurrency ? convert(value, rates, localCurrency) : null;

  return (
    <div>
      <p className="font-display text-3xl font-medium tracking-tight text-ink tabular-nums">
        <AnimatedNumber
          value={value}
          format={(amount) => formatMoney(amount, currency, language)}
        />
      </p>
      <Slider
        label={t('setup.budget.total')}
        value={value}
        min={scale.min}
        max={scale.max}
        step={scale.step}
        onValueChange={onChange}
        formatValue={(amount) => formatMoney(amount, currency, language)}
        className="mt-3"
      />
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-surface-2 px-4 py-3">
          <dt className="text-muted">{t('setup.budget.perPersonDay')}</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">
            <AnimatedNumber
              value={perPersonDay}
              format={(amount) => formatMoney(amount, currency, language)}
            />
          </dd>
        </div>
        {showLocal && (
          <div className="rounded-md bg-surface-2 px-4 py-3">
            <dt className="text-muted">{t('setup.budget.inLocal', { country })}</dt>
            <dd className="mt-0.5 font-semibold text-ink tabular-nums">
              {local !== null && localCurrency ? (
                <>
                  <AnimatedNumber
                    value={local}
                    format={(amount) => formatMoney(amount, localCurrency, language)}
                  />
                  {rates && (
                    <span className="ms-2 text-xs font-normal text-muted">
                      {t('setup.budget.rateDate', {
                        date: formatDay(rates.date, language, { day: 'numeric', month: 'short' }),
                      })}
                    </span>
                  )}
                </>
              ) : ratesFailed ? (
                <span className="font-normal text-muted">{t('setup.budget.rateOffline')}</span>
              ) : (
                <span className="font-normal text-muted">{t('common.loading')}</span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
