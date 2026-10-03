// frontend/src/utils/streakStatEffects.ts

export type StatFlash = 'win' | 'record' | 'loss' | null;

export interface StreakStatSnapshot {
  current: number;
  best: number;
}

export interface StreakStatEffects {
  /** True while the running streak is the record itself (it raised `best` and has not broken since). */
  record: boolean;
  /** True on the update where a win raised `best`. */
  burst: boolean;
  /** What happened to `current` on this update. */
  flash: StatFlash;
}

/** The record state a header starts in: a streak already sitting on `best` counts as the record run. */
export function initialRecord({ current, best }: StreakStatSnapshot): boolean {
  return current > 0 && current === best;
}

/**
 * Works out which effects a change of the Current / Best tiles should trigger.
 * The first win of a first run raises `best` from 0, so it counts as a record. Afterwards a
 * record only starts once the streak beats the previous best, and ends when the streak breaks.
 */
export function deriveStreakStatEffects(
  before: StreakStatSnapshot,
  after: StreakStatSnapshot,
  wasRecord: boolean
): StreakStatEffects {
  const bestRaised = after.best > before.best;
  const record = bestRaised ? true : after.current < after.best ? false : wasRecord;
  let flash: StatFlash = null;
  if (after.current > before.current) flash = bestRaised ? 'record' : 'win';
  else if (after.current < before.current) flash = 'loss';
  return { record: record && after.current > 0, burst: bestRaised && after.current > before.current, flash };
}
