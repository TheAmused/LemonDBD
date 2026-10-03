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

export function getTrophyShelves(dict: Dictionary): TrophyShelfDef[] {
  const t = dict.achievements;
  return [
    {
      id: 'gauntlet',
      title: t.gauntletShelf,
      tiers: [{ id: 'gauntlet_original', label: t.originalLabel }],
    },
    {
      id: 'chaos',
      title: t.chaosShelf,
      tiers: [
        { id: 'chaos_easy', label: t.easyLabel },
        { id: 'chaos_medium', label: t.mediumLabel },
        { id: 'chaos_hell', label: t.hellLabel },
      ],
    },
    {
      id: 'history',
      title: t.historyShelf,
      tiers: [
        { id: 'history_medium', label: t.mediumLabel },
        { id: 'history_hell', label: t.hellLabel },
      ],
    },
    {
      id: 'page_streak',
      title: t.pageStreakShelf,
      tiers: [
        {
          id: 'page_streak_all_killers',
          label: t.allKillersLabel,
          hoverText: {
            owned: t.pageStreakOwnedHover,
            all: t.pageStreakAllHover,
          },
        },
      ],
    },
  ];
}
