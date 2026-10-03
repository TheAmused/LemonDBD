// frontend/src/utils/smashOrPass/constants.ts

/**
 * Hard caps on anything that arrives from a pasted JSON payload or a share
 * link. Generous for real use, small enough that a hostile payload cannot
 * freeze the page or fill localStorage.
 *
 * Mirrors `SmashRosterAdminCreate` / `SmashEntityAdminCreate` on the backend
 * (backend/app/schemas/smash_or_pass.py) field-for-field, so a custom roster
 * built here is never rejected for being longer than an admin one is allowed
 * to be -- the two share one notion of "too long".
 */
export const SMASH_ROSTER_LIMITS = {
  maxPayloadChars: 2_000_000,
  maxEntities: 100,
  maxRosterName: 128,
  maxRosterDescription: 2_000,
  maxEntityName: 128,
  maxEntityId: 64,
  maxRealName: 128,
  maxRoleOrGender: 32,
  maxWatermark: 64,
  maxArchetype: 128,
  maxBio: 4_000,
  maxTagline: 200,
  maxQuote: 500,
  maxMeme: 300,
  maxTurnOn: 300,
  maxDealbreaker: 300,
  maxDatingVibe: 300,
  maxFlags: 20,
  maxFlagText: 200,
  maxChapter: 128,
  maxDangerLevel: 32,
  /** Per inline `data:` image, in characters of base64. ~96 KB of image. */
  maxDataImageChars: 131_072,
  /** Past this a share link still works, but chat apps may truncate it. */
  shareLinkWarnChars: 8_000,
} as const;


export const ENTITY_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;


/** Quick-pick chips in the creator; the field itself is free text on both ends. */
export const ROLE_QUICK_PICKS = ['Survivor', 'Killer'] as const;
export const GENDER_QUICK_PICKS = ['female', 'male', 'monster_other'] as const;

/** Locales the backend accepts a `translations` override for. English lives
 * in the top-level fields, so it is never one of these. Custom (local)
 * rosters never carry this at all -- translation authoring is an official,
 * admin-only capability. */
export const TRANSLATABLE_LOCALES = ['de', 'es', 'ja', 'pl'] as const;

/** Entity fields an admin can override per locale. Mirrors the backend's own
 * `TRANSLATABLE_FIELDS` (backend/app/models/smash_or_pass.py) exactly -- role,
 * gender, name and media are never localized. */
export const TRANSLATABLE_FIELDS = [
  'archetype',
  'bio',
  'tagline',
  'quote',
  'meme',
  'turn_on',
  'dealbreaker',
  'dating_vibe',
  'red_flags',
  'green_flags',
] as const;

// Shared with the other portable-JSON codec; re-exported so callers keep one import site.
export { DATA_IMAGE_PATTERN, SHARE_HASH_PARAM } from '@/utils/shareCodec';
