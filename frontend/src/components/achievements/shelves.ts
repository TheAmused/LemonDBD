// frontend/src/components/achievements/shelves.ts
import type { Dictionary } from '@/locales/types';

export interface TrophyTierDef {
  /** Stable id, e.g. "chaos_hell" -- not yet wired to any real unlock data. */
  id: string;
  label: string;
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
  ];
}
