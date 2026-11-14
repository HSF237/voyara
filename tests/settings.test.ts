import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme, startSettingsSync } from '@/app/sync';
import { detectLanguage } from '@/lib/i18n/languages';
import { detectCurrency, detectUnits } from '@/lib/locale';
import { useSettings } from '@/store/settings';
import { media } from './setup';

describe('first-visit defaults', () => {
  it('picks the first supported language from the browser list', () => {
    expect(detectLanguage(['ml-IN', 'en-US'])).toBe('ml');
    expect(detectLanguage(['fr-FR', 'ar'])).toBe('ar');
    expect(detectLanguage(['fr-FR', 'de'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('guesses home currency from the region', () => {
    expect(detectCurrency('en-IN')).toBe('INR');
    expect(detectCurrency('ml')).toBe('INR');
    expect(detectCurrency('ms-MY')).toBe('MYR');
    expect(detectCurrency('de-DE')).toBe('EUR');
    expect(detectCurrency('xx-invalid-tag-!')).toBe('USD');
    expect(detectCurrency(undefined)).toBe('USD');
  });

  it('uses imperial units only where they are the norm', () => {
    expect(detectUnits('en-US')).toBe('imperial');
    expect(detectUnits('en-IN')).toBe('metric');
    expect(detectUnits('ms-MY')).toBe('metric');
  });
});

describe('theme', () => {
  it('resolves "system" from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('toggles the dark class on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveClass('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
    media.systemPrefersDark = true;
    applyTheme('system');
    expect(document.documentElement).toHaveClass('dark');
  });
});

describe('settings sync', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
    useSettings.setState({ theme: 'system', language: 'en', currency: 'USD', units: 'metric' });
  });

  it('keeps <html> lang, dir and theme in step with the store', () => {
    stop = startSettingsSync();

    useSettings.getState().setLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    useSettings.getState().setLanguage('ml');
    expect(document.documentElement.lang).toBe('ml');
    expect(document.documentElement.dir).toBe('ltr');

    useSettings.getState().setTheme('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('persists choices to localStorage', () => {
    useSettings.getState().setCurrency('MYR');
    const saved = JSON.parse(localStorage.getItem('voyara.settings') ?? '{}') as {
      state?: { currency?: string };
    };
    expect(saved.state?.currency).toBe('MYR');
  });
});
