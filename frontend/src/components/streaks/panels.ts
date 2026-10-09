// frontend/src/components/streaks/panels.ts
import type { Dictionary } from '@/locales/types';

export interface StreakPanelDef {
  id: string;
  title: string;
  comingSoon?: boolean;
  /** Themed artwork shown as a background watermark on the card. */
  image?: string;
  /** Who came up with the challenge; shown under the title. */
  creator?: string;
}

/**
 * Returns localized killer streak panel definitions using the provided dictionary.
 */
export function getKillerStreakPanels(dict: Dictionary): StreakPanelDef[] {
  const t = dict.streaks;
  return [
    {
      id: 'gauntlet-streak',
      title: t.gauntletStreakTitle,
      image: '/images/streaks/gauntlet-streak.webp',
      creator: 'Zerbs',
    },
    {
      id: 'page-streak',
      title: t.pageStreakPanelTitle,
      image: '/images/streaks/page-streak.webp',
      creator: 'LemonDBD',
    },
    {
      id: 'history-streak',
      title: t.historyStreakPanelTitle,
      image: '/images/streaks/history-streak.webp',
      creator: 'LemonDBD',
    },
    {
      id: 'chaos-streak',
      title: t.chaosStreakPanelTitle,
      image: '/images/streaks/chaos-streak.webp',
      creator: 'Otzdarva',
    },
    {
      id: 'nice-guy-streak',
      title: t.niceGuyStreakTitle,
      comingSoon: true,
      image: '/images/streaks/nice-guy-streak.webp',
      creator: 'Otzdarva',
    },
    {
      id: 'blood-money-streak',
      title: t.bloodMoneyStreakTitle,
      comingSoon: true,
      image: '/images/streaks/blood-money-streak.webp',
      creator: 'SpookyLoopz',
    },
  ];
}

/**
 * Returns localized survivor streak panel definitions using the provided dictionary.
 */
export function getSurvivorStreakPanels(dict: Dictionary): StreakPanelDef[] {
  const t = dict.streaks;
  return [
    {
      id: 'gauntlet-streak',
      title: t.gauntletStreakTitle,
      image: '/images/streaks/gauntlet-streak.webp',
      creator: 'Zerbs',
    },
    {
      id: 'copycat-streak',
      title: t.copycatStreakTitle,
      comingSoon: true,
      image: '/images/streaks/copycat-streak.webp',
      creator: 'KnightLight',
    },
  ];
}

/**
 * Returns localized challenge streak panel definitions using the provided dictionary.
 */
export function getChallengeStreakPanels(dict: Dictionary): StreakPanelDef[] {
  const t = dict.streaks;
  return [
    {
      id: 'copycat-streak',
      title: t.copycatStreakTitle,
      comingSoon: true,
      image: '/images/streaks/copycat-streak.webp',
      creator: 'KnightLight',
    },
  ];
}

