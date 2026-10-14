// frontend/src/utils/contentSigning.ts
/**
 * Client-side cryptographic signing utilities for user-generated content.
 *
 * When authenticated users export content (tier lists, smash rosters),
 * the payload is signed via HMAC-SHA256 by the backend (`POST /api/v1/content/sign`).
 * The returned ContentManifest is attached to exported JSON under `_manifest` and
 * compressed into the share fragment, preserving cryptographic provenance across
 * sharing and reporting channels.
 */

import { apiUrl, authFetch } from '@/utils/api';

export const HEX_64_PATTERN = /^[0-9a-fA-F]{64}$/;

export interface ContentManifest {
  content_type: string;
  content_hash: string;
  author_id: number;
  author_login: string;
  signature: string;
  created_at: string;
}

/** Validates whether an unknown object satisfies the ContentManifest interface. */
export function isContentManifest(value: unknown): value is ContentManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.content_type === 'string' &&
    v.content_type.trim().length > 0 &&
    typeof v.content_hash === 'string' &&
    HEX_64_PATTERN.test(v.content_hash.trim()) &&
    typeof v.author_id === 'number' &&
    Number.isInteger(v.author_id) &&
    v.author_id > 0 &&
    typeof v.author_login === 'string' &&
    v.author_login.trim().length > 0 &&
    typeof v.signature === 'string' &&
    HEX_64_PATTERN.test(v.signature.trim()) &&
    typeof v.created_at === 'string' &&
    v.created_at.trim().length > 0
  );
}

/** Strips any existing `_manifest` property from a document before hash computation or signing. */
export function stripManifest<T extends Record<string, unknown>>(payload: T): Omit<T, '_manifest'> {
  const { _manifest, ...rest } = payload;
  return rest as Omit<T, '_manifest'>;
}

/** Attaches a ContentManifest to a document payload, or strips it if manifest is null. */
export function embedManifest<T extends Record<string, unknown>>(
  payload: T,
  manifest: ContentManifest | null
): T & { _manifest?: ContentManifest } {
  const clean = stripManifest(payload);
  if (!manifest) {
    return clean as T & { _manifest?: ContentManifest };
  }
  return {
    ...clean,
    _manifest: manifest,
  } as T & { _manifest?: ContentManifest };
}

/**
 * Calls `POST /api/v1/content/sign` with credentials: 'include'.
 * Returns ContentManifest on success or null if unauthenticated / request fails.
 */
export async function signExportPayload(
  contentType: string,
  payload: Record<string, unknown>
): Promise<ContentManifest | null> {
  if (!contentType || typeof contentType !== 'string') {
    return null;
  }
  try {
    const cleanPayload = stripManifest(payload);
    const res = await authFetch(apiUrl('/api/v1/content/sign'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: contentType.trim(),
        payload: cleanPayload,
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data: unknown = await res.json();
    if (isContentManifest(data)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
