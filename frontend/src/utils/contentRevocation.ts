// frontend/src/utils/contentRevocation.ts
/**
 * Ask the server whether a document has been banned by moderators.
 *
 * The server hashes the document itself, so this works for signed and unsigned copies alike and
 * cannot be dodged by stripping the author stamp. A failed or slow request counts as "not revoked":
 * moderation must never make importing or playing unusable while the API is down (the signed-copy
 * sweep in `useContentRevocationSync` still removes banned items on the next page load).
 */
import { apiUrl } from '@/utils/api';
import { signingPayload } from '@/utils/contentPayload';

const REVOCATION_CHECK_TIMEOUT_MS = 4000;

export interface DocumentCheck {
  revoked: boolean;
  /** Whether the server verified the creator signature; null when the server could not be asked. */
  signed: boolean | null;
}

/**
 * Ask the server about a document that is about to be imported or opened: is it banned, and does it
 * carry a genuine creator signature for exactly this content? The signature is checked server-side
 * (HMAC), so an unsigned, edited or forged document comes back `signed: false`. Like the ban check,
 * an unreachable server answers `signed: null`, which callers must treat as "do not block".
 */
export async function checkDocument(contentType: string, doc: unknown): Promise<DocumentCheck> {
  const payload = signingPayload(contentType, doc);
  if (Object.keys(payload).length === 0) return { revoked: false, signed: null };
  const manifest = typeof doc === 'object' && doc !== null ? (doc as { _manifest?: unknown })._manifest : undefined;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REVOCATION_CHECK_TIMEOUT_MS) : null;
  try {
    const res = await fetch(apiUrl('/api/v1/content/revocations/check-document'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, manifest }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return { revoked: false, signed: null };
    const data = (await res.json()) as { revoked?: unknown; signed?: unknown };
    return { revoked: data?.revoked === true, signed: typeof data?.signed === 'boolean' ? data.signed : null };
  } catch {
    return { revoked: false, signed: null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function isDocumentRevoked(contentType: string, doc: unknown): Promise<boolean> {
  return (await checkDocument(contentType, doc)).revoked;
}
