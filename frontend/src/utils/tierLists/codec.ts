// frontend/src/utils/tierLists/codec.ts
/**
 * The portable tier-list JSON format: validation, sanitizing, and share links.
 *
 * Everything that enters through here is untrusted -- a pasted payload, an
 * uploaded file, or a `#import=` link someone sent. The rules:
 *
 *   * the payload is size-capped before it is parsed, and every list in it is
 *     count-capped, so a hostile payload cannot hang the tab or fill storage;
 *   * images are only ever `https:`, a raster `data:image/*`, or a path under
 *     the backend's own `/static/` -- never `javascript:`, never plain `http:`
 *     (mixed content on the HTTPS site), never SVG;
 *   * text is length-capped and rendered by React as text, never as HTML;
 *   * anything malformed is dropped with a counted warning rather than
 *     rejecting the whole payload, unless nothing usable is left.
 *
 * Pure functions only -- no React, no storage -- so the unit tests exercise
 * exactly what the UI runs.
 */
import {
  TIER_LIST_FORMAT,
  TIER_LIST_FORMAT_VERSION,
  type TierDefinition,
  type TierListDocument,
  type TierListDocumentItem,
  type TierPlacements,
} from '@/types/tierList';
import {
  DATA_IMAGE_PATTERN,
  DEFAULT_TIERS,
  HEX_COLOR_PATTERN,
  ITEM_ID_PATTERN,
  SHARE_HASH_PARAM,
  TIER_COLOR_TOKENS,
  TIER_LIST_LIMITS,
} from './constants';

export type TierListErrorCode =
  | 'invalidJson'
  | 'notAnObject'
  | 'wrongFormat'
  | 'unsupportedVersion'
  | 'tooLarge'
  | 'noItems'
  | 'invalidShareLink';

export type TierListWarningCode =
  | 'droppedTiers'
  | 'droppedItems'
  | 'droppedImages'
  | 'droppedPlacements'
  | 'truncated';

export interface TierListWarning {
  code: TierListWarningCode;
  count: number;
}

export type TierListParseResult =
  | { ok: true; doc: TierListDocument; warnings: TierListWarning[] }
  | { ok: false; error: TierListErrorCode };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function isTierColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ((TIER_COLOR_TOKENS as readonly string[]).includes(value) || HEX_COLOR_PATTERN.test(value))
  );
}

/**
 * Returns a displayable image source, or null if `raw` is not one we allow.
 * Accepted: `https:` URLs, raster `data:image/*;base64` up to the size cap,
 * and backend-relative `/static/...` paths.
 */
export function sanitizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('data:')) {
    return value.length <= TIER_LIST_LIMITS.maxDataImageChars && DATA_IMAGE_PATTERN.test(value)
      ? value
      : null;
  }

  if (value.startsWith('/static/')) {
    // A same-origin backend asset. No traversal, no protocol-relative `//host`.
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
export function slugifyItemId(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'item'
  );
}

/** Returns the first `${base}`, `${base}-2`, `${base}-3`... not already in `taken`. */
export function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

// ---------------------------------------------------------------------------
// Tiers and placements
// ---------------------------------------------------------------------------

export function sanitizeTiers(
  raw: unknown,
  warnings: Map<TierListWarningCode, number>,
  counter: { truncated: number }
): TierDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_TIERS.map((t) => ({ ...t }));

  const tiers: TierDefinition[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const [index, entry] of raw.entries()) {
    if (tiers.length >= TIER_LIST_LIMITS.maxTiers) {
      dropped += raw.length - index;
      break;
    }
    if (!isRecord(entry)) {
      dropped += 1;
      continue;
    }
    const label = cleanText(entry.label ?? entry.name ?? entry.id, TIER_LIST_LIMITS.maxTierLabel, counter);
    const rawId = cleanText(entry.id, TIER_LIST_LIMITS.maxItemId) || slugifyItemId(label || `tier-${index + 1}`);
    const id = ITEM_ID_PATTERN.test(rawId) ? rawId : slugifyItemId(rawId);
    if (!label || seen.has(id)) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    const fallbackColor = TIER_COLOR_TOKENS[Math.min(index, TIER_COLOR_TOKENS.length - 1)];
    tiers.push({ id, label, color: isTierColor(entry.color) ? entry.color : fallbackColor });
  }

  if (dropped) warnings.set('droppedTiers', dropped);
  return tiers.length ? tiers : DEFAULT_TIERS.map((t) => ({ ...t }));
}

/**
 * Keeps only placements into existing tiers, of keys `isValidKey` accepts,
 * each key at most once (first tier wins). Returns the count it dropped.
 */
export function normalizePlacements(
  raw: unknown,
  tierIds: readonly string[],
  isValidKey: (key: string) => boolean
): { placements: TierPlacements; dropped: number } {
  const placements: TierPlacements = {};
  for (const id of tierIds) placements[id] = [];
  if (!isRecord(raw)) return { placements, dropped: 0 };

  const tierSet = new Set(tierIds);
  const placed = new Set<string>();
  let dropped = 0;

  for (const [tierId, keys] of Object.entries(raw)) {
    if (!Array.isArray(keys)) continue;
    if (!tierSet.has(tierId)) {
      dropped += keys.length;
      continue;
    }
    for (const rawKey of keys) {
      const key = typeof rawKey === 'number' ? String(rawKey) : rawKey;
      if (typeof key !== 'string' || placed.has(key) || !isValidKey(key)) {
        dropped += 1;
        continue;
      }
      placed.add(key);
      placements[tierId].push(key);
    }
  }
  return { placements, dropped };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function sanitizeItems(
  raw: unknown,
  warnings: Map<TierListWarningCode, number>,
  counter: { truncated: number }
): TierListDocumentItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TierListDocumentItem[] = [];
  const taken = new Set<string>();
  let droppedItems = 0;
  let droppedImages = 0;

  for (const [index, entry] of raw.entries()) {
    if (items.length >= TIER_LIST_LIMITS.maxItems) {
      droppedItems += raw.length - index;
      break;
    }
    if (!isRecord(entry)) {
      droppedItems += 1;
      continue;
    }
    const name = cleanText(entry.name ?? entry.label ?? entry.title, TIER_LIST_LIMITS.maxItemName, counter);
    if (!name) {
      droppedItems += 1;
      continue;
    }

    const explicitId = cleanText(entry.id, TIER_LIST_LIMITS.maxItemId);
    let id: string;
    if (explicitId) {
      // An explicit id is what placements refer to; changing it would silently
      // unrank the item, so a clash or a bad id drops the item instead.
      if (!ITEM_ID_PATTERN.test(explicitId) || taken.has(explicitId)) {
        droppedItems += 1;
        continue;
      }
      id = explicitId;
    } else {
      id = uniqueId(slugifyItemId(name), taken);
    }
    taken.add(id);

    // "Dynamic icon URLs": accept the spellings people actually write.
    const rawImage = entry.image ?? entry.image_url ?? entry.icon ?? entry.icon_url ?? entry.img;
    const image = sanitizeImageUrl(rawImage);
    if (rawImage !== undefined && rawImage !== null && rawImage !== '' && !image) droppedImages += 1;

    items.push(image ? { id, name, image } : { id, name });
  }

  if (droppedItems) warnings.set('droppedItems', droppedItems);
  if (droppedImages) warnings.set('droppedImages', droppedImages);
  return items;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Validates and sanitizes an already-parsed value into a TierListDocument. */
export function validateTierListDocument(input: unknown): TierListParseResult {
  if (!isRecord(input)) return { ok: false, error: 'notAnObject' };

  // `format`/`version` are optional so a hand-written payload with just
  // `title`, `items` and `placements` still imports; a *different* format or
  // a newer version is refused rather than half-understood.
  if (input.format !== undefined && input.format !== TIER_LIST_FORMAT) {
    return { ok: false, error: 'wrongFormat' };
  }
  if (input.version !== undefined) {
    const version = Number(input.version);
    if (!Number.isInteger(version) || version < 1 || version > TIER_LIST_FORMAT_VERSION) {
      return { ok: false, error: 'unsupportedVersion' };
    }
  }

  const warnings = new Map<TierListWarningCode, number>();
  const counter = { truncated: 0 };

  const rawTemplate = typeof input.template === 'string' ? input.template.trim().toLowerCase() : '';
  const template = rawTemplate && SLUG_PATTERN.test(rawTemplate) ? rawTemplate : null;

  const tiers = sanitizeTiers(input.tiers, warnings, counter);
  const items = template ? [] : sanitizeItems(input.items, warnings, counter);
  if (!template && items.length === 0) return { ok: false, error: 'noItems' };

  const itemIds = new Set(items.map((i) => i.id));
  const isValidKey = template
    ? (key: string) => key.length <= TIER_LIST_LIMITS.maxItemId && ITEM_ID_PATTERN.test(key)
    : (key: string) => itemIds.has(key);
  const { placements, dropped } = normalizePlacements(
    input.placements,
    tiers.map((t) => t.id),
    isValidKey
  );
  if (dropped) warnings.set('droppedPlacements', dropped);

  const title = cleanText(input.title, TIER_LIST_LIMITS.maxTitle, counter);
  const description = cleanText(input.description, TIER_LIST_LIMITS.maxDescription, counter);
  if (counter.truncated) warnings.set('truncated', counter.truncated);

  const doc: TierListDocument = {
    format: TIER_LIST_FORMAT,
    version: TIER_LIST_FORMAT_VERSION,
    title,
    ...(description ? { description } : {}),
    template,
    tiers,
    ...(template ? {} : { items }),
    placements,
  };

  return {
    ok: true,
    doc,
    warnings: [...warnings.entries()].map(([code, count]) => ({ code, count })),
  };
}

/** Parses JSON text (a paste or an uploaded file) into a validated document. */
export function parseTierListJson(text: string): TierListParseResult {
  if (text.length > TIER_LIST_LIMITS.maxPayloadChars) return { ok: false, error: 'tooLarge' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  return validateTierListDocument(parsed);
}

/** Pretty JSON for the export textarea and the downloaded file. */
export function serializeTierListDocument(doc: TierListDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** A filesystem-safe download name: `lemondbd-tier-list-survivors.json`. */
export function exportFileName(doc: Pick<TierListDocument, 'title' | 'template'>): string {
  const base = slugifyItemId(doc.title || doc.template || 'tier-list');
  return `lemondbd-tier-list-${base}.json`;
}

// ---------------------------------------------------------------------------
// Share links: `/<locale>/tier-lists#import=z.<base64url(deflate-raw(json))>`
//
// The payload lives in the URL *fragment*, which browsers never send to a
// server -- a shared list costs no backend storage and leaks nothing to logs.
// `z.` is compressed with the browser's native CompressionStream; `j.` is the
// uncompressed fallback for a runtime without it.
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
export async function encodeSharePayload(doc: TierListDocument): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  if (canCompress()) {
    return `z.${bytesToBase64Url(await pipeThrough(bytes, new CompressionStream('deflate-raw')))}`;
  }
  return `j.${bytesToBase64Url(bytes)}`;
}

/** Decodes an `#import=` payload back to a validated document. Never throws. */
export async function decodeSharePayload(payload: string): Promise<TierListParseResult> {
  try {
    const [scheme, body] = [payload.slice(0, 2), payload.slice(2)];
    if (!body || body.length > TIER_LIST_LIMITS.maxPayloadChars) {
      return { ok: false, error: body ? 'tooLarge' : 'invalidShareLink' };
    }
    let bytes = base64UrlToBytes(body);
    if (scheme === 'z.') {
      if (!canCompress()) return { ok: false, error: 'invalidShareLink' };
      bytes = await pipeThrough(bytes, new DecompressionStream('deflate-raw'));
    } else if (scheme !== 'j.') {
      return { ok: false, error: 'invalidShareLink' };
    }
    return parseTierListJson(new TextDecoder().decode(bytes));
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
  return `${origin}/${locale}/tier-lists#${SHARE_HASH_PARAM}=${payload}`;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

/**
 * Whether dark or light text reads better on a tier color. Token colors are
 * all calibrated for dark ink; a user's hex is judged by relative luminance.
 */
export function tierInk(color: string): 'dark' | 'light' {
  if (!HEX_COLOR_PATTERN.test(color)) return 'dark';
  const channel = (hex: string) => {
    const c = parseInt(hex, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l =
    0.2126 * channel(color.slice(1, 3)) +
    0.7152 * channel(color.slice(3, 5)) +
    0.0722 * channel(color.slice(5, 7));
  // Contrast against #141414 (L≈0.007) vs white: pick whichever is higher.
  return (l + 0.05) / 0.057 >= 1.05 / (l + 0.05) ? 'dark' : 'light';
}
