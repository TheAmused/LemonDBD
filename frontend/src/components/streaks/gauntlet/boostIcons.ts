// frontend/src/components/streaks/gauntlet/boostIcons.ts
import { Crosshair, Shuffle, Plus, Shield, type LucideIcon } from 'lucide-react';
import type { BoostPrices } from '@/types/gauntletStreak';

/** One icon per boost, shared by the boost buttons and the rules so a boost looks the same everywhere. */
export const BOOST_ICONS: Record<keyof BoostPrices, LucideIcon> = {
  reroll: Shuffle,
  pick: Crosshair,
  slot: Plus,
  shield: Shield,
};
