// frontend/src/components/generator/modes/slot-machine/slotMachineTypes.ts
import type { Perk } from '@/types/perks';

export type MachinePhase = 'idle' | 'spinning' | 'awaiting' | 'complete';

export interface StripCell {
  perk: Perk | null;
  broken?: boolean;
  /** [Page/Slot] coordinate for this cell's perk within the active pool --
   * computed once at strip-build time (same formula as buildDrawnSlots) so
   * every cell can show it, not just the one that ends up locked in. */
  page?: number;
  slot?: number;
}

export interface Reel {
  id: number;
  /** A jammed reel for this whole draw -- always lands on the broken glyph,
   * can never be staged/locked, and stays broken through every respin cycle
   * until a brand-new "Pull the Lever" draw picks fresh broken reels. */
  broken: boolean;
  locked: boolean;
  strip: StripCell[];
  /** The perk this reel is *actually* landing on -- decided the moment the
   * spin starts (matches the classic slot-machine trick of the outcome
   * being fixed before the reel visually stops). null for broken reels. */
  landedPerk: Perk | null;
  /** Current vertical offset of the scrolling strip, in px (0 = reset, TARGET_Y = landed). */
  translateY: number;
  /** Current horizontal offset of the scrolling strip on mobile, in px (0 = reset, TARGET_X = landed). */
  translateX: number;
  /** Bumped every spin so the scrolling strip remounts fresh at
   * translateY(0)/translateX(0) with no transition, instead of visibly rewinding from
   * wherever the last spin left it. */
  spinToken: number;
  spinDurationMs: number;
}
