import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fetchJson, ServiceError } from '@/services/http';

const schema = z.object({ ok: z.boolean() });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('fetchJson', () => {
  it('returns validated data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: true })));
    await expect(fetchJson('https://x.test', schema)).resolves.toEqual({ ok: true });
  });

  it('rejects a response that does not match the schema, without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: 'yes' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://x.test', schema, { retries: 2 })).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries server errors and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://x.test', schema, { retries: 1 })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 404));
    vi.stubGlobal('fetch', fetchMock);
    const error = await fetchJson('https://x.test', schema, { retries: 3 }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ServiceError);
    expect(error).toMatchObject({ kind: 'http', status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up on a request that hangs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );
    await expect(
      fetchJson('https://x.test', schema, { timeoutMs: 20, retries: 0 }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('reports "network" when the device is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchJson('https://x.test', schema, { retries: 0 })).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
