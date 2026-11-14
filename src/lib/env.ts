import * as z from 'zod/mini';

/**
 * Public (browser) environment. Everything here ships in the bundle, so only
 * values that are public by design belong in it. Secrets live in Vercel and
 * are read by the functions in /api.
 */
const text = z.optional(z.string());

const clientEnvSchema = z.object({
  VITE_FIREBASE_API_KEY: text,
  VITE_FIREBASE_AUTH_DOMAIN: text,
  VITE_FIREBASE_PROJECT_ID: text,
  VITE_FIREBASE_STORAGE_BUCKET: text,
  VITE_FIREBASE_MESSAGING_SENDER_ID: text,
  VITE_FIREBASE_APP_ID: text,
  VITE_MAPTILER_KEY: text,
  VITE_APP_URL: z.optional(z.url()),
});

/** `.env` files give "" for a variable that is present but empty: treat that as missing. */
function withoutBlanks(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).filter(
      ([, value]) => !(typeof value === 'string' && value.trim() === ''),
    ),
  );
}

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export type AppEnv = {
  raw: ClientEnv;
  appUrl: string;
  /** Which optional integrations have enough config to switch on. */
  features: { firebase: boolean; maps: boolean };
};

export function parseClientEnv(source: Record<string, unknown>, fallbackUrl: string): AppEnv {
  const result = clientEnvSchema.safeParse(withoutBlanks(source));
  if (!result.success) {
    console.error('Invalid environment variables', z.flattenError(result.error).fieldErrors);
  }
  const raw: ClientEnv = result.success ? result.data : {};

  return {
    raw,
    appUrl: (raw.VITE_APP_URL ?? fallbackUrl).replace(/\/$/, ''),
    features: {
      firebase: Boolean(
        raw.VITE_FIREBASE_API_KEY && raw.VITE_FIREBASE_PROJECT_ID && raw.VITE_FIREBASE_APP_ID,
      ),
      maps: Boolean(raw.VITE_MAPTILER_KEY),
    },
  };
}

export const env: AppEnv = parseClientEnv(
  import.meta.env,
  typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin,
);
