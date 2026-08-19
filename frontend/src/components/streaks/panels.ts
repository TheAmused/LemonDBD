// frontend/src/components/streaks/panels.ts
import { BookOpen, History, Shuffle, Swords, type LucideIcon } from 'lucide-react';

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
