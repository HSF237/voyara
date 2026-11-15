/**
 * A 500px-wide version of a Wikimedia image. Wikimedia serves thumbnails only
 * at a fixed set of widths (500 is one); the source sometimes gives another
 * width, or the full-size original.
 */
export function thumb(source: string): string | undefined {
  const match =
    /^https:\/\/upload\.wikimedia\.org\/wikipedia\/(\w+)\/(?:thumb\/)?(\w\/\w\w)\/([^/]+)/.exec(
      source,
    );
  if (!match) return undefined;
  const [, project, hash, file] = match;
  if (!/\.(jpe?g|png|webp)$/i.test(file ?? '')) return undefined; // SVG maps and TIFF scans make poor cards
  return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${hash}/${file}/500px-${file}`;
}
