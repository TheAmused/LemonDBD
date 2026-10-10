// frontend/src/components/generator/modes/slot-machine/slotMachineStrip.ts
import type { Perk } from '@/types/perks';
import type { StripCell } from './slotMachineTypes';

export const TICK_INTERVAL_MS = 90;
export const REEL_COUNT = 8;
export const STRIP_FILLER = 20;
export const FINAL_INDEX = STRIP_FILLER;
// Reel cell size is measured off the actual rendered reel area (see
// `reelAreaRef` below) instead of a fixed pixel constant, so the machine
// genuinely fills whatever space the screen gives it -- a tall desktop
// monitor and a short mobile viewport both get reels sized to fit, with no
// leftover dead space and no breakpoint snapping in between.
export const REEL_MIN_PX = 64;
export const REEL_MAX_PX = 190;
export const REEL_GAP_PX = 12;

const PERKS_PER_PAGE = 15;

function randomPerk(pool: Perk[]): Perk | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Same [Page/Slot] formula as buildDrawnSlots -- a perk's coordinate is
 * just its index within the active pool, so any perk (not only a locked
 * one) can be tagged with it. */
function coordFor(perk: Perk | null, pool: Perk[]): { page?: number; slot?: number } {
  if (!perk) return {};
  const indexInPool = pool.findIndex((p) => p.name === perk.name);
  if (indexInPool === -1) return {};
  return {
    page: Math.floor(indexInPool / PERKS_PER_PAGE) + 1,
    slot: (indexInPool % PERKS_PER_PAGE) + 1,
  };
}

function cellFor(perk: Perk | null, pool: Perk[]): StripCell {
  return { perk, ...coordFor(perk, pool) };
}

export function buildStrip(pool: Perk[], landedPerk: Perk | null, broken: boolean, mobile: boolean = false): StripCell[] {
  const finalCell: StripCell = broken ? { perk: null, broken: true } : cellFor(landedPerk, pool);
  if (mobile) {
    // For mobile horizontal spin from LEFT to RIGHT:
    // Window displays 3 cells. Payline is at index 1 (center).
    // translateX starts at -(STRIP_FILLER * cellPx) and animates to 0 (translating to the right!).
    // At translateX = 0, finalCell sits precisely in the center payline.
    const before: StripCell[] = [cellFor(randomPerk(pool), pool)];
    const filler: StripCell[] = Array.from({ length: STRIP_FILLER }, () => cellFor(randomPerk(pool), pool));
    return [...before, finalCell, ...filler];
  } else {
    // Desktop vertical spin down-to-up:
    const filler: StripCell[] = Array.from({ length: STRIP_FILLER }, () => cellFor(randomPerk(pool), pool));
    const after: StripCell[] = Array.from({ length: 2 }, () => cellFor(randomPerk(pool), pool));
    return [...filler, finalCell, ...after];
  }
}
