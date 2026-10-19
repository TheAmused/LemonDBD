import { getErrorMessage } from '@/utils/api';
import { downloadFile } from '@/utils/download';
import { sanitizeManifest } from '@/utils/shareCodec';
import type { ChallengeDefinition, RoundConfig, MinigameMode } from '@/types/minigame';

const VALID_MODES: Set<MinigameMode> = new Set([
  'classic_character',
  'classic_killer',
  'classic_perk',
  'realm_guesser',
  'pixel_avatar',
  'perk_icon',
  'killer_power',
  'voice_line',
  'hook_scream',
  'terror_radius',
  'quote_lore',
  'emoji_riddle',
  'addon_guesser',
]);

/**
 * Caps on an imported trial (a file or a share link: untrusted). Over a cap the document is
 * REFUSED rather than trimmed -- trimming would change what the author signed, and the account
 * mark would no longer match.
 */
export const MINIGAME_IMPORT_LIMITS = {
  maxPayloadChars: 200_000,
  maxRounds: 20,
  maxDescription: 1000,
  maxAttempts: 20,
  maxCustomDataKeys: 20,
  maxCustomText: 1000,
  maxCustomList: 20,
} as const;

/** The only audio a trial may point at: this site's own terror-radius stream. */
export const AUDIO_ENDPOINT_PATTERN = /^\/api\/v1\/minigames\/audio\/terror_radius\/\d{1,9}$/;

function checkCustomData(raw: unknown, roundNo: number): RoundConfig['custom_data'] {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Round #${roundNo} has invalid custom data.`);
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MINIGAME_IMPORT_LIMITS.maxCustomDataKeys) throw new Error(`Round #${roundNo} has too much custom data.`);
  for (const [key, value] of entries) {
    const okText = (v: unknown) => typeof v === 'string' && v.length <= MINIGAME_IMPORT_LIMITS.maxCustomText;
    const ok =
      okText(value) ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      typeof value === 'boolean' ||
      (Array.isArray(value) && value.length <= MINIGAME_IMPORT_LIMITS.maxCustomList && value.every(okText));
    if (!ok) throw new Error(`Round #${roundNo} has an invalid "${key.slice(0, 40)}" value.`);
    if (key === 'audio_endpoint' && !AUDIO_ENDPOINT_PATTERN.test(String(value))) {
      throw new Error(`Round #${roundNo} points its audio somewhere other than LemonDBD.`);
    }
  }
  return raw as RoundConfig['custom_data'];
}

export function exportChallengeToJson(challenge: ChallengeDefinition): void {
  if (typeof window === 'undefined') return;

  const exportData = {
    lemondbd_version: '1.0',
    type: 'minigame_challenge',
    exported_at: new Date().toISOString(),
    ...(challenge._manifest ? { _manifest: challenge._manifest } : {}),
    challenge: {
      title: challenge.title,
      description: challenge.description || '',
      game_mode: challenge.game_mode || 'custom',
      ...(challenge.is_nsfw ? { is_nsfw: true } : {}),
      ...(challenge._manifest ? { _manifest: challenge._manifest } : {}),
      rounds: challenge.rounds.map((r, idx) => ({
        round_number: idx + 1,
        mode: r.mode,
        target_id: r.target_id,
        target_type: r.target_type,
        custom_data: r.custom_data || {},
        max_attempts: r.max_attempts || 6,
      })),
    },
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const safeTitle = (challenge.title || 'custom_minigame')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40);

  downloadFile(jsonStr, `lemondbd_challenge_${safeTitle}.json`, 'application/json');
}

interface RawRound {
  mode?: unknown;
  target_id?: unknown;
  target_type?: unknown;
  custom_data?: unknown;
  max_attempts?: unknown;
}

interface RawChallenge {
  title?: unknown;
  description?: unknown;
  game_mode?: unknown;
  rounds?: unknown;
  is_nsfw?: unknown;
  _manifest?: unknown;
}

export function importChallengeFromJson(jsonString: string): ChallengeDefinition {
  if (jsonString.length > MINIGAME_IMPORT_LIMITS.maxPayloadChars) {
    throw new Error('This challenge file is too large.');
  }
  let parsed: (RawChallenge & { challenge?: RawChallenge }) | null;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Invalid JSON format: ${getErrorMessage(err, '')}`);
  }

  const rawChallenge = parsed?.challenge || parsed;

  if (!rawChallenge || typeof rawChallenge !== 'object') {
    throw new Error('Invalid challenge file structure.');
  }

  const title = typeof rawChallenge.title === 'string' && rawChallenge.title.trim()
    ? rawChallenge.title.trim()
    : 'Imported Challenge';

  const description = typeof rawChallenge.description === 'string'
    ? rawChallenge.description.trim()
    : '';
  if (description.length > MINIGAME_IMPORT_LIMITS.maxDescription) {
    throw new Error('The challenge description is too long.');
  }

  const game_mode = typeof rawChallenge.game_mode === 'string' && rawChallenge.game_mode.length <= 50
    ? rawChallenge.game_mode
    : 'custom';

  if (!Array.isArray(rawChallenge.rounds) || rawChallenge.rounds.length === 0) {
    throw new Error('Challenge must contain at least one round in "rounds" array.');
  }
  if (rawChallenge.rounds.length > MINIGAME_IMPORT_LIMITS.maxRounds) {
    throw new Error(`A challenge can have at most ${MINIGAME_IMPORT_LIMITS.maxRounds} rounds.`);
  }

  const validatedRounds: RoundConfig[] = [];

  for (let i = 0; i < rawChallenge.rounds.length; i++) {
    const r = rawChallenge.rounds[i] as RawRound | null;
    if (!r || typeof r !== 'object') {
      throw new Error(`Round #${i + 1} is invalid.`);
    }

    const mode = r.mode as MinigameMode;
    if (!VALID_MODES.has(mode)) {
      throw new Error(
        `Round #${i + 1} has unsupported mode "${mode}". Supported modes are: ${Array.from(VALID_MODES).join(', ')}`
      );
    }

    if (typeof r.max_attempts === 'number' && r.max_attempts > MINIGAME_IMPORT_LIMITS.maxAttempts) {
      throw new Error(`Round #${i + 1} allows too many attempts (at most ${MINIGAME_IMPORT_LIMITS.maxAttempts}).`);
    }
    if (typeof r.target_type === 'string' && r.target_type.length > 20) {
      throw new Error(`Round #${i + 1} has an invalid target type.`);
    }

    validatedRounds.push({
      round_number: i + 1,
      mode,
      target_id: typeof r.target_id === 'number' ? r.target_id : undefined,
      target_type: typeof r.target_type === 'string' ? (r.target_type as RoundConfig['target_type']) : undefined,
      custom_data: checkCustomData(r.custom_data, i + 1),
      max_attempts: typeof r.max_attempts === 'number' && r.max_attempts > 0 ? r.max_attempts : 6,
    });
  }

  const manifest = sanitizeManifest(
    (rawChallenge as Record<string, unknown>)?._manifest ?? (parsed as Record<string, unknown>)?._manifest
  );

  return {
    title,
    description,
    game_mode,
    rounds: validatedRounds,
    ...(rawChallenge.is_nsfw === true ? { is_nsfw: true } : {}),
    ...(manifest ? { _manifest: manifest } : {}),
  };
}
