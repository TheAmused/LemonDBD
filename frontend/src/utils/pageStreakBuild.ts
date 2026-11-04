// frontend/src/utils/pageStreakBuild.ts
// The build being put together on a Page Streak page, kept in localStorage so a refresh does not lose it.

/** The four build slots in order; a slot stays where it is when another one is emptied. */
export interface PageStreakBuild {
  slots: (string | null)[];
  /** The build was locked in and the match is being played. */
  confirmed: boolean;
}

const BUILD_KEY_PREFIX = 'lemon_dbd_page_streak_build_v1_';

export const pageStreakBuildStorageKey = (killer: string): string => `${BUILD_KEY_PREFIX}${killer}`;

export const emptyPageStreakBuild = (size: number): PageStreakBuild => ({
  slots: Array.from({ length: size }, () => null),
  confirmed: false,
});

export const pickedPerks = (build: PageStreakBuild): string[] =>
  build.slots.filter((name): name is string => name !== null);

/** Puts the perk in the first empty slot, or takes it out of the slot it holds. Nothing moves otherwise. */
export function togglePerk(build: PageStreakBuild, name: string): PageStreakBuild {
  const held = build.slots.indexOf(name);
  if (held >= 0) return { ...build, slots: build.slots.map((slot, index) => (index === held ? null : slot)) };
  const free = build.slots.indexOf(null);
  if (free < 0) return build;
  return { ...build, slots: build.slots.map((slot, index) => (index === free ? name : slot)) };
}

export function serializePageStreakBuild(key: string, build: PageStreakBuild): string {
  return JSON.stringify({ key, slots: build.slots, confirmed: build.confirmed });
}

/**
 * The saved build for this page and attempt, or an empty one. What was saved for any other page or attempt,
 * or does not fit the page's perks (a changed pool, a hand-edited value), is ignored.
 */
export function readPageStreakBuild(raw: string | null, key: string, pagePerks: readonly string[], size: number): PageStreakBuild {
  const empty = emptyPageStreakBuild(size);
  if (raw === null) return empty;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof saved !== 'object' || saved === null) return empty;
  const { key: savedKey, slots, confirmed } = saved as Record<string, unknown>;
  if (savedKey !== key || !Array.isArray(slots) || slots.length !== size) return empty;
  const names = new Set<string>();
  for (const slot of slots) {
    if (slot === null) continue;
    if (typeof slot !== 'string' || !pagePerks.includes(slot) || names.has(slot)) return empty;
    names.add(slot);
  }
  // A locked build is always a full one.
  return { slots: slots as (string | null)[], confirmed: confirmed === true && names.size === size };
}
