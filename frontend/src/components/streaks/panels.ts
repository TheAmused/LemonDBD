// frontend/src/components/streaks/panels.ts
import type { Dictionary } from '@/locales/types';

export interface StreakPanelDef {
  id: string;
  title: string;
  comingSoon?: boolean;
  /** Themed artwork shown as a background watermark on the card. */
  image?: string;
}

/**
 * Returns localized killer streak panel definitions using the provided dictionary.
 */
export function getKillerStreakPanels(dict?: Dictionary): StreakPanelDef[] {
  const t = dict?.streaks;
  return [
    {
      id: 'gauntlet-streak',
      title: t?.gauntletStreakTitle || 'Gauntlet streak',
      image: '/images/streaks/gauntlet-streak.jpg',
    },
    {
      id: 'page-streak',
      title: t?.pageStreakPanelTitle || 'Page streak',
      image: '/images/streaks/page-streak.jpg',
    },
    {
      id: 'history-streak',
      title: t?.historyStreakPanelTitle || 'History streak',
      image: '/images/streaks/history-streak.jpg',
    },
    {
      id: 'chaos-streak',
      title: t?.chaosStreakPanelTitle || 'Chaos streak',
      image: '/images/streaks/chaos-streak.jpg',
    },
    {
      id: 'nice-guy-streak',
      title: t?.niceGuyStreakTitle || 'Nice Guy streak',
      comingSoon: true,
      image: '/images/streaks/nice-guy-streak.jpg',
    },
    {
      id: 'blood-money-streak',
      title: t?.bloodMoneyStreakTitle || 'Blood Money streak',
      comingSoon: true,
      image: '/images/streaks/blood-money-streak.jpg',
    },
  ];
}

/**
 * Returns localized survivor streak panel definitions using the provided dictionary.
 */
export function getSurvivorStreakPanels(dict?: Dictionary): StreakPanelDef[] {
  const t = dict?.streaks;
  return [
    {
      id: 'gauntlet-streak',
      title: t?.gauntletStreakTitle || 'Gauntlet streak',
      image: '/images/streaks/gauntlet-streak.jpg',
    },
    {
      id: 'copycat-streak',
      title: t?.copycatStreakTitle || 'Copycat streak',
      comingSoon: true,
      image: '/images/streaks/copycat-streak.jpg',
    },
  ];
}

/**
 * Returns localized challenge streak panel definitions using the provided dictionary.
 */
export function getChallengeStreakPanels(dict?: Dictionary): StreakPanelDef[] {
  const t = dict?.streaks;
  return [
    {
      id: 'copycat-streak',
      title: t?.copycatStreakTitle || 'Copycat streak',
      comingSoon: true,
      image: '/images/streaks/copycat-streak.jpg',
    },
  ];
}

/**
 * Convenience selector by streak role tab.
 */
export function getStreakPanelsByRole(
  role: 'killer' | 'survivor' | 'challenge',
  dict?: Dictionary
): StreakPanelDef[] {
  switch (role) {
    case 'survivor':
      return getSurvivorStreakPanels(dict);
    case 'challenge':
      return getChallengeStreakPanels(dict);
    case 'killer':
    default:
      return getKillerStreakPanels(dict);
  }
}

/** Static fallbacks for legacy consumers */
export const KILLER_STREAK_PANELS = getKillerStreakPanels();
export const SURVIVOR_STREAK_PANELS = getSurvivorStreakPanels();
export const CHALLENGE_STREAK_PANELS = getChallengeStreakPanels();
