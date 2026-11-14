import { describe, expect, it } from 'vitest';
import { parseClientEnv } from '@/lib/env';

describe('client environment', () => {
  it('runs with nothing configured', () => {
    const env = parseClientEnv({}, 'http://localhost:5173');
    expect(env.features).toEqual({ firebase: false, maps: false });
    expect(env.appUrl).toBe('http://localhost:5173');
  });

  it('treats blank values from .env as missing', () => {
    const env = parseClientEnv({ VITE_MAPTILER_KEY: '  ', VITE_APP_URL: '' }, 'http://x.test');
    expect(env.features.maps).toBe(false);
    expect(env.appUrl).toBe('http://x.test');
  });

  it('switches features on when their keys are present', () => {
    const env = parseClientEnv(
      {
        VITE_FIREBASE_API_KEY: 'k',
        VITE_FIREBASE_PROJECT_ID: 'p',
        VITE_FIREBASE_APP_ID: 'a',
        VITE_MAPTILER_KEY: 'm',
        VITE_APP_URL: 'https://voyara.example/',
      },
      'http://localhost:5173',
    );
    expect(env.features).toEqual({ firebase: true, maps: true });
    expect(env.appUrl).toBe('https://voyara.example');
  });
});
