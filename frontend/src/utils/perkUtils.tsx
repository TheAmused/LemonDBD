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

export function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

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
    rawPath = `avatars/${subDir}/${sanitized}.png`;
  }

  if (!rawPath) return null;
  return `${backendBase}/static/${sanitizePath(rawPath)}`;
}

export function formatPerkSlug(name: string): string {
  return name.toLowerCase().replace(/[\s\-/]+/g, '_');
}
