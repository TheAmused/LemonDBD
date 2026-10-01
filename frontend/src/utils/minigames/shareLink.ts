// frontend/src/utils/minigames/shareLink.ts
//
// Share links for custom minigame challenges. The challenge travels inside the
// URL fragment (`/minigames/play#c=z....`), which browsers never send to a
// server, so nothing about a shared challenge is stored or even seen by us.

import type { ChallengeDefinition } from '@/types/minigame';
import { decodeShareText, encodeShareText } from '@/utils/shareCodec';
import { importChallengeFromJson } from '@/utils/minigames/jsonExportImport';

export const MINIGAME_SHARE_PARAM = 'c';
/** Longest payload we accept when opening a link (20 rounds fit comfortably). */
export const MAX_MINIGAME_SHARE_CHARS = 60_000;

export async function encodeChallengeShare(challenge: ChallengeDefinition): Promise<string> {
  return encodeShareText(
    JSON.stringify({
      title: challenge.title,
      description: challenge.description || '',
      game_mode: challenge.game_mode || 'custom',
      rounds: challenge.rounds,
    })
  );
}

export function buildChallengeShareUrl(origin: string, payload: string): string {
  return `${origin}/minigames/play#${MINIGAME_SHARE_PARAM}=${payload}`;
}

/** Reads the payload out of a `location.hash`, or null when the link carries none. */
export function readChallengeFragment(hash: string): string | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get(MINIGAME_SHARE_PARAM);
  return value && value.length > 2 ? value : null;
}

/** Small stable id so progress on a shared challenge is remembered per link. */
function payloadId(payload: string): string {
  let h = 5381;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  return `shared_${(h >>> 0).toString(36)}`;
}

/** Decodes and validates a share payload. Throws an Error with a readable message. */
export async function decodeChallengeShare(payload: string): Promise<ChallengeDefinition> {
  let text: string;
  try {
    const decoded = await decodeShareText(payload, MAX_MINIGAME_SHARE_CHARS);
    if (!decoded.ok) throw new Error('This share link is not valid.');
    text = decoded.text;
  } catch {
    throw new Error('This share link is not valid.');
  }
  const challenge = importChallengeFromJson(text);
  if (challenge.rounds.length > 20) throw new Error('This share link is not valid.');
  return { ...challenge, title: challenge.title.slice(0, 100), id: payloadId(payload) };
}
