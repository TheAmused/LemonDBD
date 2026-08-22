// frontend/src/utils/staticUrl.ts
export const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Same URL shape used across the app: strip a leading `/` or `static/`, then prefix. */
export function staticUrl(rawPath?: string | null): string | undefined {
  if (!rawPath) return undefined;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
  const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
  return `${backendBase}/static/${cleanPath}`;
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

/** Builds a character avatar URL straight from its name, no lookup needed:
 * `${backendBase}/static/avatars/{killers|survivors}/{sanitized-name}.png`. */
export function avatarUrlForCharacter(name: string, subDir: 'killers' | 'survivors' = 'killers'): string | undefined {
  if (!name) return undefined;
  return `${backendBase}/static/avatars/${subDir}/${sanitizeName(name)}.png`;
}

/** Resolves a perk's icon: prefer the scraped local path, fall back to its
 * original remote icon_url if no local copy was ever saved for it. */
export function perkIconUrl(perk: { icon_local_path?: string | null; icon_url?: string | null }): string | undefined {
  return staticUrl(perk.icon_local_path) || perk.icon_url || undefined;
}
