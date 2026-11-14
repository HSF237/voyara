import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { initI18n } from '@/lib/i18n';

// jsdom has no matchMedia. Tests can flip `systemPrefersDark` to simulate the OS theme.
export const media = { systemPrefersDark: false };

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    get matches() {
      return query.includes('prefers-color-scheme: dark') ? media.systemPrefersDark : false;
    },
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

beforeAll(async () => {
  await initI18n('en');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  media.systemPrefersDark = false;
  document.documentElement.className = '';
  document.documentElement.removeAttribute('dir');
});
