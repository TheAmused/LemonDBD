// frontend/src/lib/slug.ts
/**
 * A stable, pattern-safe slug from arbitrary text
 * (`"Leon S. Kennedy"` -> `leon-s-kennedy`). Accents are stripped, anything
 * that is not a-z / 0-9 collapses to a single `-`, the result is capped at 48
 * characters, and `fallback` is returned when nothing usable is left.
 */
export function slugify(text: string, fallback: string = ''): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || fallback
  );
}

export const canonicalSlug = slugify;

export function slugifyItemId(text: string): string {
  return slugify(text, 'item');
}

export function slugifyEntityId(text: string): string {
  return slugify(text, 'entity');
}

/** name -> filesystem-safe slug, matching the backend's avatar filename convention. */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const sanitizeAvatarName = sanitizeName;

export function getAvatarSubdir(role: string): 'killers' | 'survivors' {
  return role.toLowerCase() === 'survivor' ? 'survivors' : 'killers';
}

export function getCharacterSlug(name: string): string {
  return slugify(name);
}
