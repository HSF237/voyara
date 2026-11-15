/** Small helpers shared by the server functions. Files starting with "_" are not routes. */

export function json(body: unknown, init: { status?: number; cache?: string } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': init.cache ?? 'no-store',
    },
  });
}

export const problem = (status: number, code: string, message: string): Response =>
  json({ error: { code, message } }, { status });

/** fetch with a time limit; throws on timeout or network failure. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Runs tasks a few at a time, keeping results in order. A failed task gives `undefined`. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<(R | undefined)[]> {
  const results = new Array<R | undefined>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await task(items[index]!);
      } catch {
        results[index] = undefined;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * A best-effort limit per caller. Each server instance counts on its own, so
 * this slows down abuse rather than preventing it; the AI provider's own quota
 * is the hard stop.
 */
const hits = new Map<string, number[]>();
export function tooMany(request: Request, name: string, max: number, windowMs: number): boolean {
  const who = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const key = `${name}:${who}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}
