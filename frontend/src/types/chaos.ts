// frontend/src/types/chaos.ts
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
