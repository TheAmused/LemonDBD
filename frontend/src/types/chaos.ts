// frontend/src/types/chaos.ts
import { Perk } from '@/types/perks';

export type ChaosMutatorType = 'curse' | 'buff';

export interface ChaosMutator {
  id: 'no_exhaustion' | 'blindness' | 'meme_loadout' | 'hex_boon_only' | string;
  name: string;
  description: string;
  type: ChaosMutatorType;
  icon: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  blockedPerkKeywords?: string[];
}

export interface WheelWinSlotPayload {
  page: number;
  slot: number;
  perk: Perk;
  mutator?: ChaosMutator;
}
