import { Check, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/app/usePageTitle';
import { useSession } from '@/app/useSession';
import { UserAvatar } from '@/components/UserAvatar';
import { Button, Card, Segmented, Select, toast, type SegmentedOption } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LANGUAGES } from '@/lib/i18n/languages';
import { CURRENCIES, currencyName, isCurrencyCode, type UnitSystem } from '@/lib/locale';
import { useSettings, type ThemePreference } from '@/store/settings';

export function SettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.title'));
  const { user, signOut } = useSession();

  const { theme, language, currency, units, setTheme, setLanguage, setCurrency, setUnits, reset } =
    useSettings();

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: 'light', label: t('settings.theme.light'), icon: <Sun aria-hidden="true" /> },
    { value: 'dark', label: t('settings.theme.dark'), icon: <Moon aria-hidden="true" /> },
    { value: 'system', label: t('settings.theme.system'), icon: <Monitor aria-hidden="true" /> },
  ];

  const unitOptions: SegmentedOption<UnitSystem>[] = [
    { value: 'metric', label: t('settings.units.metric') },
    { value: 'imperial', label: t('settings.units.imperial') },
  ];

  const currencyOptions = useMemo(
    () =>
      CURRENCIES.map((code) => ({
        value: code,
        label: `${code} — ${currencyName(code, language)}`,
      })),
    [language],
  );

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        {t('settings.title')}
      </h1>
      <p className="mt-2 text-muted">{t('settings.subtitle')}</p>

      <div className="mt-8 space-y-4">
        {user && (
          <Card className="flex flex-wrap items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-medium text-ink">{user.name}</p>
              <p className="truncate text-sm text-muted">
                {user.provider === 'google'
                  ? (user.email ?? t('settings.signedInAs'))
                  : t('settings.guestAccount')}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={signOut}
              iconStart={<LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />}
            >
              {t('nav.signOut')}
            </Button>
          </Card>
        )}
        <Card>
          <fieldset>
            <legend className="text-sm font-medium text-ink">{t('settings.language.label')}</legend>
            <p className="mt-1 text-sm text-muted">{t('settings.language.hint')}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {LANGUAGES.map((item) => {
                const checked = item.code === language;
                return (
                  <label key={item.code} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value={item.code}
                      checked={checked}
                      onChange={() => setLanguage(item.code)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'flex h-full items-center justify-between gap-2 rounded-md border px-3.5 py-3 transition-colors',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                        checked
                          ? 'border-primary bg-primary-soft'
                          : 'border-line-strong bg-surface hover:bg-surface-2',
                      )}
                    >
                      <span className="min-w-0">
                        <span
                          lang={item.code}
                          dir={item.dir}
                          className="block truncate text-sm font-semibold text-ink"
                        >
                          {item.nativeName}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {item.englishName}
                        </span>
                      </span>
                      {checked && (
                        <Check
                          className="size-4 shrink-0 text-primary-ink"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <Card>
          <Segmented
            label={t('settings.theme.label')}
            value={theme}
            onValueChange={setTheme}
            options={themeOptions}
          />
        </Card>

        <Card>
          <Select
            label={t('settings.currency.label')}
            hint={t('settings.currency.hint')}
            value={currency}
            options={currencyOptions}
            onValueChange={(value) => {
              if (isCurrencyCode(value)) setCurrency(value);
            }}
            className="max-w-sm"
          />
        </Card>

        <Card>
          <Segmented
            label={t('settings.units.label')}
            value={units}
            onValueChange={setUnits}
            options={unitOptions}
          />
        </Card>
      </div>

      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={() => {
            // Confirm in the language the person is reading right now, then reset.
            toast({ title: t('settings.resetDone'), tone: 'success' });
            reset();
          }}
        >
          {t('settings.reset')}
        </Button>
      </div>
    </div>
  );
}
