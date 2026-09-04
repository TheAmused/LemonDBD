import { getBackendBaseUrl, apiUrl, staticUrl, backendBase } from './api';

export { getBackendBaseUrl, apiUrl, staticUrl, backendBase };

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
 * `${backendBase}/static/avatars/{killers|survivors}/{sanitized-name}.webp`.
 * Backend writes character avatars as WebP (see backend/app/services/image_conversion.py). */
export function avatarUrlForCharacter(name: string, subDir: 'killers' | 'survivors' = 'killers'): string | undefined {
  if (!name) return undefined;
  const base = getBackendBaseUrl();
  const path = `/static/avatars/${subDir}/${sanitizeName(name)}.webp`;
  return base ? `${base}${path}` : path;
}

/** Resolves a perk's icon: prefer the scraped local path, fall back to its
 * original remote icon_url if no local copy was ever saved for it. */
export function perkIconUrl(perk: { icon_local_path?: string | null; icon_url?: string | null }): string | undefined {
  return staticUrl(perk.icon_local_path) || perk.icon_url || undefined;
}
