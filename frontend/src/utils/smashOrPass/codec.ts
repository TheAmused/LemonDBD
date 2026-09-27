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
  type SmashRosterDocument,
  type SmashRosterDocumentEntity,
} from '@/types/smashOrPass';
import { DATA_IMAGE_PATTERN, ENTITY_ID_PATTERN, SHARE_HASH_PARAM, SMASH_ROSTER_LIMITS } from './constants';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collapses whitespace and control characters, then caps the length. */
function cleanText(value: unknown, max: number, counter?: { truncated: number }): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  // eslint-disable-next-line no-control-regex
  const text = String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > max) {
    if (counter) counter.truncated += 1;
    return text.slice(0, max).trimEnd();
  }
  return text;
}

/**
 * Returns a displayable image/media source, or null if `raw` is not one we
 * allow. Accepted: `https:` URLs, raster `data:image/*;base64` up to the
 * size cap, and backend-relative `/static/...` paths.
 */
export function sanitizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('data:')) {
    return value.length <= SMASH_ROSTER_LIMITS.maxDataImageChars && DATA_IMAGE_PATTERN.test(value)
      ? value
      : null;
  }

  if (value.startsWith('/static/')) {
    return !value.includes('..') && !value.includes('//') && !/[\s"'<>\\]/.test(value) ? value : null;
  }

  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** A stable, pattern-safe id from arbitrary text (`"Leon S. Kennedy"` -> `leon-s-kennedy`). */
export function slugifyEntityId(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'entity'
  );
}

/** Returns the first `${base}`, `${base}-2`, `${base}-3`... not already in `taken`. */
export function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  return candidate;
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

const canCompress = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Encodes a document for the `#import=` fragment. Compact JSON, compressed when possible. */
export async function encodeSharePayload(doc: SmashRosterDocument): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  if (canCompress()) {
    return `z.${bytesToBase64Url(await pipeThrough(bytes, new CompressionStream('deflate-raw')))}`;
  }
  return `j.${bytesToBase64Url(bytes)}`;
}

/** Decodes an `#import=` payload back to a validated document. Never throws. */
export async function decodeSharePayload(payload: string): Promise<SmashRosterParseResult> {
  try {
    const [scheme, body] = [payload.slice(0, 2), payload.slice(2)];
    if (!body || body.length > SMASH_ROSTER_LIMITS.maxPayloadChars) {
      return { ok: false, error: body ? 'tooLarge' : 'invalidShareLink' };
    }
    let bytes = base64UrlToBytes(body);
    if (scheme === 'z.') {
      if (!canCompress()) return { ok: false, error: 'invalidShareLink' };
      bytes = await pipeThrough(bytes, new DecompressionStream('deflate-raw'));
    } else if (scheme !== 'j.') {
      return { ok: false, error: 'invalidShareLink' };
    }
    return parseSmashRosterJson(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: 'invalidShareLink' };
  }
}

/** Reads the share payload out of a `location.hash`, or null if there is none. */
export function readShareFragment(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const value = params.get(SHARE_HASH_PARAM);
  return value && value.length > 2 ? value : null;
}

export function buildShareUrl(origin: string, locale: string, payload: string): string {
  return `${origin}/${locale}/smash-or-pass#${SHARE_HASH_PARAM}=${payload}`;
}
