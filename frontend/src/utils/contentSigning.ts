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

/** The three kinds of user-made content the moderation system understands. */
export type ModeratedContentType = 'tier_list' | 'smash_roster' | 'minigame';

/** Minigame fields that are hashed. Mirrors the importer's normalisation so every copy hashes alike. */
const MINIGAME_TITLE_MAX = 100;

interface SignableRound {
  round_number?: unknown;
  mode?: unknown;
  target_id?: unknown;
  target_type?: unknown;
  custom_data?: unknown;
  max_attempts?: unknown;
}

interface SignableMinigame {
  title?: unknown;
  description?: unknown;
  game_mode?: unknown;
  rounds?: unknown;
  is_nsfw?: unknown;
}

/**
 * The document that is signed when a minigame is exported and hashed when it is reported.
 *
 * A saved or imported minigame carries storage and import extras (`id`, timestamps, default
 * `custom_data`, renumbered rounds) that the author's copy does not have; hashing the raw object
 * would give every copy a different hash and no report could ever match its signature. Signing and
 * reporting both go through this function, so any copy of the same trial yields the same payload.
 */
export function minigameSigningPayload(challenge: SignableMinigame): Record<string, unknown> {
  const rawRounds = Array.isArray(challenge.rounds) ? (challenge.rounds as SignableRound[]) : [];
  const rounds = rawRounds.map((round, index) => {
    const r = round && typeof round === 'object' ? round : {};
    return {
      round_number: index + 1,
      mode: r.mode,
      ...(typeof r.target_id === 'number' ? { target_id: r.target_id } : {}),
      ...(typeof r.target_type === 'string' ? { target_type: r.target_type } : {}),
      custom_data: r.custom_data && typeof r.custom_data === 'object' ? r.custom_data : {},
      max_attempts: typeof r.max_attempts === 'number' && r.max_attempts > 0 ? r.max_attempts : 6,
    };
  });
  const title = typeof challenge.title === 'string' ? challenge.title.trim().slice(0, MINIGAME_TITLE_MAX) : '';
  return {
    title,
    description: typeof challenge.description === 'string' ? challenge.description.trim() : '',
    game_mode: typeof challenge.game_mode === 'string' && challenge.game_mode ? challenge.game_mode : 'custom',
    rounds,
    // Only a flagged trial carries the key, so every trial signed before the flag existed hashes as before.
    ...(challenge.is_nsfw === true ? { is_nsfw: true } : {}),
  };
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
