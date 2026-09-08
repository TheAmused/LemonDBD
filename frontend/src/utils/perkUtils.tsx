// frontend/src/utils/perkUtils.tsx
import { Perk, RoleCategory } from '@/types/perks';

export {
  ACTION_KEYWORDS,
  DBD_KEYWORDS,
  TOKEN_REGEX,
  createDbdTokenRegex,
  createPerkTokenRegex,
  parseLineTokens,
  renderFormattedDbdText,
} from './textFormatter';

import { getBackendBaseUrl, apiUrl } from './api';
export { getBackendBaseUrl, apiUrl } from './api';

export function sanitizePath(rawPath: string): string {
  return rawPath.replace(/^\/?(static\/)?/, '').replace(/%+/g, '');
}

export function sanitizeCharacterNameForAvatar(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getPerkIconUrl(
  perk?: Pick<Perk, 'icon_local_path' | 'icon_url'> | null,
  backendBase: string = getBackendBaseUrl()
): string | null {
  if (!perk) return null;
  const cleanPath = sanitizePath(perk.icon_local_path || '');
  if (cleanPath) {
    return `${backendBase}/static/${cleanPath}`;
  }
  return perk.icon_url || null;
}

export const CHARACTER_AVATAR_NAME_MAP: Record<string, string> = {
  'william_bill_overbeck': 'bill_overbeck',
  'bill_overbeck': 'bill_overbeck',
  'bill': 'bill_overbeck',
  'william_overbeck': 'bill_overbeck',
  'leon_s_kennedy': 'leon_scott_kennedy',
  'leon_s._kennedy': 'leon_scott_kennedy',
  'leon_scott_kennedy': 'leon_scott_kennedy',
  'leon': 'leon_scott_kennedy',
  'aestri_yazar': 'the_troupe',
  'aestri': 'the_troupe',
  'baermar_uraz': 'the_troupe',
  'the_troupe': 'the_troupe',
  'detective_tapp': 'david_tapp',
  'david_tapp': 'david_tapp',
  'ashley_j_williams': 'ash_williams',
  'ashley_j._williams': 'ash_williams',
  'ash_williams': 'ash_williams',
};

export function getCharacterAvatarUrl(
  perk?: Pick<
    Perk,
    'character' | 'character_avatar_path' | 'is_generic_counterpart' | 'category'
  > | null,
  fallbackRole?: RoleCategory,
  backendBase: string = getBackendBaseUrl()
): string | null {
  if (!perk) return null;

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);

  let rawPath = perk.character_avatar_path;

  if (!rawPath && perk.character && !isGeneral) {
    const role = (perk.category as RoleCategory) || fallbackRole || 'Survivor';
    const subDir = role === 'Survivor' ? 'survivors' : 'killers';
    const sanitized = sanitizeCharacterNameForAvatar(perk.character);
    const mapped = CHARACTER_AVATAR_NAME_MAP[sanitized] || sanitized;
    // Backend writes character avatars as WebP (see backend/app/services/image_conversion.py).
    rawPath = `avatars/${subDir}/${mapped}.webp`;
  }

  if (!rawPath) return null;
  return `${backendBase}/static/${sanitizePath(rawPath)}`;
}

export function formatPerkSlug(name: string): string {
  return name.toLowerCase().replace(/[\s\-/]+/g, '_');
}

export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesPerkSearch(
  perk: Perk,
  query: string,
  role?: RoleCategory | string
): boolean {
  if (role) {
    const pRole = (perk.category || '').toLowerCase();
    if (pRole !== role.toLowerCase()) return false;
  }
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return true;

  const name = normalizeSearchText(perk.name || '');
  if (name.includes(cleanQuery)) return true;

  const altName = normalizeSearchText(perk.alternate_name || '');
  if (altName.includes(cleanQuery)) return true;

  const charName = normalizeSearchText(perk.character || '');
  if (charName.includes(cleanQuery)) return true;

  const realName = normalizeSearchText(perk.character_real_name || '');
  if (realName.includes(cleanQuery)) return true;

  const isGeneralPerk =
    !perk.character ||
    perk.character.toLowerCase() === 'general' ||
    Boolean(perk.is_generic_counterpart);

  if (
    isGeneralPerk &&
    ['general', 'ogoln', 'allgemein', 'comun'].some((kw) => cleanQuery.includes(kw))
  ) {
    return true;
  }

  return false;
}
