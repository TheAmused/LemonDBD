// frontend/src/components/streaks/gauntlet/boostIcons.ts
import { Crosshair, Dice1, Plus, Shield, type LucideIcon } from 'lucide-react';
import type { BoostPrices } from '@/types/gauntletStreak';

/** One icon per boost, shared by the boost buttons and the rules so a boost looks the same everywhere. */
export const BOOST_ICONS: Record<keyof BoostPrices, LucideIcon> = {
  reroll: Dice1,
  pick: Crosshair,
  slot: Plus,
  shield: Shield,
};
