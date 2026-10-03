// frontend/src/utils/smashOrPass/codec.ts
/**
 * The portable smash-or-pass roster JSON format: validation, sanitizing, and
 * share links. Mirrors `frontend/src/utils/tierLists/codec.ts` one-to-one in
 * approach -- everything that enters through here is untrusted (a pasted
 * payload, an uploaded file, or a `#import=` link someone sent), so:
 *
 *   * the payload is size-capped before it is parsed, and every roster in it
 *     is entity-count-capped, so a hostile payload cannot hang the tab or
 *     fill storage;
 *   * images are only ever `https:`, a raster `data:image/*`, or a path under
 *     the backend's own `/static/` -- never `javascript:`, never plain
 *     `http:` (mixed content on the HTTPS site), never SVG;
 *   * text is length-capped and rendered by React as text, never as HTML;
 *   * anything malformed is dropped with a counted warning rather than
 *     rejecting the whole payload, unless nothing usable is left.
 *
 * A custom roster has no tiers/placements concept -- it is simply its own
 * list of entities, always self-contained (there is no "official roster plus
 * local overrides" the way a tier-list ranking customizes a template).
 *
 * Pure functions only -- no React, no storage -- so unit tests exercise
 * exactly what the UI runs.
 */
import {
  SMASH_ROSTER_FORMAT,
  SMASH_ROSTER_FORMAT_VERSION,
  type ArchetypeRule,
  type CustomRomanceArchetype,
  type RosterCustomLabels,
  type SmashRosterDocument,
  type SmashRosterDocumentEntity,
} from '@/types/smashOrPass';
import { slugify } from '@/utils/slug';
import {
  cleanText,
  decodeShareText,
  encodeShareText,
  isRecord,
  readShareFragment as readShareFragmentFrom,
  sanitizeImageUrl as sanitizeImageUrlWith,
  uniqueId,
} from '@/utils/shareCodec';
import { ENTITY_ID_PATTERN, SHARE_HASH_PARAM, SMASH_ROSTER_LIMITS } from './constants';
export type SmashRosterErrorCode =
  | 'invalidJson'
  | 'notAnObject'
  | 'wrongFormat'
  | 'unsupportedVersion'
  | 'tooLarge'
  | 'noEntities'
  | 'invalidShareLink';

export type SmashRosterWarningCode = 'droppedEntities' | 'droppedImages' | 'truncated';

export interface SmashRosterWarning {
  code: SmashRosterWarningCode;
  count: number;
}

export type SmashRosterParseResult =
  | { ok: true; doc: SmashRosterDocument; warnings: SmashRosterWarning[] }
  | { ok: false; error: SmashRosterErrorCode };

// ---------------------------------------------------------------------------
// Small sanitizers
// ---------------------------------------------------------------------------

/**
 * Returns a displayable image/media source, or null if `raw` is not one we
 * allow. Accepted: `https:` URLs, raster `data:image/*;base64` up to the
 * size cap, and backend-relative `/static/...` paths.
 */
export function sanitizeImageUrl(raw: unknown): string | null {
  return sanitizeImageUrlWith(raw, SMASH_ROSTER_LIMITS.maxDataImageChars);
}

/** A stable, pattern-safe id from arbitrary text (`"Leon S. Kennedy"` -> `leon-s-kennedy`). */
export function slugifyEntityId(text: string): string {
  return slugify(text, 'entity');
}

function cleanFlags(raw: unknown, max: number, maxCount: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (out.length >= maxCount) break;
    const text = cleanText(entry, max);
    if (text) out.push(text);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

function sanitizeEntity(
  entry: Record<string, unknown>,
  taken: Set<string>,
  counter: { truncated: number }
): SmashRosterDocumentEntity | null {
  const name = cleanText(entry.name, SMASH_ROSTER_LIMITS.maxEntityName, counter);
  if (!name) return null;

  const explicitId = cleanText(entry.id, SMASH_ROSTER_LIMITS.maxEntityId);
  const base = explicitId && ENTITY_ID_PATTERN.test(explicitId) ? explicitId : slugifyEntityId(name);
  const id = uniqueId(base, taken);
  taken.add(id);

  const role = cleanText(entry.role, SMASH_ROSTER_LIMITS.maxRoleOrGender, counter) || 'Survivor';
  const gender = cleanText(entry.gender, SMASH_ROSTER_LIMITS.maxRoleOrGender, counter) || 'female';

  const rawMedia = entry.media_url ?? entry.media ?? entry.image_url ?? entry.image;
  const media_url = sanitizeImageUrl(rawMedia) ?? undefined;

  const entity: SmashRosterDocumentEntity = { id, name, role, gender };
  if (media_url) entity.media_url = media_url;

  const media_type = cleanText(entry.media_type, 16);
  if (media_type) entity.media_type = media_type;

  const real_name = cleanText(entry.real_name, SMASH_ROSTER_LIMITS.maxRealName, counter);
  if (real_name) entity.real_name = real_name;

  const watermark_left = cleanText(entry.watermark_left, SMASH_ROSTER_LIMITS.maxWatermark, counter);
  if (watermark_left) entity.watermark_left = watermark_left;

  const watermark_right = cleanText(entry.watermark_right, SMASH_ROSTER_LIMITS.maxWatermark, counter);
  if (watermark_right) entity.watermark_right = watermark_right;

  const archetype = cleanText(entry.archetype, SMASH_ROSTER_LIMITS.maxArchetype, counter);
  if (archetype) entity.archetype = archetype;

  const bio = cleanText(entry.bio, SMASH_ROSTER_LIMITS.maxBio, counter);
  if (bio) entity.bio = bio;

  const tagline = cleanText(entry.tagline, SMASH_ROSTER_LIMITS.maxTagline, counter);
  if (tagline) entity.tagline = tagline;

  const quote = cleanText(entry.quote, SMASH_ROSTER_LIMITS.maxQuote, counter);
  if (quote) entity.quote = quote;

  const meme = cleanText(entry.meme, SMASH_ROSTER_LIMITS.maxMeme, counter);
  if (meme) entity.meme = meme;

  const turn_on = cleanText(entry.turn_on, SMASH_ROSTER_LIMITS.maxTurnOn, counter);
  if (turn_on) entity.turn_on = turn_on;

  const dealbreaker = cleanText(entry.dealbreaker, SMASH_ROSTER_LIMITS.maxDealbreaker, counter);
  if (dealbreaker) entity.dealbreaker = dealbreaker;

  const dating_vibe = cleanText(entry.dating_vibe, SMASH_ROSTER_LIMITS.maxDatingVibe, counter);
  if (dating_vibe) entity.dating_vibe = dating_vibe;

  const red_flags = cleanFlags(entry.red_flags, SMASH_ROSTER_LIMITS.maxFlagText, SMASH_ROSTER_LIMITS.maxFlags);
  if (red_flags.length) entity.red_flags = red_flags;

  const green_flags = cleanFlags(entry.green_flags, SMASH_ROSTER_LIMITS.maxFlagText, SMASH_ROSTER_LIMITS.maxFlags);
  if (green_flags.length) entity.green_flags = green_flags;

  const chapter = cleanText(entry.chapter, SMASH_ROSTER_LIMITS.maxChapter, counter);
  if (chapter) entity.chapter = chapter;

  const danger_level = cleanText(entry.danger_level, SMASH_ROSTER_LIMITS.maxDangerLevel, counter);
  if (danger_level) entity.danger_level = danger_level;

  const chaosRaw = entry.chaos_score;
  if (typeof chaosRaw === 'number' && Number.isFinite(chaosRaw)) {
    const clamped = Math.round(Math.min(100, Math.max(0, chaosRaw)));
    entity.chaos_score = clamped;
  }

  return entity;
}

function sanitizeEntities(
  raw: unknown,
  warnings: Map<SmashRosterWarningCode, number>,
  counter: { truncated: number }
): SmashRosterDocumentEntity[] {
  if (!Array.isArray(raw)) return [];
  const entities: SmashRosterDocumentEntity[] = [];
  const taken = new Set<string>();
  let droppedEntities = 0;
  let droppedImages = 0;

  for (const [index, entry] of raw.entries()) {
    if (entities.length >= SMASH_ROSTER_LIMITS.maxEntities) {
      droppedEntities += raw.length - index;
      break;
    }
    if (!isRecord(entry)) {
      droppedEntities += 1;
      continue;
    }
    const rawMedia = entry.media_url ?? entry.media ?? entry.image_url ?? entry.image;
    const entity = sanitizeEntity(entry, taken, counter);
    if (!entity) {
      droppedEntities += 1;
      continue;
    }
    if (rawMedia !== undefined && rawMedia !== null && rawMedia !== '' && !entity.media_url) {
      droppedImages += 1;
    }
    entities.push(entity);
  }

  if (droppedEntities) warnings.set('droppedEntities', droppedEntities);
  if (droppedImages) warnings.set('droppedImages', droppedImages);
  return entities;
}

function sanitizeStringList(raw: unknown, maxLen = 64, maxItems = 30): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .map((s) => cleanText(s, maxLen))
    .filter(Boolean);
  const deduped = Array.from(new Set(list)).slice(0, maxItems);
  return deduped.length ? deduped : undefined;
}

function sanitizeCustomLabels(raw: unknown): RosterCustomLabels | undefined {
  if (!isRecord(raw)) return undefined;
  const labels: RosterCustomLabels = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v.trim()) {
      labels[k] = cleanText(v, 64);
    }
  }
  return Object.keys(labels).length ? labels : undefined;
}

function sanitizeRomanceArchetypes(raw: unknown): CustomRomanceArchetype[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CustomRomanceArchetype[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!isRecord(item)) continue;
    const title = cleanText(item.title, 128);
    if (!title) continue;
    const id = cleanText(item.id, 64) || slugifyEntityId(title);
    const subtitle = cleanText(item.subtitle, 200);
    const description = cleanText(item.description, 2000);
    const badge_color = cleanText(item.badge_color, 64) || 'from-accent-red to-bg-primary';
    const icon_name = cleanText(item.icon_name, 32);
    const icon_url = sanitizeImageUrl(item.icon_url) || undefined;
    const badge_image_url = sanitizeImageUrl(item.badge_image_url) || undefined;
    const is_fallback = item.is_fallback === true;

    const rules: ArchetypeRule[] = [];
    if (Array.isArray(item.rules)) {
      for (const r of item.rules.slice(0, 10)) {
        if (!isRecord(r)) continue;
        const target = r.target;
        if (
          target === 'smash_rate' ||
          target === 'total_votes' ||
          target === 'role_affinity' ||
          target === 'gender_affinity' ||
          target === 'role_count' ||
          target === 'gender_count'
        ) {
          const operator = r.operator === '<=' || r.operator === '==' || r.operator === '>' ? r.operator : '>=';
          const value = typeof r.value === 'number' && Number.isFinite(r.value) ? r.value : 0;
          const target_value = cleanText(r.target_value, 64) || undefined;
          rules.push({ target, operator, value, target_value });
        }
      }
    }

    out.push({
      id,
      title,
      subtitle,
      description,
      badge_color,
      ...(icon_name ? { icon_name } : {}),
      ...(icon_url ? { icon_url } : {}),
      ...(badge_image_url ? { badge_image_url } : {}),
      ...(is_fallback ? { is_fallback: true } : {}),
      rules,
    });
  }
  return out.length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Validates and sanitizes an already-parsed value into a SmashRosterDocument. */
export function validateSmashRosterDocument(input: unknown): SmashRosterParseResult {
  if (!isRecord(input)) return { ok: false, error: 'notAnObject' };

  if (input.format !== undefined && input.format !== SMASH_ROSTER_FORMAT) {
    return { ok: false, error: 'wrongFormat' };
  }
  if (input.version !== undefined) {
    const version = Number(input.version);
    if (!Number.isInteger(version) || version < 1 || version > SMASH_ROSTER_FORMAT_VERSION) {
      return { ok: false, error: 'unsupportedVersion' };
    }
  }

  const warnings = new Map<SmashRosterWarningCode, number>();
  const counter = { truncated: 0 };

  const entities = sanitizeEntities(input.entities, warnings, counter);
  if (entities.length === 0) return { ok: false, error: 'noEntities' };

  const name = cleanText(input.name ?? input.title, SMASH_ROSTER_LIMITS.maxRosterName, counter);
  const description = cleanText(input.description, SMASH_ROSTER_LIMITS.maxRosterDescription, counter);
  const category = cleanText(input.category, 64);
  const theme_color = cleanText(input.theme_color, 32);
  const cover_image_url = sanitizeImageUrl(input.cover_image_url);
  const is_nsfw = input.is_nsfw === true;
  const roster_mode = input.roster_mode === 'simple' ? 'simple' : 'full';
  const custom_roles = sanitizeStringList(input.custom_roles);
  const custom_genders = sanitizeStringList(input.custom_genders);
  const custom_labels = sanitizeCustomLabels(input.custom_labels);
  const romance_archetypes = sanitizeRomanceArchetypes(input.romance_archetypes);

  if (counter.truncated) warnings.set('truncated', counter.truncated);

  const doc: SmashRosterDocument = {
    format: SMASH_ROSTER_FORMAT,
    version: SMASH_ROSTER_FORMAT_VERSION,
    name: name || 'Untitled Roster',
    ...(description ? { description } : {}),
    ...(cover_image_url ? { cover_image_url: cover_image_url } : {}),
    ...(theme_color ? { theme_color } : {}),
    ...(category ? { category } : {}),
    ...(is_nsfw ? { is_nsfw } : {}),
    roster_mode,
    ...(custom_roles?.length ? { custom_roles } : {}),
    ...(custom_genders?.length ? { custom_genders } : {}),
    ...(custom_labels ? { custom_labels } : {}),
    ...(romance_archetypes?.length ? { romance_archetypes } : {}),
    entities,
  };

  return {
    ok: true,
    doc,
    warnings: [...warnings.entries()].map(([code, count]) => ({ code, count })),
  };
}

/** Parses JSON text (a paste or an uploaded file) into a validated document. */
export function parseSmashRosterJson(text: string): SmashRosterParseResult {
  if (text.length > SMASH_ROSTER_LIMITS.maxPayloadChars) return { ok: false, error: 'tooLarge' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  return validateSmashRosterDocument(parsed);
}

/** Pretty JSON for the export textarea and the downloaded file. */
export function serializeSmashRosterDocument(doc: SmashRosterDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** A filesystem-safe download name: `lemondbd-smash-roster-hooked-on-you.json`. */
export function exportFileName(doc: Pick<SmashRosterDocument, 'name'>): string {
  const base = slugifyEntityId(doc.name || 'roster');
  return `lemondbd-smash-roster-${base}.json`;
}

// ---------------------------------------------------------------------------
// Share links: `/<locale>/smash-or-pass#import=z.<base64url(deflate-raw(json))>`
//
// The payload lives in the URL *fragment*, which browsers never send to a
// server -- a shared roster costs no backend storage and leaks nothing to
// logs. `z.` is compressed with the browser's native CompressionStream; `j.`
// is the uncompressed fallback for a runtime without it.
// ---------------------------------------------------------------------------

/** Encodes a document for the `#import=` fragment. Compact JSON, compressed when possible. */
export async function encodeSharePayload(doc: SmashRosterDocument): Promise<string> {
  return encodeShareText(JSON.stringify(doc));
}

/** Decodes an `#import=` payload back to a validated document. Never throws. */
export async function decodeSharePayload(payload: string): Promise<SmashRosterParseResult> {
  try {
    const decoded = await decodeShareText(payload, SMASH_ROSTER_LIMITS.maxPayloadChars);
    return decoded.ok ? parseSmashRosterJson(decoded.text) : decoded;
  } catch {
    return { ok: false, error: 'invalidShareLink' };
  }
}

/** Reads the share payload out of a `location.hash`, or null if there is none. */
export function readShareFragment(hash: string): string | null {
  return readShareFragmentFrom(hash);
}

export function buildShareUrl(origin: string, locale: string, payload: string): string {
  return `${origin}/${locale}/smash-or-pass#${SHARE_HASH_PARAM}=${payload}`;
}
