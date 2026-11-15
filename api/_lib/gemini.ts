import type * as z from 'zod';
import { fetchWithTimeout } from './http.js';

// Tried in order: the first that answers wins. The light models answer in a few seconds and
// handle these tasks well; a model that is overloaded is skipped for the next one.
// GEMINI_MODEL (one name, or several separated by commas) is tried before these.
const MODELS = () => [
  ...(process.env.GEMINI_MODEL ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
];
const TIME_LIMITS_MS = [14_000, 12_000, 16_000, 12_000];

/**
 * Asks Gemini for JSON in a given shape and checks the answer against a Zod
 * schema. Returns null when no model gives a usable answer — callers must have
 * something to fall back on.
 */
export async function askGemini<T extends z.ZodType>(
  text: string,
  key: string,
  responseSchema: unknown,
  shape: T,
  label: string,
): Promise<{ model: string; data: z.infer<T> } | null> {
  for (const [attempt, model] of MODELS().slice(0, 4).entries()) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: 'application/json',
              responseSchema,
            },
          }),
        },
        TIME_LIMITS_MS[attempt] ?? 12_000,
      );
      if (!response.ok) {
        console.warn(`[api/${label}] ${model} answered ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw =
        payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      const parsed = shape.safeParse(JSON.parse(raw));
      if (parsed.success) return { model, data: parsed.data as z.infer<T> };
      console.warn(`[api/${label}] ${model} sent an unexpected shape`);
    } catch (error) {
      console.warn(
        `[api/${label}] ${model} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return null;
}
