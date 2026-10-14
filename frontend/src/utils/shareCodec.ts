// frontend/src/utils/shareCodec.ts
/**
 * Primitives shared by the portable-JSON codecs (tier lists, smash-or-pass
 * rosters): untrusted-text sanitizers, and the `#import=` share-link
 * transport (deflate-raw + base64url, with an uncompressed fallback).
 *
 * Pure functions only -- no React, no storage.
 */

import type { ContentManifest } from './contentSigning';

/** Hash parameter a share link carries its payload in (`/tier-lists#import=...`). */
export const SHARE_HASH_PARAM = 'import';

/** Allowed inline image types. SVG is excluded: it is a document, not a picture. */
export const DATA_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collapses whitespace and control characters, then caps the length. */
export function cleanText(value: unknown, max: number, counter?: { truncated: number }): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > max) {
    if (counter) counter.truncated += 1;
    return text.slice(0, max).trimEnd();
  }
  return text;
}

/** Returns the first `${base}`, `${base}-2`, `${base}-3`... not already in `taken`. */
export function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

/**
 * Returns a displayable image source, or null if `raw` is not one we allow.
 * Accepted: `https:` URLs, raster `data:image/*;base64` up to
 * `maxDataImageChars`, and backend-relative `/static/...` paths.
 */
export function sanitizeImageUrl(raw: unknown, maxDataImageChars: number): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('data:')) {
    return value.length <= maxDataImageChars && DATA_IMAGE_PATTERN.test(value) ? value : null;
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

// ---------------------------------------------------------------------------
// Share links: `/<locale>/<page>#import=z.<base64url(deflate-raw(json))>`
//
// The payload lives in the URL *fragment*, which browsers never send to a
// server. `z.` is compressed with the browser's native CompressionStream;
// `j.` is the uncompressed fallback for a runtime without it.
// ---------------------------------------------------------------------------

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

async function decompressBounded(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array | null> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalLength += value.length;
        if (totalLength > maxBytes) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
    throw err;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const canCompress = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Encodes compact JSON text for the `#import=` fragment, compressed when possible. */
export async function encodeShareText(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (canCompress()) {
    return `z.${bytesToBase64Url(await pipeThrough(bytes, new CompressionStream('deflate-raw')))}`;
  }
  return `j.${bytesToBase64Url(bytes)}`;
}

export type ShareTextResult =
  | { ok: true; text: string }
  | { ok: false; error: 'tooLarge' | 'invalidShareLink' };

/** Decodes a payload back to its JSON text. Throws on corrupt base64 / deflate data -- callers catch. */
export async function decodeShareText(payload: string, maxPayloadChars: number): Promise<ShareTextResult> {
  const [scheme, body] = [payload.slice(0, 2), payload.slice(2)];
  if (!body || body.length > maxPayloadChars) {
    return { ok: false, error: body ? 'tooLarge' : 'invalidShareLink' };
  }
  let bytes = base64UrlToBytes(body);
  if (scheme === 'z.') {
    if (!canCompress()) return { ok: false, error: 'invalidShareLink' };
    const decompressed = await decompressBounded(bytes, maxPayloadChars * 4);
    if (!decompressed) return { ok: false, error: 'tooLarge' };
    bytes = decompressed;
  } else if (scheme !== 'j.') {
    return { ok: false, error: 'invalidShareLink' };
  }
  const text = new TextDecoder().decode(bytes);
  if (text.length > maxPayloadChars) {
    return { ok: false, error: 'tooLarge' };
  }
  return { ok: true, text };
}

/** Reads the share payload out of a `location.hash`, or null if there is none. */
export function readShareFragment(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const value = params.get(SHARE_HASH_PARAM);
  return value && value.length > 2 ? value : null;
}

/**
 * Safely parses and validates a content manifest from an untrusted document or payload.
 * Returns the manifest if structurally valid, or null otherwise.
 */
export function sanitizeManifest(raw: unknown): ContentManifest | null {
  if (!isRecord(raw)) return null;
  const content_type = cleanText(raw.content_type, 64);
  const content_hash = cleanText(raw.content_hash, 128);
  const author_login = cleanText(raw.author_login, 64);
  const signature = cleanText(raw.signature, 128);
  const created_at = cleanText(raw.created_at, 64);
  const author_id =
    typeof raw.author_id === 'number' && Number.isInteger(raw.author_id) && raw.author_id > 0
      ? raw.author_id
      : null;

  if (
    !content_type ||
    !content_hash ||
    content_hash.length !== 64 ||
    !author_id ||
    !author_login ||
    !signature ||
    signature.length !== 64 ||
    !created_at
  ) {
    return null;
  }

  return {
    content_type,
    content_hash,
    author_id,
    author_login,
    signature,
    created_at,
  };
}

