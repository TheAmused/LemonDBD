// frontend/src/utils/minigames/storage.ts
import type { ChallengeDefinition, ChallengeProgress } from '@/types/minigame';
import { getLocalStorage } from '@/utils/safeStorage';

const CUSTOM_CHALLENGES_KEY = 'lemondbd_custom_minigames';
const PROGRESS_KEY_PREFIX = 'lemondbd_minigame_progress_';
const DAILY_STREAK_KEY = 'lemondbd_minigames_daily_streak';

export function getCustomChallenges(): ChallengeDefinition[] {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOM_CHALLENGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading custom minigames from storage:', err);
    return [];
  }
}

export function saveCustomChallenge(challenge: ChallengeDefinition): ChallengeDefinition {
  const storage = getLocalStorage();
  const id = challenge.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const updated: ChallengeDefinition = {
    ...challenge,
    id,
    created_at: challenge.created_at || now,
    updated_at: now,
  };

  if (!storage) return updated;

  try {
    const list = getCustomChallenges();
    const index = list.findIndex((c) => String(c.id) === String(id));
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    storage.setItem(CUSTOM_CHALLENGES_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving custom minigame to storage:', err);
  }

  return updated;
}

export function deleteCustomChallenge(id: string | number): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    const list = getCustomChallenges();
    const filtered = list.filter((c) => String(c.id) !== String(id));
    storage.setItem(CUSTOM_CHALLENGES_KEY, JSON.stringify(filtered));
    clearChallengeProgress(id);
  } catch (err) {
    console.error('Error deleting custom minigame from storage:', err);
  }
}

export function getChallengeProgress(challengeId: string | number): ChallengeProgress | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${PROGRESS_KEY_PREFIX}${challengeId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ChallengeProgress;
  } catch (err) {
    console.error('Error reading challenge progress:', err);
    return null;
  }
}

export function saveChallengeProgress(progress: ChallengeProgress): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(
      `${PROGRESS_KEY_PREFIX}${progress.challengeId}`,
      JSON.stringify(progress)
    );
  } catch (err) {
    console.error('Error saving challenge progress:', err);
  }
}

export function clearChallengeProgress(challengeId: string | number): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${PROGRESS_KEY_PREFIX}${challengeId}`);
  } catch (err) {
    console.error('Error clearing challenge progress:', err);
  }
}

export interface DailyStreakData {
  currentStreak: number;
  maxStreak: number;
  lastCompletedDate: string | null;
}

export function getDailyStreak(): DailyStreakData {
  const storage = getLocalStorage();
  if (!storage) {
    return { currentStreak: 0, maxStreak: 0, lastCompletedDate: null };
  }
  try {
    const raw = storage.getItem(DAILY_STREAK_KEY);
    if (!raw) return { currentStreak: 0, maxStreak: 0, lastCompletedDate: null };
    return JSON.parse(raw) as DailyStreakData;
  } catch {
    return { currentStreak: 0, maxStreak: 0, lastCompletedDate: null };
  }
}

function parseDateDays(d: string): number {
  const parts = d.split('-').map(Number);
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / (1000 * 60 * 60 * 24));
}

export function recordDailyCompletion(dateStr: string): DailyStreakData {
  const current = getDailyStreak();
  if (current.lastCompletedDate === dateStr) {
    return current;
  }

  let newCurrentStreak = 1;
  if (current.lastCompletedDate) {
    const prevDays = parseDateDays(current.lastCompletedDate);
    const targetDays = parseDateDays(dateStr);
    const diffDays = targetDays - prevDays;

    if (diffDays === 1) {
      newCurrentStreak = current.currentStreak + 1;
    } else if (diffDays === 0) {
      newCurrentStreak = current.currentStreak;
    }
  }

  const newMaxStreak = Math.max(current.maxStreak, newCurrentStreak);
  const updated: DailyStreakData = {
    currentStreak: newCurrentStreak,
    maxStreak: newMaxStreak,
    lastCompletedDate: dateStr,
  };

  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(DAILY_STREAK_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving daily streak:', err);
    }
  }

  return updated;
}

export function recordDailyLoss(dateStr: string): DailyStreakData {
  const current = getDailyStreak();
  const updated: DailyStreakData = {
    currentStreak: 0,
    maxStreak: current.maxStreak,
    lastCompletedDate: dateStr,
  };

  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(DAILY_STREAK_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving daily loss:', err);
    }
  }

  return updated;
}

