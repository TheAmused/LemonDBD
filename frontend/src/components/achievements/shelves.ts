// frontend/src/components/achievements/shelves.ts
import type { Dictionary } from '@/locales/types';

export interface TrophyTierDef {
  id: string;
  label: string;
  /** Overrides the auto-generated hover sentence for tiers without a difficulty (e.g. Page Streak). */
  hoverText?: { owned: string; all: string };
}

export interface TrophyShelfDef {
  id: string;
  title: string;
  tiers: TrophyTierDef[];
}

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
