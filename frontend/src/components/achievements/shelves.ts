// frontend/src/components/achievements/shelves.ts
import type { Dictionary } from '@/locales/types';
import { ID_PLEASE_BADGE_STREAK, ID_PLEASE_LANES, ID_PLEASE_MODE_BY_LANE } from '@/types/idPleaseStreak';
import { formatMessage } from '@/utils/i18nFormat';

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
    ...ID_PLEASE_LANES.map((lane) => ({
      id: ID_PLEASE_MODE_BY_LANE[lane],
      title: { mixed: t.idPleaseShelf, survivor: dict.streaks.idPleaseSurvivorTitle, killer: dict.streaks.idPleaseKillerTitle }[lane],
      tiers: ([
        ['milestones', dict.streaks.idPleaseMilestonesLabel],
        ['hardcore', dict.streaks.idPleaseHardcoreLabel],
        ['hardcore_plus', dict.streaks.idPleaseHardcorePlusLabel],
      ] as const).map(([difficulty, label]) => {
        // A win streak everywhere, except single-side Milestones: a win with every character of its side.
        const hover =
          lane === 'mixed' || difficulty !== 'milestones'
            ? formatMessage(t.idPleaseHover, { streak: ID_PLEASE_BADGE_STREAK[difficulty], difficulty: label })
            : formatMessage(t.idPleaseEveryCharacterHover, { side: lane === 'killer' ? dict.streaks.killer : dict.streaks.survivor, difficulty: label });
        return { id: `${ID_PLEASE_MODE_BY_LANE[lane]}_${difficulty}`, label, hoverText: { owned: hover, all: hover } };
      }),
    })),
  ];
}
