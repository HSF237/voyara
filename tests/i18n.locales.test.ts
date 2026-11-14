import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '@/lib/i18n/languages';

const modules = import.meta.glob<{ default: unknown }>('../src/lib/i18n/locales/*.json', {
  eager: true,
});

const locales = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [
    path.split('/').pop()!.replace('.json', ''),
    module.default,
  ]),
);

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (value === null || typeof value !== 'object') return { [prefix]: String(value) };
  return Object.entries(value).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

const placeholders = (text: string) => (text.match(/{{\s*[\w.]+\s*}}/g) ?? []).sort();

const english = flatten(locales.en);

describe('translations', () => {
  it('has a file for every supported language', () => {
    expect(Object.keys(locales).sort()).toEqual([...LANGUAGE_CODES].sort());
  });

  describe.each(LANGUAGE_CODES.filter((code) => code !== 'en'))('%s', (code) => {
    const translated = flatten(locales[code]);

    it('has exactly the same keys as English', () => {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    });

    it('has no empty strings', () => {
      const empty = Object.entries(translated).filter(([, text]) => text.trim() === '');
      expect(empty).toEqual([]);
    });

    it('keeps the same {{placeholders}} as English', () => {
      for (const [key, text] of Object.entries(english)) {
        expect(placeholders(translated[key] ?? ''), key).toEqual(placeholders(text));
      }
    });
  });
});
