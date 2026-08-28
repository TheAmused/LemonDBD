// frontend/src/components/streaks/panels.ts
import {
  BookOpen,
  Cat,
  Coins,
  History,
  Shuffle,
  Smile,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PanelColor } from './panelColors';

export interface StreakPanelDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon and title accent. */
  accent: string;
  /** Tailwind border color class for the card. */
  accentBorder: string;
  /** Color family driving this panel's hover and focus states, matching its accent. */
  color: PanelColor;
  comingSoon?: boolean;
  /** Themed artwork shown on the card badge and as a background watermark; falls back to `icon` when absent. */
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
      description:
        t?.gauntletIntroKiller ||
        'Face a random owned killer with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.',
      icon: Swords,
      accent: 'text-amber-400',
      accentBorder: 'border-amber-500/20',
      color: 'amber',
      image: '/images/streaks/gauntlet-streak.jpg',
    },
    {
      id: 'page-streak',
      title: t?.pageStreakPanelTitle || 'Page streak',
      description:
        t?.pageStreakPanelDesc ||
        'Win a round using perks from page 1, then move to page 2, and keep going through all 12 perk pages.',
      icon: BookOpen,
      accent: 'text-orange-400',
      accentBorder: 'border-orange-500/20',
      color: 'orange',
      image: '/images/streaks/page-streak.jpg',
    },
    {
      id: 'history-streak',
      title: t?.historyStreakPanelTitle || 'History streak',
      description:
        t?.historyStreakPanelDesc ||
        'A run built around the killer roster in release order.',
      icon: History,
      accent: 'text-slate-400',
      accentBorder: 'border-slate-700/60',
      color: 'slate',
      image: '/images/streaks/history-streak.jpg',
    },
    {
      id: 'chaos-streak',
      title: t?.chaosStreakPanelTitle || 'Chaos streak',
      description:
        t?.chaosStreakPanelDesc ||
        'Every round randomises 4 perks and 2 addon rarities. You pick which killer plays them.',
      icon: Shuffle,
      accent: 'text-violet-400',
      accentBorder: 'border-violet-500/20',
      color: 'violet',
      image: '/images/streaks/chaos-streak.jpg',
    },
    {
      id: 'nice-guy-streak',
      title: t?.niceGuyStreakTitle || 'Nice Guy streak',
      description: t?.niceGuyStreakDesc || 'A new challenge mode. Details soon.',
      icon: Smile,
      accent: 'text-emerald-400',
      accentBorder: 'border-emerald-500/20',
      color: 'emerald',
      comingSoon: true,
      image: '/images/streaks/nice-guy-streak.jpg',
    },
    {
      id: 'blood-money-streak',
      title: t?.bloodMoneyStreakTitle || 'Blood Money streak',
      description: t?.bloodMoneyStreakDesc || 'A new challenge mode. Details soon.',
      icon: Coins,
      accent: 'text-rose-400',
      accentBorder: 'border-rose-500/20',
      color: 'rose',
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
      description:
        t?.gauntletIntroSurvivor ||
        'Face a random owned survivor with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.',
      icon: Swords,
      accent: 'text-amber-400',
      accentBorder: 'border-amber-500/20',
      color: 'amber',
      image: '/images/streaks/gauntlet-streak.jpg',
    },
    {
      id: 'copycat-streak',
      title: t?.copycatStreakTitle || 'Copycat streak',
      description:
        t?.copycatSurvivorDesc ||
        'Shortened, survivor only version of Copycat streak. Details soon.',
      icon: Cat,
      accent: 'text-sky-400',
      accentBorder: 'border-sky-500/20',
      color: 'sky',
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
      description:
        t?.copycatChallengeDesc ||
        'Full version of Copycat streak, mixing killer and survivor picks together. Details soon.',
      icon: Cat,
      accent: 'text-cyan-400',
      accentBorder: 'border-cyan-500/20',
      color: 'cyan',
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