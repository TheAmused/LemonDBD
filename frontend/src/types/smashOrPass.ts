// frontend/src/types/smashOrPass.ts

export type CharacterRole = 'Survivor' | 'Killer' | 'all';
export type CharacterGender = 'female' | 'male' | 'monster_other' | 'all';
export type VoteType = 'smash' | 'pass' | 'super_smash';

export type TierClassification =
  | 'God Tier'
  | 'Fatal Attraction'
  | 'Friendzone'
  | 'Eldritch Void';

/**
 * The four locales the backend stores overrides for. English is deliberately absent:
 * it lives on the top-level profile fields, so there is no `en` entry to look up.
 */
export type EntityLocale = 'de' | 'es' | 'ja' | 'pl';

/**
 * The translatable half of an entity's dating profile.
 *
 * Every field is required here because the backend always emits the English copy.
 * A `translations` entry is a Partial of this: a locale only carries the fields that
 * actually DIFFER from English, so an absent field means "same as English".
 */
export interface EntityProfile {
  archetype: string;
  bio: string;
  tagline: string;
  quote: string;
  meme: string;
  turn_on: string;
  dealbreaker: string;
  dating_vibe: string;
  red_flags: string[];
  green_flags: string[];
}

/**
 * Entity metadata as the API now emits it: one spelling per field, no duplicates.
 *
 * Gone from this shape, and why:
 * - `title` — was a verbatim copy of `archetype` on every entity. Use `archetype`.
 * - `turnOn` / `redFlags` / `greenFlags` / `datingVibe` — camelCase twins of the
 *   snake_case fields, equal on every entity. Snake_case is the only spelling now.
 * - `i18n` — a second five-locale blob next to `translations`, with a stale `pl.quote`.
 *   `translations` was the good copy and is the only one the API sends.
 * - `lore_quote` / `backstory` / `audio_cue` — never populated by the backend.
 * - `[key: string]: any` — the index signature that let all of the above survive
 *   type-checking. Without it, a resurrected duplicate spelling is a compile error.
 */
export interface EntityMetadata extends EntityProfile {
  chapter?: string;
  danger_level?: 'Low' | 'Medium' | 'High' | 'Lethal' | 'Eldritch' | string;
  chaos_score?: number;
  /** Derived server-side as [archetype, role, gender]; read-only, never stored here. */
  compatibility_tags?: string[];
  /** Only the fields that differ from English, per locale. Absent field = English. */
  translations?: Partial<Record<EntityLocale, Partial<EntityProfile>>>;
}

export interface EntityStatItem {
  // `id` is gone: the stats table is strictly 1:1 with entities, so `entity_id` is the key.
  entity_id: string;
  smash_count: number;
  pass_count: number;
  super_smash_count: number;
  total_votes: number;
  smash_rate: number;
  chaos_rating: number;
  rank?: number | null;
  updated_at?: string | null;
}

export interface EntityItem {
  id: string;
  roster_id: string;
  slug: string;
  name: string;
  real_name?: string;
  watermark_left?: string;
  watermark_right?: string;
  role: CharacterRole | string;
  gender: CharacterGender | string;
  media_url?: string | null;
  media_type?: string;
  // `metadata_json` is gone: the API used to emit the same dict twice per entity.
  metadata?: EntityMetadata;
  order_index?: number;
  is_active?: boolean;
  stat?: EntityStatItem | null;
  created_at?: string | null;
}

export interface RosterItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url?: string | null;
  theme_color: string;
  category: string;
  is_nsfw: boolean;
  is_active: boolean;
  entity_count?: number;
  character_count?: number;
  total_votes?: number;
  created_at?: string | null;
  /** True for a roster synthesized client-side from localStorage (slug is
   * `local:<id>`, never a real backend roster). Never sent to or read from
   * the API -- purely a UI marker so the picker and hub can tell the two
   * apart (no leaderboard fetch, no server vote, an "Edit"/"Delete" action
   * instead of nothing). */
  is_local?: boolean;
  roster_mode?: 'simple' | 'full';
  custom_roles?: string[];
  custom_genders?: string[];
  custom_labels?: RosterCustomLabels;
  romance_archetypes?: CustomRomanceArchetype[];
}

export interface FeedResponse {
  roster: RosterItem;
  entities: EntityItem[];
  total_remaining: number;
}

export interface LeaderboardItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  gender: string;
  media_url?: string | null;
  media_type?: string;
  metadata?: EntityMetadata;
  stat?: EntityStatItem | null;
  tier: TierClassification | string;
  rank: number;
  smash_count?: number;
  pass_count?: number;
  super_smash_count?: number;
  total_votes?: number;
  smash_rate?: number;
  chaos_rating?: number;
  character_slug?: string;
  character_name?: string;
  edition?: string;
}

export interface VoteResponse {
  status?: string;
  data: EntityItem & {
    character_slug?: string;
    character_name?: string;
    edition?: string;
    smash_count?: number;
    pass_count?: number;
    super_smash_count?: number;
    total_votes?: number;
    smash_rate?: number;
    chaos_rating?: number;
    [key: string]: unknown;
  };
}

export interface SmashFilterOptions {
  role?: string;
  gender?: string;
  limit?: number;
}

export interface SmashLeaderboardOptions {
  role?: string;
  gender?: string;
  sortBy?: 'smash_rate' | 'total_votes' | 'smash_count' | 'chaos_rating' | string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Portable JSON document (import / export / share links / admin creator)
//
// A local, self-contained roster never has a server-side counterpart to
// "customize" the way a tier-list ranking customizes an official template --
// there is no official-roster-plus-user-overrides concept here. So unlike
// `TierListDocument`, this document is always the whole roster: a custom
// roster IS its entities, not a diff against one.
// ---------------------------------------------------------------------------

export const SMASH_ROSTER_FORMAT = 'lemondbd-smash-roster' as const;
export const SMASH_ROSTER_FORMAT_VERSION = 1 as const;

/**
 * One entity inside a portable roster document. Mirrors `EntityProfile` plus
 * the identity/media columns, but every field is optional except `id`/`name`
 * -- a hand-written or partially-filled draft should still round-trip.
 */
export interface SmashRosterDocumentEntity {
  /** Stable, slug-shaped key unique within this document. Never sent to translations. */
  id: string;
  name: string;
  real_name?: string;
  role: string;
  gender: string;
  media_url?: string;
  media_type?: string;
  watermark_left?: string;
  watermark_right?: string;
  archetype?: string;
  bio?: string;
  tagline?: string;
  quote?: string;
  meme?: string;
  turn_on?: string;
  dealbreaker?: string;
  dating_vibe?: string;
  red_flags?: string[];
  green_flags?: string[];
  chapter?: string;
  danger_level?: string;
  chaos_score?: number;
}

export interface RosterCustomLabels {
  turn_on?: string;
  dealbreaker?: string;
  dating_vibe?: string;
  meme?: string;
  archetype?: string;
  quote?: string;
  [key: string]: string | undefined;
}

export interface ArchetypeRule {
  target: 'smash_rate' | 'total_votes' | 'role_affinity' | 'gender_affinity' | 'role_count' | 'gender_count';
  target_value?: string;
  operator: '>=' | '<=' | '==' | '>';
  value: number;
}

export interface CustomRomanceArchetype {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge_color: string;
  icon_name?: 'flame' | 'skull' | 'heart' | 'zap' | 'sparkles' | 'shield' | 'compass' | string;
  icon_url?: string;
  badge_image_url?: string;
  is_fallback?: boolean;
  rules: ArchetypeRule[];
}

export interface SmashRosterDocument {
  format: typeof SMASH_ROSTER_FORMAT;
  version: typeof SMASH_ROSTER_FORMAT_VERSION;
  name: string;
  description?: string;
  /** An https:/data: image shown on the roster's card in the picker. */
  cover_image_url?: string;
  theme_color?: string;
  category?: string;
  is_nsfw?: boolean;
  roster_mode?: 'simple' | 'full';
  custom_roles?: string[];
  custom_genders?: string[];
  custom_labels?: RosterCustomLabels;
  romance_archetypes?: CustomRomanceArchetype[];
  entities: SmashRosterDocumentEntity[];
}

// ---------------------------------------------------------------------------
// localStorage shape
// ---------------------------------------------------------------------------

export interface StoredCustomRoster extends SmashRosterDocument {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface SmashRosterStoreState {
  version: 1;
  custom: Record<string, StoredCustomRoster>;
}
