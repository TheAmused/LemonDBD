// frontend/src/utils/contentHash.ts
/**
 * The content hash the server gives a document, computed in the browser.
 *
 * Moderation bans are keyed on `sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"),
 * ensure_ascii=False))` of the payload as it arrived over the wire (backend
 * `app/services/content_crypto.py`). This module rebuilds that exact string: the payload goes
 * through a JSON round trip first (what the server would have received), object keys are sorted by
 * code point, and numbers are printed the way Python prints the int or float it parsed. The parity
 * test pins hashes produced by the Python side, so the two cannot drift apart unnoticed.
 *
 * Hashing the content itself, rather than trusting the `_manifest.content_hash` an item carries,
 * is what lets a ban reach unsigned copies and copies whose author stamp was removed.
 */
import { signingPayload } from '@/utils/contentPayload';
import type { ModeratedContentType } from '@/utils/contentSigning';
import { isRecord } from '@/utils/shareCodec';
import { smashRosterExportDoc } from '@/utils/smashOrPass/exportDoc';
import { buildCustomTierListDoc } from '@/utils/tierLists/customDoc';
import type { StoredCustomRoster } from '@/types/smashOrPass';
import type { StoredCustomList } from '@/types/tierList';

/** Python's `repr(float)`: scientific notation below 1e-4 and from 1e16 up, with a 2-digit exponent. */
function pythonFloat(value: number): string {
  const [mantissa, exponentText] = value.toExponential().split('e');
  const exponent = Number(exponentText);
  if (exponent >= -4 && exponent < 16) return JSON.stringify(value);
  const sign = value < 0 ? '-' : '';
  const digits = mantissa.replace('-', '').replace('.', '');
  const lead = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
  const magnitude = String(Math.abs(exponent)).padStart(2, '0');
  return `${sign}${lead}e${exponent < 0 ? '-' : '+'}${magnitude}`;
}

/** A wire number becomes a Python int when it has no fraction or exponent, otherwise a float. */
function pythonNumber(value: number): string {
  const wire = JSON.stringify(value);
  return /[.eE]/.test(wire) ? pythonFloat(value) : wire;
}

/** Python orders `str` keys by code point; JS's default sort compares UTF-16 units. */
function compareCodePoints(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i].codePointAt(0) ?? 0) - (right[i].codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

function canonical(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return pythonNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort(compareCodePoints);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

/** The canonical JSON string the server hashes for `payload`. */
export function canonicalJson(payload: Record<string, unknown>): string {
  return canonical(JSON.parse(JSON.stringify(payload)));
}

/** SHA-256 hex of the canonical payload, or null where Web Crypto is unavailable (insecure origin). */
export async function contentHash(payload: Record<string, unknown>): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(payload)));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/** A saved item turned into the document that is exported, shared and reported. */
function storedDocument(contentType: ModeratedContentType, item: Record<string, unknown>): unknown {
  if (contentType === 'tier_list') {
    const list = item as unknown as StoredCustomList;
    return buildCustomTierListDoc(list, list.tiers, list.placements);
  }
  if (contentType === 'smash_roster') return smashRosterExportDoc(item as unknown as StoredCustomRoster);
  return item;
}

/** The hash a report of this saved item would be filed under, i.e. the key its ban is stored by. */
export async function storedContentHash(contentType: ModeratedContentType, item: unknown): Promise<string | null> {
  if (!isRecord(item)) return null;
  try {
    const payload = signingPayload(contentType, storedDocument(contentType, item));
    return Object.keys(payload).length > 0 ? await contentHash(payload) : null;
  } catch {
    return null;
  }
}
