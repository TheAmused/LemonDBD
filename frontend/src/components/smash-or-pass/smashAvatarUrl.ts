// frontend/src/components/smash-or-pass/smashAvatarUrl.ts
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { candidatePlaceholderPath } from '@/utils/smashOrPass/placeholderArt';
import { isLocalRosterSlug } from '@/utils/smashOrPass/rosterSlug';
import { avatarThumbFromPath, getCommunityCoverThumbUrl } from '@/utils/thumbUrl';

export interface SmashPortraitInput {
  id?: string | number | null;
  slug?: string | null;
  name: string;
  role?: string | null;
  media_url?: string | null;
  roster_id?: string | null;
}

export interface SmashPortraitOptions {
  backendBase: string;
  thumbWidth?: 128 | 256 | 480;
  /** Substitutes a deterministic stand-in cover when a custom roster item has no portrait. */
  useLocalPlaceholder?: boolean;
  /** Extension used in synthetic `avatar_local_path` fallback when `media_url` is absent. */
  fallbackExt?: 'webp' | 'png';
}

/** Resolves full-resolution and snapped thumbnail portrait URLs for Smash-or-Pass entities. */
export function resolveSmashPortraitUrls(
  item: SmashPortraitInput,
  {
    backendBase,
    thumbWidth = 256,
    useLocalPlaceholder = false,
    fallbackExt = 'webp',
  }: SmashPortraitOptions
): { fullSrc: string; thumbSrc: string; hasPortrait: boolean } {
  const isSurvivor = isSurvivorRole(item.role ?? undefined);
  const slug = item.slug || 'unknown';
  const hasPortrait =
    Boolean(item.media_url) || !useLocalPlaceholder || !item.roster_id || !isLocalRosterSlug(item.roster_id);

  let fullSrc: string;
  if (!hasPortrait) {
    fullSrc = `${backendBase}${candidatePlaceholderPath(item.name || item.slug || String(item.id ?? ''))}`;
  } else if (item.media_url?.startsWith('http') || item.media_url?.startsWith('/static')) {
    fullSrc = `${item.media_url.startsWith('http') ? '' : backendBase}${item.media_url}`;
  } else {
    fullSrc = resolveAvatarUrl(
      backendBase,
      {
        name: item.name,
        category: item.role ?? (isSurvivor ? 'Survivor' : 'Killer'),
        avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}.${fallbackExt}`,
      },
      isSurvivor
    );
  }

  const thumbSrc = fullSrc.includes('/static/avatars/')
    ? avatarThumbFromPath(fullSrc, thumbWidth, backendBase) || fullSrc
    : getCommunityCoverThumbUrl(fullSrc, thumbWidth, backendBase) || fullSrc;

  return { fullSrc, thumbSrc, hasPortrait };
}
