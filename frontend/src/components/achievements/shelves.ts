// frontend/src/components/achievements/shelves.ts
import type { Dictionary } from '@/locales/types';

export interface TrophyTierDef {
  /** Stable id, e.g. "chaos_hell" -- not yet wired to any real unlock data. */
  id: string;
  label: string;
  /** Overrides the default "Beat this challenge at {label} difficulty..."
   *  hover sentence -- needed for modes like Page Streak that don't have a
   *  difficulty tier to beat, just an owned-roster/full-roster split. */
  hoverText?: { owned: string; all: string };
}

export interface TrophyShelfDef {
  id: string;
  title: string;
  tiers: TrophyTierDef[];
}

/**
 * Static placeholder layout: one shelf per challenge mode, one trophy tier
 * per difficulty level that mode has. No unlock system reads this yet --
 * every trophy renders as a locked silhouette until real artwork and a
 * completion-status wiring pass happen in a later task.
 */
export function getTrophyShelves(dict?: Dictionary): TrophyShelfDef[] {
  const t = dict?.achievements;
  return [
    {
      id: 'gauntlet',
      title: t?.gauntletShelf || 'Gauntlet',
      tiers: [{ id: 'gauntlet_original', label: t?.originalLabel || 'Original' }],
    },
    {
      id: 'chaos',
      title: t?.chaosShelf || 'Chaos Streak',
      tiers: [
        { id: 'chaos_easy', label: t?.easyLabel || 'Easy' },
        { id: 'chaos_medium', label: t?.mediumLabel || 'Medium' },
        { id: 'chaos_hell', label: t?.hellLabel || 'Hell' },
      ],
    },
    {
      id: 'history',
      title: t?.historyShelf || 'History Streak',
      tiers: [
        { id: 'history_medium', label: t?.mediumLabel || 'Medium' },
        { id: 'history_hell', label: t?.hellLabel || 'Hell' },
      ],
    },
    {
      id: 'page_streak',
      title: t?.pageStreakShelf || 'Page Streak',
      tiers: [
        {
          id: 'page_streak_all_killers',
          label: t?.allKillersLabel || 'All Killers',
          hoverText: {
            owned: t?.pageStreakOwnedHover || 'Complete a full Page Streak run with every killer you own.',
            all: t?.pageStreakAllHover || 'Complete a full Page Streak run with every killer in the game.',
          },
        },
      ],
    },
  ];
}
