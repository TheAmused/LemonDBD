// frontend/src/utils/entityProfile.ts

import type { EntityLocale, EntityMetadata, EntityProfile } from '@/types/smashOrPass';

/**
 * Resolves an entity's dating profile for a locale.
 *
 * The backend stores English on the top-level metadata fields and puts a field into
 * `translations[locale]` ONLY when it actually differs from English. So a missing
 * translated field means "same as English" — which is the one and only fallback that
 * should exist anywhere in the smash-or-pass UI.
 *
 * This replaces the old per-field chains
 * (`locMeta.green_flags || meta.green_flags || meta.greenFlags || []`), which existed
 * because the payload shipped the same content under up to six spellings: camelCase
 * twins, a duplicate `i18n` blob, a `metadata_json` copy, and a `title`/`archetype` pair.
 * All of those are gone from the wire, so the chains are gone too.
 *
 * `meta` accepts undefined so callers can pass `character.metadata` directly; the result
 * is always fully populated, so call sites can read `profile.green_flags.length` unguarded.
 */
export function localizedProfile(meta: EntityMetadata | undefined, locale: string): EntityProfile {
  const base: EntityProfile = {
    archetype: meta?.archetype || '',
    bio: meta?.bio || '',
    tagline: meta?.tagline || '',
    quote: meta?.quote || '',
    meme: meta?.meme || '',
    turn_on: meta?.turn_on || '',
    dealbreaker: meta?.dealbreaker || '',
    dating_vibe: meta?.dating_vibe || '',
    red_flags: meta?.red_flags || [],
    green_flags: meta?.green_flags || [],
  };

  // 'en' never has an entry — English IS the top-level field.
  const overlay = meta?.translations?.[locale as EntityLocale];
  if (!overlay) return base;

  return {
    archetype: overlay.archetype ?? base.archetype,
    bio: overlay.bio ?? base.bio,
    tagline: overlay.tagline ?? base.tagline,
    quote: overlay.quote ?? base.quote,
    meme: overlay.meme ?? base.meme,
    turn_on: overlay.turn_on ?? base.turn_on,
    dealbreaker: overlay.dealbreaker ?? base.dealbreaker,
    dating_vibe: overlay.dating_vibe ?? base.dating_vibe,
    red_flags: overlay.red_flags ?? base.red_flags,
    green_flags: overlay.green_flags ?? base.green_flags,
  };
}
