/** Anything with a zod-style safeParse. Keeps this file independent of the validation library. */
export type Schema<T> = {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false };
};

export type ServiceErrorKind = 'network' | 'timeout' | 'http' | 'invalid' | 'aborted';

/** One error type for every data source, so screens can show the right message. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly kind: ServiceErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export type FetchJsonOptions = {
  /** Give up on a single attempt after this long. */
  timeoutMs?: number;
  /** Extra attempts after the first, for timeouts, network drops and 5xx/429. */
  retries?: number;
  /** Cancels the request (TanStack Query passes one for every query). */
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(url: string, options: FetchJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 8000);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: options.headers });
    if (!response.ok) {
      throw new ServiceError(`Request failed with ${response.status}`, 'http', response.status);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (options.signal?.aborted) throw new ServiceError('Request cancelled', 'aborted');
    if (timedOut) throw new ServiceError('Request timed out', 'timeout');
    throw new ServiceError('Network unavailable', 'network');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

const retryable = (error: ServiceError) =>
  error.kind === 'network' ||
  error.kind === 'timeout' ||
  (error.kind === 'http' && (error.status === 429 || (error.status ?? 0) >= 500));

/**
 * GET a JSON document and validate it. Nothing from the network reaches the
 * app without passing a schema, so a changed or broken API fails loudly here
 * instead of as `undefined` somewhere in a component.
 */
export async function fetchJson<T>(
  url: string,
  schema: Schema<T>,
  options: FetchJsonOptions = {},
): Promise<T> {
  const retries = options.retries ?? 1;
  let lastError: ServiceError | undefined;

  for (let tryNumber = 0; tryNumber <= retries; tryNumber += 1) {
    if (tryNumber > 0) await wait(350 * tryNumber);
    try {
      const data = await attempt(url, options);
      const parsed = schema.safeParse(data);
      if (!parsed.success) throw new ServiceError('Unexpected response shape', 'invalid');
      return parsed.data;
    } catch (error) {
      lastError =
        error instanceof ServiceError ? error : new ServiceError(String(error), 'network');
      if (!retryable(lastError)) break;
    }
  }
  throw lastError ?? new ServiceError('Request failed', 'network');
}
