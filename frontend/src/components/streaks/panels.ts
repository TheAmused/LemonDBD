import { BookOpen, History, Shuffle, type LucideIcon } from 'lucide-react';

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
    description: 'A run where every match randomises your loadout.',
    icon: Shuffle,
    accent: 'text-slate-400',
    accentBorder: 'border-slate-700/60',
    comingSoon: true,
  },
];
