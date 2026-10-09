// frontend/src/utils/smashOrPass/localRoster.ts
/**
 * Bridges a locally-stored custom roster (types/smashOrPass.ts's
 * `StoredCustomRoster`) into the same shapes the API returns (`RosterItem`,
 * `EntityItem`), so the picker and the play surface can treat an official
 * and a custom roster identically almost everywhere -- only the data source
 * (API vs. localStorage) and the vote sink (server vs. nowhere) differ.
 *
 * A custom roster's public "slug" is `local:<its storage id>`, which can
 * never collide with a real backend slug (`_unique_roster_slug` on the
 * backend never produces one containing a colon) -- that prefix is how
 * `isLocalRosterSlug` tells the two apart everywhere else in the app.
 */
import type { EntityItem, EntityMetadata, RosterItem, SmashRosterDocumentEntity, StoredCustomRoster } from '@/types/smashOrPass';

const LOCAL_ROSTER_PREFIX = 'local:';

export function isLocalRosterSlug(slug: string | undefined | null): boolean {
  return typeof slug === 'string' && slug.startsWith(LOCAL_ROSTER_PREFIX);
}

export function localRosterIdFromSlug(slug: string): string {
  return slug.slice(LOCAL_ROSTER_PREFIX.length);
}

export function localRosterSlug(id: string): string {
  return `${LOCAL_ROSTER_PREFIX}${id}`;
}

export function customRosterToRosterItem(roster: StoredCustomRoster): RosterItem {
  return {
    id: roster.id,
    slug: localRosterSlug(roster.id),
    name: roster.name || 'Untitled Roster',
    description: roster.description || '',
    cover_image_url: roster.cover_image_url ?? null,
    theme_color: roster.theme_color || '#ff0055',
    category: roster.category || 'Custom',
    is_nsfw: roster.is_nsfw ?? false,
    is_active: true,
    entity_count: roster.entities.length,
    character_count: roster.entities.length,
    total_votes: 0,
    is_local: true,
    roster_mode: roster.roster_mode || 'full',
    custom_roles: roster.custom_roles,
    custom_genders: roster.custom_genders,
    custom_labels: roster.custom_labels,
    romance_archetypes: roster.romance_archetypes,
  };
}

export function customEntityToEntityItem(rosterSlug: string, e: SmashRosterDocumentEntity, index: number): EntityItem {
  const metadata: EntityMetadata = {
    archetype: e.archetype || '',
    bio: e.bio || '',
    tagline: e.tagline || '',
    quote: e.quote || '',
    meme: e.meme || '',
    turn_on: e.turn_on || '',
    dealbreaker: e.dealbreaker || '',
    dating_vibe: e.dating_vibe || '',
    red_flags: e.red_flags || [],
    green_flags: e.green_flags || [],
    chapter: e.chapter,
    danger_level: e.danger_level,
    chaos_score: e.chaos_score,
    compatibility_tags: [e.archetype, e.role, e.gender].filter((v): v is string => Boolean(v)),
  };
  return {
    id: `${rosterSlug}:${e.id}`,
    roster_id: rosterSlug,
    slug: e.id,
    name: e.name,
    real_name: e.real_name,
    role: e.role,
    gender: e.gender,
    media_url: e.media_url,
    watermark_left: e.watermark_left,
    watermark_right: e.watermark_right,
    metadata,
    order_index: index,
    stat: null,
  };
}
