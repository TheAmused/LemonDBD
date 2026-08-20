// frontend/src/components/streaks/panels.ts
import { BookOpen, Coins, History, Shuffle, Smile, Swords, type LucideIcon } from 'lucide-react';

export interface StreakPanelDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon and title accent. */
  accent: string;
  /** Tailwind border color class for the card. */
  accentBorder: string;
  comingSoon?: boolean;
}

export const KILLER_STREAK_PANELS: StreakPanelDef[] = [
  {
    id: 'gauntlet-streak',
    title: 'Gauntlet streak',
    description:
      'Face a random owned killer with a shrinking perk loadout. Win to raise the streak, lose and fall back to your last checkpoint.',
    icon: Swords,
    accent: 'text-amber-400',
    accentBorder: 'border-amber-500/20',
  },
  {
    id: 'page-streak',
    title: 'Page streak',
    description:
      'Win a round using perks from page 1, then move to page 2, and keep going through all 12 perk pages.',
    icon: BookOpen,
    accent: 'text-orange-400',
    accentBorder: 'border-orange-500/20',
  },
  {
    id: 'history-streak',
    title: 'History streak',
    description: 'A run built around the killer roster in release order.',
    icon: History,
    accent: 'text-slate-400',
    accentBorder: 'border-slate-700/60',
    comingSoon: true,
  },
  {
    id: 'chaos-streak',
    title: 'Chaos streak',
    description: 'Every round randomises 4 perks and 2 addon rarities. You pick which killer plays them.',
    icon: Shuffle,
    accent: 'text-violet-400',
    accentBorder: 'border-violet-500/20',
  },
  {
    id: 'nice-guy-streak',
    title: 'Nice Guy streak',
    description: 'A new challenge mode. Details soon.',
    icon: Smile,
    accent: 'text-emerald-400',
    accentBorder: 'border-emerald-500/20',
    comingSoon: true,
  },
  {
    id: 'blood-money-streak',
    title: 'Blood Money streak',
    description: 'A new challenge mode. Details soon.',
    icon: Coins,
    accent: 'text-rose-400',
    accentBorder: 'border-rose-500/20',
    comingSoon: true,
  },
];

export const SURVIVOR_STREAK_PANELS: StreakPanelDef[] = [
  {
    id: 'gauntlet-streak',
    title: 'Gauntlet streak',
    description:
      'Face a random owned survivor with a shrinking perk loadout. Win to raise the streak, lose and fall back to your last checkpoint.',
    icon: Swords,
    accent: 'text-amber-400',
    accentBorder: 'border-amber-500/20',
  },
];
