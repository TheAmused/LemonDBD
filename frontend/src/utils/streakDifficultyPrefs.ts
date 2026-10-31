// frontend/src/utils/streakDifficultyPrefs.ts
import type { Difficulty } from '@/types/chaosStreak';
import type { HistoryMode } from '@/types/historyStreak';
import type { GauntletGameMode } from '@/types/gauntletStreak';
import { GAUNTLET_GAME_MODES } from '@/types/gauntletStreak';
import type { IdPleaseDifficulty, IdPleaseLane } from '@/types/idPleaseStreak';
import { ID_PLEASE_DIFFICULTIES } from '@/types/idPleaseStreak';
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';

const CHAOS_DIFFICULTY_KEY = 'lemon_dbd_chaos_streak_difficulty_v1';
const HISTORY_MODE_KEY = 'lemon_dbd_history_streak_mode_v1';
const GAUNTLET_MODE_KEY_PREFIX = 'lemon_dbd_gauntlet_streak_mode_v1';
const ID_PLEASE_DIFFICULTY_KEY_PREFIX = 'lemon_dbd_id_please_difficulty_v2';
const PAGE_STREAK_SEEN_KEY = 'lemon_dbd_page_streak_seen_v1';
const CHALLENGE_ANIMATIONS_KEY = 'lemon_dbd_challenge_animations_v1';

export function getSavedChaosDifficulty(): Difficulty | null {
  const value = safeGetItem(CHAOS_DIFFICULTY_KEY);
  return value === 'easy' || value === 'medium' || value === 'hell' ? value : null;
}

export function saveChaosDifficulty(difficulty: Difficulty) {
  safeSetItem(CHAOS_DIFFICULTY_KEY, difficulty);
}

export function getSavedHistoryMode(): HistoryMode | null {
  const value = safeGetItem(HISTORY_MODE_KEY);
  return value === 'medium' || value === 'hell' ? value : null;
}

export function saveHistoryMode(mode: HistoryMode) {
  safeSetItem(HISTORY_MODE_KEY, mode);
}

/** Each lane remembers its own difficulty. */
export function getSavedIdPleaseDifficulty(lane: IdPleaseLane): IdPleaseDifficulty | null {
  const value = safeGetItem(`${ID_PLEASE_DIFFICULTY_KEY_PREFIX}_${lane}`);
  return ID_PLEASE_DIFFICULTIES.find((d) => d === value) ?? null;
}

export function saveIdPleaseDifficulty(lane: IdPleaseLane, difficulty: IdPleaseDifficulty) {
  safeSetItem(`${ID_PLEASE_DIFFICULTY_KEY_PREFIX}_${lane}`, difficulty);
}

export type GauntletMode = GauntletGameMode;
export type GauntletRole = 'killer' | 'survivor';

export function getSavedGauntletMode(role: GauntletRole): GauntletMode | null {
  const value = safeGetItem(`${GAUNTLET_MODE_KEY_PREFIX}_${role}`);
  return GAUNTLET_GAME_MODES.find((mode) => mode === value) ?? null;
}

export function saveGauntletMode(role: GauntletRole, mode: GauntletMode) {
  safeSetItem(`${GAUNTLET_MODE_KEY_PREFIX}_${role}`, mode);
}

/** Draw animations (reels, slot machine, token roulette) are on unless the player turned them off. */
export function getSavedChallengeAnimations(): boolean {
  return safeGetItem(CHALLENGE_ANIMATIONS_KEY) !== 'off';
}

export function saveChallengeAnimations(enabled: boolean) {
  safeSetItem(CHALLENGE_ANIMATIONS_KEY, enabled ? 'on' : 'off');
}

export function hasSeenPageStreakIntro(): boolean {
  return safeGetItem(PAGE_STREAK_SEEN_KEY) === '1';
}

export function markPageStreakIntroSeen() {
  safeSetItem(PAGE_STREAK_SEEN_KEY, '1');
}

export type StreakRole = 'survivor' | 'killer' | 'challenge';

const LAST_ROLE_KEY = 'lemon_dbd_streaks_last_role_v1';
/** The server redirect from /streaks reads this cookie, so the saved role has to live in a cookie too. */
export const STREAK_ROLE_COOKIE = 'lemon_dbd_streaks_last_role';
const STREAK_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getSavedStreakRole(): StreakRole | null {
  const value = safeGetItem(LAST_ROLE_KEY);
  return value === 'survivor' || value === 'killer' || value === 'challenge' ? value : null;
}

export function saveStreakRole(role: StreakRole) {
  safeSetItem(LAST_ROLE_KEY, role);
  if (typeof document !== 'undefined') {
    document.cookie = `${STREAK_ROLE_COOKIE}=${role}; path=/; max-age=${STREAK_ROLE_COOKIE_MAX_AGE}; samesite=lax`;
  }
}
