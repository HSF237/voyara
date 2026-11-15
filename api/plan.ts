import * as z from 'zod';
import { scorePlace } from '../src/planner/categories.js';
import { buildPlan, PACE_RULES, planFromOutline, type PlanInput } from '../src/planner/optimise.js';
import { CATEGORIES, type DayOutline, type PlaceCandidate } from '../src/planner/types.js';
import { fetchWithTimeout, json, problem, tooMany } from './_lib/http.js';

/**
 * POST /api/plan
 * Builds a day-by-day plan from places the traveller picked.
 *
 * The AI decides only three things: which day each place goes on, the order,
 * and a few words (a theme per day, a tip per stop, a short summary). It can
 * refer to places only by the ids we send; anything else is thrown away. All
 * times and travel estimates are computed in code. If the AI is unavailable or
 * its answer does not hold up, the built-in planner answers instead — the
 * response always contains a usable plan.
 */

const place = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.enum(CATEGORIES),
  rating: z.number().min(0).max(3),
  durationMin: z.number().int().min(10).max(480),
});

const body = z.object({
  destination: z.object({ name: z.string().min(1).max(120), country: z.string().max(120) }),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(14),
  pace: z.enum(['relaxed', 'balanced', 'packed']),
  interests: z.array(z.string().max(30)).max(12),
  travellers: z.number().int().min(1).max(20),
  language: z.enum(['en', 'ms', 'ml', 'hi', 'ar', 'ta']),
  places: z.array(place).min(1).max(60),
  mustIds: z.array(z.string().max(80)).max(60),
}); // prettier-ignore

const outline = z.object({
  summary: z.string().optional(),
  days: z.array(
    z.object({
      theme: z.string().optional(),
      stops: z.array(z.object({ id: z.string(), tip: z.string().optional() })),
    }),
  ),
});

const LANGUAGE_NAMES = {
  en: 'English',
  ms: 'Malay',
  ml: 'Malayalam',
  hi: 'Hindi',
  ar: 'Arabic',
  ta: 'Tamil',
};

// Tried in order: the first that answers wins. The light models answer in a few seconds and
// handle this task well; a model that is overloaded is skipped for the next one. GEMINI_MODEL (one name, or several separated by commas) is tried before these.
const MODELS = [
  ...(process.env.GEMINI_MODEL ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
];
const TIME_LIMITS_MS = [14_000, 12_000, 16_000, 12_000];

function prompt(input: z.infer<typeof body>): string {
  const perDay = PACE_RULES[input.pace].stopsPerDay;
  const must = new Set(input.mustIds);
  const rows = input.places
    .map((p) => `${p.id} | ${p.name} | ${p.category} | ${p.lat.toFixed(4)},${p.lng.toFixed(4)} | ${p.durationMin} min${must.has(p.id) ? ' | MUST' : ''}`)
    .join('\n');
  return [
    `You are the planning engine of a travel app. Plan ${input.dates.length} day(s) in ${input.destination.name}, ${input.destination.country} for ${input.travellers} traveller(s).`,
    `Pace: ${input.pace} (at most ${perDay} places per day). Interests: ${input.interests.join(', ') || 'a bit of everything'}.`,
    '',
    'PLACES (id | name | category | lat,lng | typical visit):',
    rows,
    '',
    'RULES',
    '- Use ONLY ids from the list, copied exactly. Never invent a place. Use each id at most once.',
    '- Every place marked MUST has to be in the plan.',
    `- Return exactly ${input.dates.length} day(s), in order. At most ${perDay} places per day; leave out the weakest places if there are too many.`,
    '- Put places that are close together on the same day, and order each day to keep travel short.',
    '- Nightlife goes at the end of a day. Do not put two long outdoor places back to back around midday if it can be avoided.',
    `- Write "theme" (2 to 5 words per day), "tip" (one practical sentence per stop, at most 18 words: best time, what not to miss, what to wear or bring) and "summary" (1 or 2 sentences on the shape of the trip) in ${LANGUAGE_NAMES[input.language]}.`,
    '- Do not state opening hours, prices or times: the app adds those from live data.',
  ].join('\n');
} // prettier-ignore

const responseSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          theme: { type: 'STRING' },
          stops: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { id: { type: 'STRING' }, tip: { type: 'STRING' } },
              required: ['id', 'tip'],
            },
          },
        },
        required: ['theme', 'stops'],
      },
    },
  },
  required: ['summary', 'days'],
};

async function askGemini(text: string, key: string): Promise<{ model: string; data: z.infer<typeof outline> } | null> {
  for (const [attempt, model] of MODELS.slice(0, 4).entries()) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema },
          }),
        },
        TIME_LIMITS_MS[attempt] ?? 12_000,
      );
      if (!response.ok) {
        console.warn(`[api/plan] ${model} answered ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      const parsed = outline.safeParse(JSON.parse(raw));
      if (parsed.success) return { model, data: parsed.data };
      console.warn(`[api/plan] ${model} sent an unexpected shape`);
    } catch (error) {
      console.warn(`[api/plan] ${model} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
} // prettier-ignore

export async function POST(request: Request): Promise<Response> {
  if (tooMany(request, 'plan', 12, 60_000)) return problem(429, 'slow_down', 'Too many requests.');

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 60_000) return problem(413, 'too_large', 'Too many places.');
    raw = JSON.parse(text);
  } catch {
    return problem(400, 'bad_request', 'The request is not valid JSON.');
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return problem(400, 'bad_request', 'The trip details are incomplete.');
  const input = parsed.data;

  const planInput: PlanInput = {
    places: input.places as PlaceCandidate[],
    mustIds: input.mustIds,
    dates: input.dates,
    pace: input.pace,
    score: (item) => scorePlace(item, input.interests),
  };

  const key = process.env.GEMINI_API_KEY;
  if (key && (process.env.AI_PROVIDER ?? 'gemini') === 'gemini') {
    const answer = await askGemini(prompt(input), key);
    if (answer) {
      const plan = planFromOutline(answer.data.days as DayOutline[], planInput, {
        model: answer.model,
        summary: answer.data.summary,
      });
      if (plan) return json({ plan });
      console.warn('[api/plan] the AI outline did not hold up; using the built-in planner');
    }
  }
  return json({ plan: buildPlan(planInput) });
}
