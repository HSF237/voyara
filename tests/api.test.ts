import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Shapes recorded from the live OpenTripMap API on 15 Nov 2026 (values shortened).
const radius = [
  { xid: 'W1', name: 'National Museum', rate: 3, kinds: 'national_museums,cultural,museums,interesting_places', wikidata: 'Q917630', point: { lon: 101.6874, lat: 3.1377 } },
  { xid: 'W2', name: 'Kelana Jaya Line', rate: 3, kinds: 'bridges,architecture,interesting_places,viaducts', point: { lon: 101.69, lat: 3.14 } },
  { xid: 'W3', name: 'Thean Hou Temple', rate: 7, kinds: 'religion,buddhist_temples,interesting_places', point: { lon: 101.6877, lat: 3.1219 } },
  { xid: 'W4', name: '', rate: 3, kinds: 'cultural', point: { lon: 101.7, lat: 3.15 } },
]; // prettier-ignore
const detail = {
  wikipedia: 'https://en.wikipedia.org/wiki/National%20Museum%20%28Malaysia%29',
  image: 'https://commons.wikimedia.org/wiki/File:National_museum%2C_KL.JPG',
  preview: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/National_museum%2C_KL.JPG/400px-National_museum%2C_KL.JPG', height: 300, width: 400 },
  wikipedia_extracts: { text: 'The National Museum is a museum located on Jalan Damansara in Kuala Lumpur, Malaysia.' },
  address: { suburb: 'Bukit Persekutuan', country: 'Malaysia' },
}; // prettier-ignore

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.resetModules(); // each test gets functions with empty caches and counters
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('OPENTRIPMAP_API_KEY', 'test-places-key');
  vi.stubEnv('GEMINI_API_KEY', 'test-ai-key');
  vi.stubEnv('GEMINI_MODEL', '');
  vi.stubEnv('AI_PROVIDER', 'gemini');
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GET /api/places', () => {
  const call = async (query: string) =>
    (await import('../api/places')).GET(new Request(`http://x/api/places${query}`));

  it('returns real places with photos Wikimedia will serve, and skips non-places', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        url.includes('/radius')
          ? reply(radius)
          : url.includes('/xid/W1')
            ? reply(detail)
            : reply({}),
      ),
    );
    const response = await call('?lat=3.139&lng=101.6869');
    expect(response.status).toBe(200);
    const { places } = (await response.json()) as { places: Record<string, unknown>[] };
    expect(places.map((item) => item.name)).toEqual(['National Museum', 'Thean Hou Temple']);
    expect(places[0]).toMatchObject({
      id: 'otm:W1',
      category: 'culture',
      rating: 3,
      durationMin: 90,
      address: 'Bukit Persekutuan',
      image: expect.stringContaining('/500px-National_museum') as string,
      imageSource: detail.image,
    });
    expect(places[1]).toMatchObject({ category: 'religious', rating: 3 });
    // The key is sent to the source, never back to the caller.
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('apikey=test-places-key');
    expect(JSON.stringify(places)).not.toContain('test-places-key');
  });

  it('rejects a request without coordinates', async () => {
    expect((await call('?lat=abc')).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says so when it is not configured, or the source is down', async () => {
    vi.stubEnv('OPENTRIPMAP_API_KEY', '');
    expect((await call('?lat=1&lng=1')).status).toBe(503);
    vi.stubEnv('OPENTRIPMAP_API_KEY', 'k');
    fetchMock.mockResolvedValue(reply({}, 500));
    expect((await call('?lat=2&lng=2')).status).toBe(502);
  });
});

describe('place photos', () => {
  it('asks Wikimedia for a 500px thumbnail whatever the source gave', async () => {
    const { thumb } = await import('../api/_lib/images');
    const base = 'https://upload.wikimedia.org/wikipedia/commons';
    expect(thumb(`${base}/thumb/c/c4/Museum.JPG/400px-Museum.JPG`)).toBe(
      `${base}/thumb/c/c4/Museum.JPG/500px-Museum.JPG`,
    );
    expect(thumb(`${base}/a/ac/Masjid_Negara.jpg`)).toBe(
      `${base}/thumb/a/ac/Masjid_Negara.jpg/500px-Masjid_Negara.jpg`,
    );
    expect(thumb(`${base}/a/ac/Map.svg`)).toBeUndefined();
    expect(thumb('https://example.com/photo.jpg')).toBeUndefined();
  });
});

describe('POST /api/plan', () => {
  const places = ['a', 'b', 'c', 'd'].map((id, index) => ({
    id,
    name: `Place ${id}`,
    lat: 3.1 + index * 0.002,
    lng: 101.6 + index * 0.002,
    category: 'culture',
    rating: 3,
    durationMin: 60,
  }));
  const body = {
    destination: { name: 'Kuala Lumpur', country: 'Malaysia' },
    dates: ['2026-11-21', '2026-11-22'],
    pace: 'balanced',
    interests: ['history'],
    travellers: 2,
    language: 'en',
    places,
    mustIds: ['d'],
  };
  const call = async (payload: unknown) =>
    (await import('../api/plan')).POST(
      new Request('http://x/api/plan', {
        method: 'POST',
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
      }),
    );
  const gemini = (outline: unknown) =>
    reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(outline) }] } }] });
  type PlanReply = {
    plan: {
      source: string;
      model?: string;
      summary?: string;
      days: { theme?: string; stops: { placeId: string; tip?: string }[] }[];
    };
  };

  it('uses the AI outline but only for places it was given', async () => {
    fetchMock.mockResolvedValue(
      gemini({
        summary: 'A short city break.',
        days: [
          {
            theme: 'Museums',
            stops: [
              { id: 'a', tip: 'Start here.' },
              { id: 'INVENTED', tip: 'x' },
              { id: 'b', tip: 'Then this.' },
            ],
          },
          { theme: 'Old town', stops: [{ id: 'c', tip: 'Last one.' }] },
        ],
      }),
    );
    const response = await call(body);
    expect(response.status).toBe(200);
    const { plan } = (await response.json()) as PlanReply;
    expect(plan.source).toBe('ai');
    expect(plan.summary).toBe('A short city break.');
    const ids = plan.days.flatMap((day) => day.stops.map((stop) => stop.placeId));
    expect(ids).not.toContain('INVENTED');
    expect(ids).toContain('d'); // the must-do the AI forgot
    expect(plan.days[0]?.theme).toBe('Museums');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).not.toContain('test-ai-key');
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-ai-key');
    expect(String(init?.body)).toContain('Never invent a place');
  });

  it('falls back to the built-in planner when every model fails', async () => {
    fetchMock.mockResolvedValue(reply({ error: { code: 503 } }, 503));
    const { plan } = (await (await call(body)).json()) as PlanReply;
    expect(plan.source).toBe('rules');
    expect(plan.days.flatMap((day) => day.stops)).toHaveLength(4);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1); // it tried the spare models
  });

  it('falls back when the AI answer is unusable, or there is no key', async () => {
    fetchMock.mockResolvedValue(
      gemini({ summary: '', days: [{ theme: 'x', stops: [{ id: 'nope', tip: '' }] }] }),
    );
    expect(((await (await call(body)).json()) as PlanReply).plan.source).toBe('rules');
    vi.stubEnv('GEMINI_API_KEY', '');
    fetchMock.mockClear();
    expect(((await (await call(body)).json()) as PlanReply).plan.source).toBe('rules');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed requests', async () => {
    expect((await call('{not json')).status).toBe(400);
    expect((await call({ ...body, places: [] })).status).toBe(400);
    expect((await call({ ...body, places: [{ ...places[0], category: 'made-up' }] })).status).toBe(
      400,
    );
  });
});

describe('POST /api/edit', () => {
  const stop = (id: string, must = false) => ({
    id,
    name: `Place ${id}`,
    category: 'culture',
    ...(must ? { must } : {}),
  });
  const body = {
    request: 'Make day 1 lighter',
    destination: { name: 'Kuala Lumpur', country: 'Malaysia' },
    pace: 'balanced',
    language: 'en',
    currentDay: 1,
    days: [
      {
        date: '2026-11-21',
        theme: 'Museums',
        rainChance: 70,
        stops: [stop('a', true), stop('b'), stop('c')],
      },
      { date: '2026-11-22', stops: [stop('d')] },
    ],
    spare: [stop('e')],
  };
  const call = async (payload: unknown) =>
    (await import('../api/edit')).POST(
      new Request('http://x/api/edit', { method: 'POST', body: JSON.stringify(payload) }),
    );
  const gemini = (answer: unknown) =>
    reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] });

  it('returns only well-formed operations on places it was given', async () => {
    fetchMock.mockResolvedValue(
      gemini({
        reply: 'Moved one museum to day 2.',
        ops: [
          { op: 'move', id: 'c', toDay: 2 },
          { op: 'move', id: 'INVENTED', toDay: 2 },
          { op: 'move', id: 'b', toDay: 7 },
          { op: 'add', id: 'e', withDay: 2 }, // a looser answer: still understood
          { op: 'swapDays', dayA: 1, dayB: 2 },
          { op: 'delete_everything' },
        ],
      }),
    );
    const response = await call(body);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reply: 'Moved one museum to day 2.',
      ops: [
        { op: 'move', id: 'c', day: 2 },
        { op: 'add', id: 'e', day: 2 },
        { op: 'swapDays', day: 1, withDay: 2 },
      ],
    });
    const sent = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(sent).toContain('Make day 1 lighter');
    expect(sent).toContain('rain chance 70%');
    expect(sent).toContain('MUST');
  });

  it('answers 503 when the AI is unavailable or not set up, and 400 for bad input', async () => {
    fetchMock.mockResolvedValue(reply({}, 503));
    expect((await call(body)).status).toBe(503);
    vi.stubEnv('GEMINI_API_KEY', '');
    expect((await call(body)).status).toBe(503);
    expect((await call({ ...body, request: '' })).status).toBe(400);
  });
});
