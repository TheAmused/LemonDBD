// frontend/src/utils/slug.ts
/**
 * A stable, pattern-safe slug from arbitrary text
 * (`"Leon S. Kennedy"` -> `leon-s-kennedy`). Accents are stripped, anything
 * that is not a-z / 0-9 collapses to a single `-`, the result is capped at 48
 * characters, and `fallback` is returned when nothing usable is left.
 */
export function slugify(text: string, fallback: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || fallback
  );
}
