// frontend/src/utils/minigames/jsonExportImport.ts
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

export function exportChallengeToJson(challenge: ChallengeDefinition): void {
  if (typeof window === 'undefined') return;

  const exportData = {
    lemondbd_version: '1.0',
    type: 'minigame_challenge',
    exported_at: new Date().toISOString(),
    challenge: {
      title: challenge.title,
      description: challenge.description || '',
      game_mode: challenge.game_mode || 'custom',
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
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeTitle = (challenge.title || 'custom_minigame')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40);

  const a = document.createElement('a');
  a.href = url;
  a.download = `lemondbd_challenge_${safeTitle}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importChallengeFromJson(jsonString: string): ChallengeDefinition {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error(`Invalid JSON format: ${err.message}`);
  }

  const rawChallenge = parsed.challenge || parsed;

  if (!rawChallenge || typeof rawChallenge !== 'object') {
    throw new Error('Invalid challenge file structure.');
  }

  const title = typeof rawChallenge.title === 'string' && rawChallenge.title.trim()
    ? rawChallenge.title.trim()
    : 'Imported Challenge';

  const description = typeof rawChallenge.description === 'string'
    ? rawChallenge.description.trim()
    : '';

  const game_mode = typeof rawChallenge.game_mode === 'string'
    ? rawChallenge.game_mode
    : 'custom';

  if (!Array.isArray(rawChallenge.rounds) || rawChallenge.rounds.length === 0) {
    throw new Error('Challenge must contain at least one round in "rounds" array.');
  }

  const validatedRounds: RoundConfig[] = [];

  for (let i = 0; i < rawChallenge.rounds.length; i++) {
    const r = rawChallenge.rounds[i];
    if (!r || typeof r !== 'object') {
      throw new Error(`Round #${i + 1} is invalid.`);
    }

    const mode = r.mode as MinigameMode;
    if (!VALID_MODES.has(mode)) {
      throw new Error(
        `Round #${i + 1} has unsupported mode "${mode}". Supported modes are: ${Array.from(VALID_MODES).join(', ')}`
      );
    }

    validatedRounds.push({
      round_number: i + 1,
      mode,
      target_id: typeof r.target_id === 'number' ? r.target_id : undefined,
      target_type: typeof r.target_type === 'string' ? r.target_type : undefined,
      custom_data: r.custom_data && typeof r.custom_data === 'object' ? r.custom_data : {},
      max_attempts: typeof r.max_attempts === 'number' && r.max_attempts > 0 ? r.max_attempts : 6,
    });
  }

  return {
    title,
    description,
    game_mode,
    rounds: validatedRounds,
  };
}
