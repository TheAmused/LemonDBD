// frontend/src/types/chaos.ts
export type ChaosMutatorType = 'curse' | 'buff';

export interface ChaosMutator {
  id: string;
  name: string;
  description: string;
  type: ChaosMutatorType;
  icon: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  blockedPerkKeywords?: string[];
  effect?: string;
  lines?: [string, string];
  targetRole?: 'Survivor' | 'Killer' | 'both';
}
