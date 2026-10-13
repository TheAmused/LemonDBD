// frontend/src/components/generator/lib/rollTracking.ts
import type { GeneratorMode, RoleCategory } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import type { AnalyticsEvents } from '@/utils/analytics';

export interface RollSetup {
  mode: GeneratorMode;
  role: RoleCategory;
  blindMode: boolean;
  activeMutator: Pick<ChaosMutator, 'id'> | null;
  noRepeatPerks: boolean;
  audioEnabled: boolean;
}

/** The setup a finished loadout was rolled with, as the `randomizer_roll` event props. */
export function buildRollProps(setup: RollSetup): AnalyticsEvents['randomizer_roll'] {
  return {
    mode: setup.mode,
    role: setup.role === 'Killer' ? 'killer' : 'survivor',
    blind: setup.blindMode,
    curse: setup.activeMutator?.id ?? 'none',
    no_repeat: setup.noRepeatPerks,
    sound: setup.audioEnabled ? 'on' : 'off',
  };
}
