// frontend/src/utils/streakDifficultyPrefs.ts
import { Difficulty } from '@/types/chaosStreak';
import { HistoryMode } from '@/types/historyStreak';

const CHAOS_DIFFICULTY_KEY = 'lemon_dbd_chaos_streak_difficulty_v1';
const HISTORY_MODE_KEY = 'lemon_dbd_history_streak_mode_v1';
const GAUNTLET_MODE_KEY = 'lemon_dbd_gauntlet_streak_mode_v1';
const PAGE_STREAK_SEEN_KEY = 'lemon_dbd_page_streak_seen_v1';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function getSavedChaosDifficulty(): Difficulty | null {
  const value = safeGet(CHAOS_DIFFICULTY_KEY);
  return value === 'easy' || value === 'medium' || value === 'hell' ? value : null;
}

export function saveChaosDifficulty(difficulty: Difficulty) {
  safeSet(CHAOS_DIFFICULTY_KEY, difficulty);
}

export function getSavedHistoryMode(): HistoryMode | null {
  const value = safeGet(HISTORY_MODE_KEY);
  return value === 'medium' || value === 'hell' ? value : null;
}

export function saveHistoryMode(mode: HistoryMode) {
  safeSet(HISTORY_MODE_KEY, mode);
}

export type GauntletMode = 'original' | 'lemon';

export function getSavedGauntletMode(): GauntletMode | null {
  const value = safeGet(GAUNTLET_MODE_KEY);
  return value === 'original' || value === 'lemon' ? value : null;
}

export function saveGauntletMode(mode: GauntletMode) {
  safeSet(GAUNTLET_MODE_KEY, mode);
}

export function hasSeenPageStreakIntro(): boolean {
  return safeGet(PAGE_STREAK_SEEN_KEY) === '1';
}

export function markPageStreakIntroSeen() {
  safeSet(PAGE_STREAK_SEEN_KEY, '1');
}
