// frontend/src/utils/contentPayload.ts
/**
 * The single definition of "the document that gets hashed" for user-made content.
 *
 * The server signs (at export) and compares (at report) the SHA-256 of one canonical JSON document.
 * Every copy of the same list, roster or trial must therefore produce the same document no matter
 * how it travelled: the author's storage, a JSON file, a share link, a recipient's storage after
 * import. Each type is run through its own import sanitiser, which is deterministic and idempotent,
 * so both ends reach the same shape. Anything the sanitiser refuses falls back to the raw document
 * (minus its author stamp) on both ends alike.
 */
import { minigameSigningPayload, stripManifest } from '@/utils/contentSigning';
import { validateSmashRosterDocument } from '@/utils/smashOrPass/codec';
import { validateTierListDocument } from '@/utils/tierLists/codec';
import { isRecord } from '@/utils/shareCodec';

export function signingPayload(contentType: string, doc: unknown): Record<string, unknown> {
  if (!isRecord(doc)) return {};
  const clean = stripManifest(doc);
  switch (contentType) {
    case 'tier_list': {
      const result = validateTierListDocument(clean);
      return result.ok ? stripManifest(result.doc as unknown as Record<string, unknown>) : clean;
    }
    case 'smash_roster': {
      const result = validateSmashRosterDocument(clean);
      return result.ok ? stripManifest(result.doc as unknown as Record<string, unknown>) : clean;
    }
    case 'minigame':
      return minigameSigningPayload(clean);
    default:
      return clean;
  }
}
