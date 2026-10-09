// frontend/src/utils/perkSlots.ts
import type { TierInfo } from '@/types/gauntletStreak';

/** Slots a tier fills on its own: its perk limit, or the one dealt perk on a perkless tier. Mirrors the backend's base_perk_slots. */
export function baseSlots(tier: TierInfo): number {
  return Math.max(tier.perk_limit, tier.random_perk_count);
}

/** True while one more bought slot still fits under the cap. */
export function canAddSlot(tier: TierInfo, bonusSlots: number, maxSlots: number): boolean {
  return baseSlots(tier) + bonusSlots < maxSlots;
}
