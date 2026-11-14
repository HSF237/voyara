import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from the project root.
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

/**
 * Reads the real token values out of index.css and checks every text/background
 * pairing the components use against WCAG 2.1 AA. If someone edits a colour and
 * breaks contrast, this fails before it reaches a judge's screen.
 */

function tokensOf(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `block "${selector}" not found in index.css`).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf('}', start));
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[match[1]!] = match[2]!;
  }
  return tokens;
}

function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(value >> 16) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background] pairs used for normal-size text: need 4.5:1. */
const textPairs: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-2'],
  ['on-primary', 'primary'],
  ['on-primary', 'primary-hover'],
  ['primary-ink', 'bg'],
  ['primary-ink', 'surface'],
  ['primary-ink', 'primary-soft'],
  ['on-accent', 'accent'],
  ['accent-ink', 'accent-soft'],
  ['accent-ink', 'surface'],
  ['sky-ink', 'sky-soft'],
  ['sky-ink', 'surface'],
  ['on-danger', 'danger'],
  ['danger-ink', 'danger-soft'],
  ['danger-ink', 'surface'],
];

/** Control borders and the focus ring: need 3:1 against what they sit on. */
const uiPairs: [string, string][] = [
  ['line-strong', 'surface'],
  ['line-strong', 'bg'],
  ['primary', 'bg'],
  ['primary', 'surface'],
];

describe.each([
  ['light', ':root'],
  ['dark', '.dark'],
])('%s theme contrast', (_name, selector) => {
  const tokens = tokensOf(selector);

  it('defines every token the pairs rely on', () => {
    const needed = new Set([...textPairs, ...uiPairs].flat());
    for (const token of needed) expect(tokens[token], `--${token}`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(textPairs)('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(uiPairs)('UI %s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
