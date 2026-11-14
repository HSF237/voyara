import * as z from 'zod/mini';
import { fetchJson } from './http';

/**
 * Destination photos from Wikipedia / Wikimedia Commons. Only freely licensed
 * lead images are returned, and every photo carries its author and licence so
 * it can be credited wherever it is shown.
 */
export type PlacePhoto = {
  url: string;
  width: number;
  height: number;
  /** Author, as plain text (may be empty when Commons has none recorded). */
  credit: string;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  /** The file's page on Wikimedia Commons. */
  sourceUrl: string;
};

const API = 'https://en.wikipedia.org/w/api.php';
const THUMB_WIDTH = 640;

const pageSchema = z.object({
  title: z.string(),
  pageimage: z.optional(z.string()),
  thumbnail: z.optional(z.object({ source: z.string(), width: z.number(), height: z.number() })),
});
const rename = z.optional(z.array(z.object({ from: z.string(), to: z.string() })));
const pagesSchema = z.object({
  query: z.optional(
    z.object({ normalized: rename, redirects: rename, pages: z.optional(z.array(pageSchema)) }),
  ),
});

const infoSchema = z.object({
  query: z.optional(
    z.object({
      normalized: rename,
      pages: z.optional(
        z.array(
          z.object({
            title: z.string(),
            imageinfo: z.optional(
              z.array(
                z.object({
                  descriptionurl: z.optional(z.string()),
                  extmetadata: z.optional(
                    z.object({
                      Artist: z.optional(z.object({ value: z.string() })),
                      LicenseShortName: z.optional(z.object({ value: z.string() })),
                    }),
                  ),
                }),
              ),
            ),
          }),
        ),
      ),
    }),
  ),
});

function apiUrl(params: Record<string, string>): string {
  const url = new URL(API);
  const all = { action: 'query', format: 'json', formatversion: '2', origin: '*', ...params };
  for (const [key, value] of Object.entries(all)) url.searchParams.set(key, value);
  return url.toString();
}

/** Commons stores the author as HTML; keep only the readable text. */
export function plainText(html: string): string {
  const text =
    typeof DOMParser === 'undefined'
      ? html.replace(/<[^>]*>/g, ' ')
      : (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '');
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

type Page = z.infer<typeof pageSchema>;

/** Look up author and licence for each page's lead image, in one request. */
async function withCredits(pages: Page[], signal?: AbortSignal): Promise<Map<string, PlacePhoto>> {
  const usable = pages.filter((page) => page.pageimage && page.thumbnail);
  const photos = new Map<string, PlacePhoto>();
  if (usable.length === 0) return photos;

  const files = usable.map((page) => `File:${page.pageimage}`);
  const info = await fetchJson(
    apiUrl({
      titles: files.join('|'),
      prop: 'imageinfo',
      iiprop: 'extmetadata|url',
      iiextmetadatafilter: 'Artist|LicenseShortName',
    }),
    infoSchema,
    { signal },
  );
  // The API may rewrite file titles (underscores → spaces); follow that mapping.
  const renamed = new Map(info.query?.normalized?.map((item) => [item.from, item.to]));
  const byFile = new Map(info.query?.pages?.map((page) => [page.title, page.imageinfo?.[0]]));

  usable.forEach((page, index) => {
    const file = files[index] ?? '';
    const details = byFile.get(renamed.get(file) ?? file);
    const license = details?.extmetadata?.LicenseShortName?.value;
    // No licence on record means it cannot be credited properly: leave it out.
    if (!page.thumbnail || !details?.descriptionurl || !license) return;
    photos.set(page.title, {
      url: page.thumbnail.source,
      width: page.thumbnail.width,
      height: page.thumbnail.height,
      credit: plainText(details.extmetadata?.Artist?.value ?? ''),
      license,
      sourceUrl: details.descriptionurl,
    });
  });
  return photos;
}

/**
 * Photos for a list of Wikipedia article titles (two requests in total,
 * however many titles). Titles without a free photo are simply absent.
 */
export async function getPhotosByTitle(
  titles: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, PlacePhoto>> {
  if (titles.length === 0) return {};
  const data = await fetchJson(
    apiUrl({
      titles: titles.join('|'),
      redirects: '1',
      prop: 'pageimages',
      piprop: 'thumbnail|name',
      pithumbsize: String(THUMB_WIDTH),
    }),
    pagesSchema,
    { signal },
  );
  const photos = await withCredits(data.query?.pages ?? [], signal);
  const normalized = new Map(data.query?.normalized?.map((item) => [item.from, item.to]));
  const redirects = new Map(data.query?.redirects?.map((item) => [item.from, item.to]));

  const result: Record<string, PlacePhoto> = {};
  for (const title of titles) {
    const step = normalized.get(title) ?? title;
    const photo = photos.get(redirects.get(step) ?? step);
    if (photo) result[title] = photo;
  }
  return result;
}

/** Best photo for a free-text place, e.g. "Kochi India". Null when none is found. */
export async function findPlacePhoto(
  search: string,
  signal?: AbortSignal,
): Promise<PlacePhoto | null> {
  const data = await fetchJson(
    apiUrl({
      generator: 'search',
      gsrsearch: search,
      gsrlimit: '1',
      prop: 'pageimages',
      piprop: 'thumbnail|name',
      pithumbsize: String(THUMB_WIDTH * 2),
    }),
    pagesSchema,
    { signal },
  );
  const pages = data.query?.pages ?? [];
  const photos = await withCredits(pages, signal);
  return photos.get(pages[0]?.title ?? '') ?? null;
}
