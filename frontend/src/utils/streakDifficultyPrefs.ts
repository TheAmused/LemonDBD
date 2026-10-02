// frontend/src/utils/streakDifficultyPrefs.ts
import { Difficulty } from '@/types/chaosStreak';
import { HistoryMode } from '@/types/historyStreak';
import { GAUNTLET_GAME_MODES, GauntletGameMode } from '@/types/gauntletStreak';
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';

const CHAOS_DIFFICULTY_KEY = 'lemon_dbd_chaos_streak_difficulty_v1';
const HISTORY_MODE_KEY = 'lemon_dbd_history_streak_mode_v1';
const GAUNTLET_MODE_KEY_PREFIX = 'lemon_dbd_gauntlet_streak_mode_v1';
const PAGE_STREAK_SEEN_KEY = 'lemon_dbd_page_streak_seen_v1';

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

export type GauntletMode = GauntletGameMode;
export type GauntletRole = 'killer' | 'survivor';

export function getSavedGauntletMode(role: GauntletRole): GauntletMode | null {
  const value = safeGetItem(`${GAUNTLET_MODE_KEY_PREFIX}_${role}`);
  return GAUNTLET_GAME_MODES.find((mode) => mode === value) ?? null;
}

export function saveGauntletMode(role: GauntletRole, mode: GauntletMode) {
  safeSetItem(`${GAUNTLET_MODE_KEY_PREFIX}_${role}`, mode);
}

export function hasSeenPageStreakIntro(): boolean {
  return safeGetItem(PAGE_STREAK_SEEN_KEY) === '1';
}

export function markPageStreakIntroSeen() {
  safeSetItem(PAGE_STREAK_SEEN_KEY, '1');
}

export type StreakRole = 'survivor' | 'killer' | 'challenge';

const LAST_ROLE_KEY = 'lemon_dbd_streaks_last_role_v1';

export function getSavedStreakRole(): StreakRole | null {
  const value = safeGetItem(LAST_ROLE_KEY);
  return value === 'survivor' || value === 'killer' || value === 'challenge' ? value : null;
}

export function saveStreakRole(role: StreakRole) {
  safeSetItem(LAST_ROLE_KEY, role);
}
