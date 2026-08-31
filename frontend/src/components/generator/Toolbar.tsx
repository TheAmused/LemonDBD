'use client';

import React from 'react';
import { Repeat, Volume2, VolumeX, RotateCcw, EyeOff } from 'lucide-react';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { IconToggleButton } from './shared/IconToggleButton';
import { Tooltip } from '@/components/common/Tooltip';

export interface ToolbarProps {
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  /** Perks still playable right now (post No-Repeat exclusion) -- the "X"
   * of the X/N badge shown on the No-Repeat button while it's active. */
  playableCount: number;
  /** Total perks owned for this role -- the "N" of that same badge. */
  ownedCount: number;
  blindMode: boolean;
  onToggleBlindMode: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
  dict?: Dictionary;
}

/** Bare row of icon toggle buttons -- no wrapping banner/border/background.
 * Floats directly in the stage's top-right corner (see StageFrame's
 * `topRight` slot), each button supplying its own shape/accent. */
export const Toolbar: React.FC<ToolbarProps> = ({
  noRepeatPerks,
  onToggleNoRepeat,
  playableCount,
  ownedCount,
  blindMode,
  onToggleBlindMode,
  audioEnabled,
  onToggleAudio,
  onOpenChaosModal,
  activeMutator,
  onResetAll,
  dict,
}) => {
  return (
    <>
        <Tooltip
          title={dict?.generator?.noRepeatTooltipTitle || 'No-Repeat Perks'}
          description={
            noRepeatPerks
              ? dict?.generator?.noRepeatTooltipDescOn || 'On -- perks you already drew stay out of the pool until you reset them.'
              : dict?.generator?.noRepeatTooltipDescOff || 'Off -- every draw pulls from the full pool, repeats and all.'
          }
        >
          <IconToggleButton
            icon={<Repeat className="h-5 w-5" />}
            label={dict?.generator?.noRepeatTooltip || 'Toggle No-Repeat Perks'}
            isActive={noRepeatPerks}
            badge={noRepeatPerks ? `${playableCount}/${ownedCount}` : undefined}
            onClick={onToggleNoRepeat}
            tone="cyan"
          />
        </Tooltip>

        <Tooltip
          title={dict?.generator?.blindModeTooltipTitle || 'Blind Mode'}
          description={dict?.generator?.blindModeTooltipDesc || "Hides every perk icon behind a '?' until you tap a slot to reveal it in-run."}
        >
          <IconToggleButton
            icon={<EyeOff className="h-5 w-5" />}
            label={dict?.generator?.blindModeTooltip || 'Hide Perk Icons (Blind Mode)'}
            isActive={blindMode}
            onClick={onToggleBlindMode}
            tone="purple"
          />
        </Tooltip>

        <Tooltip
          title={activeMutator ? activeMutator.name : (dict?.generator?.chaosMutatorTooltip || 'Chaos Mutator')}
          description={
            activeMutator
              ? activeMutator.description
              : dict?.generator?.chaosMutatorTooltipDesc || 'Spin for a random Trial curse or buff to twist this loadout.'
          }
        >
          <IconToggleButton
            icon={<span className="text-lg leading-none">{activeMutator ? activeMutator.icon : '🔮'}</span>}
            label={activeMutator ? activeMutator.name : (dict?.generator?.chaosMutatorTooltip || 'Chaos Mutator')}
            isActive={Boolean(activeMutator)}
            onClick={onOpenChaosModal}
            tone="fuchsia"
          />
        </Tooltip>

        <Tooltip
          title={dict?.generator?.soundTooltipTitle || 'Sound Effects'}
          description={
            audioEnabled
              ? dict?.generator?.soundTooltipDescOn || 'On -- reel ticks, thuds, and fanfare will play.'
              : dict?.generator?.soundTooltipDescOff || 'Muted -- every effect is silenced.'
          }
        >
          <IconToggleButton
            icon={audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            label={
              audioEnabled
                ? dict?.generator?.audioOnLabel || 'Sound On'
                : dict?.generator?.audioOffLabel || 'Sound Muted'
            }
            isActive={audioEnabled}
            onClick={onToggleAudio}
            tone="amber"
          />
        </Tooltip>

        <Tooltip
          title={dict?.generator?.resetAllTooltipTitle || 'Reset Everything'}
          align="end"
          description={dict?.generator?.resetAllTooltipDesc || 'Clears your wheels, loadout slots, and drawn-perk memory. Cannot be undone.'}
        >
          <IconToggleButton
            icon={<RotateCcw className="h-5 w-5" />}
            label={dict?.generator?.resetAllTooltip || 'Reset wheels, loadout slots, and memory'}
            onClick={onResetAll}
            tone="red"
          />
        </Tooltip>
    </>
  );
};
