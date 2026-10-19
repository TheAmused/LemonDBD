// frontend/src/utils/minigames/roundAnswers.ts
// Pure helpers for ChallengeRunner: what a round asks the player to guess, and the answer's name.
import type { GuessEvaluationResult, MinigameCatalog, RoundConfig, TargetType } from '@/types/minigame';
import { formatMessage } from '@/utils/i18nFormat';

export type RevealedAnswer = NonNullable<GuessEvaluationResult['answer']>;

/** Which catalog the autocomplete searches for this round. */
export function guessTargetType(round: RoundConfig): TargetType {
  const mode = round.mode as string;
  if (mode === 'realm_guesser' || mode === 'realm') return 'realm';
  if (['classic_perk', 'perk_icon', 'perk_distortion', 'perk'].includes(mode)) return 'perk';
  if (['classic_killer', 'killer_power', 'power', 'terror_radius', 'audio'].includes(mode)) return 'killer';
  if (mode === 'quote_lore' || mode === 'quote') return (round.target_type as TargetType) || 'character';
  if (['classic_character', 'classic', 'pixel_avatar', 'pixel', 'voice_line', 'hook_scream', 'emoji_riddle'].includes(mode)) {
    return 'character';
  }
  return (round.target_type as TargetType) || 'character';
}

export interface AnswerLabels {
  unknownAnswer: string;
  answerFallback: { realm: string; perk: string; character: string };
}

/**
 * The answer's display name: from what the server revealed for the round (official rounds never
 * ship their answer), else from the round itself (custom trials).
 */
export function answerName(
  round: RoundConfig,
  catalog: MinigameCatalog,
  labels: AnswerLabels,
  revealed?: RevealedAnswer
): string {
  const mode = round.mode as string;
  const tId = revealed?.target_id ?? round.target_id;
  const tType = (revealed?.target_type as RoundConfig['target_type']) ?? round.target_type;
  if (!tId) return labels.unknownAnswer;

  if (mode === 'realm_guesser' || tType === 'realm') {
    const found = (catalog.realms || []).find((r) => r.id === tId);
    return found ? found.name : formatMessage(labels.answerFallback.realm, { id: tId });
  }
  if (['classic_perk', 'perk_icon', 'perk_distortion'].includes(mode) || tType === 'perk') {
    const found = (catalog.perks || []).find((p) => p.id === tId);
    return found ? found.name : formatMessage(labels.answerFallback.perk, { id: tId });
  }
  const allChars = (catalog.killers || []).concat(catalog.survivors || []);
  const match =
    allChars.find((c) => c.id === tId && (!tType || c.role?.toLowerCase() === tType?.toLowerCase())) ||
    allChars.find((c) => c.id === tId);
  return match ? match.name : formatMessage(labels.answerFallback.character, { id: tId });
}
